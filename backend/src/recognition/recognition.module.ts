import { Module } from '@nestjs/common';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';
import {
  FetchRecognitionHttpClient,
  RECOGNITION_HTTP_CLIENT,
} from './recognition-http.client';

@Module({
  controllers: [RecognitionController],
  providers: [
    RecognitionService,
    FetchRecognitionHttpClient,
    { provide: RECOGNITION_HTTP_CLIENT, useExisting: FetchRecognitionHttpClient },
  ],
})
export class RecognitionModule {}
