import { InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecognitionService } from '../src/recognition/recognition.service';
import {
  FetchRecognitionHttpClient,
  RecognitionHttpClient,
} from '../src/recognition/recognition-http.client';

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('RecognitionService upstream handling', () => {
  let loggerErrorSpy: jest.SpyInstance;
  const prisma = {
    plantSpecies: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    recognition: {
      create: jest.fn(),
    },
  } as any;
  const config = {
    get: jest.fn((key: string) => ({
      BAIDU_AI_API_KEY: 'api-key',
      BAIDU_AI_SECRET_KEY: 'secret-key',
    })[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    prisma.plantSpecies.findFirst.mockResolvedValue({
      id: 7,
      name: '绿萝',
      scientificName: 'Epipremnum aureum',
      family: 'Araceae',
      genus: 'Epipremnum',
      watering: 'Average',
      sunlight: 'Partial shade',
      description: '测试植物',
      imageUrl: 'https://example.com/pothos.jpg',
      careGuide: null,
    });
    prisma.recognition.create.mockImplementation(async ({ data, include }: any) => ({
      id: 11,
      ...data,
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      species: include ? await prisma.plantSpecies.findFirst() : null,
    }));
  });

  afterEach(() => loggerErrorSpy.mockRestore());

  it('maps a successful Baidu response and persists the recognition', async () => {
    const httpClient: RecognitionHttpClient = {
      request: jest.fn()
        .mockResolvedValueOnce(response({ access_token: 'token' }))
        .mockResolvedValueOnce(response({
          result: [{
            name: '绿萝',
            score: 0.987,
            baike_info: { image_url: 'https://example.com/baike.jpg', description: '百科描述' },
          }],
        })),
    };
    const service = new RecognitionService(prisma, config, httpClient);

    const result = await service.identify(3, 'base64-image');

    expect(result.recognition).toMatchObject({ id: '11', rawName: '绿萝', confidence: 99 });
    expect(result.species).toMatchObject({ id: '7', name: '绿萝' });
    expect(result.baikeInfo).toMatchObject({ imageUrl: 'https://example.com/baike.jpg' });
    expect(prisma.recognition.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 3, rawName: '绿萝', confidence: 99 }),
    }));
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });

  it('maps a Baidu upstream error to a stable internal error', async () => {
    const httpClient: RecognitionHttpClient = {
      request: jest.fn()
        .mockResolvedValueOnce(response({ access_token: 'token' }))
        .mockResolvedValueOnce(response({ error_code: 216101, error_msg: 'param image not exist' })),
    };
    const service = new RecognitionService(prisma, config, httpClient);

    await expect(service.identify(3, 'invalid-image')).rejects.toMatchObject({
      response: { message: '百度识花失败: param image not exist' },
      status: 500,
    });
    expect(prisma.recognition.create).not.toHaveBeenCalled();
  });

  it('returns a client error when Baidu has no recognition result', async () => {
    const httpClient: RecognitionHttpClient = {
      request: jest.fn()
        .mockResolvedValueOnce(response({ access_token: 'token' }))
        .mockResolvedValueOnce(response({ result: [] })),
    };
    const service = new RecognitionService(prisma, config, httpClient);

    await expect(service.identify(3, 'unclear-image')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.recognition.create).not.toHaveBeenCalled();
  });

  it('maps network and timeout failures to a stable internal error', async () => {
    const httpClient: RecognitionHttpClient = {
      request: jest.fn().mockRejectedValue(new InternalServerErrorException('识别服务请求超时，请稍后重试')),
    };
    const service = new RecognitionService(prisma, config, httpClient);

    await expect(service.identify(3, 'image')).rejects.toMatchObject({
      response: { message: '识别服务请求超时，请稍后重试' },
      status: 500,
    });
  });
});

describe('FetchRecognitionHttpClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aborts a request after the timeout and maps it to a 500 error', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    );
    const client = new FetchRecognitionHttpClient();

    const promise = client.request('https://example.com/slow');
    jest.advanceTimersByTime(10_000);
    await expect(promise).rejects.toMatchObject({
      response: { message: '识别服务请求超时，请稍后重试' },
      status: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
