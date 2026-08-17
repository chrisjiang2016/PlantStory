import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface RecognitionHttpClient {
  request(url: string, init?: RequestInit): Promise<Response>;
}

export const RECOGNITION_HTTP_CLIENT = Symbol('RECOGNITION_HTTP_CLIENT');

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class FetchRecognitionHttpClient implements RecognitionHttpClient {
  async request(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new InternalServerErrorException('识别服务请求超时，请稍后重试');
      }
      throw new InternalServerErrorException('识别服务网络异常，请稍后重试');
    } finally {
      clearTimeout(timeout);
    }
  }
}
