import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';

type IvsChannelResponse = {
  channel?: {
    arn?: string;
    ingestEndpoint?: string;
    playbackUrl?: string;
  };
  streamKey?: {
    arn?: string;
    value?: string;
  };
};

type IvsGetStreamKeyResponse = {
  streamKey?: {
    arn?: string;
    value?: string;
  };
};

type IvsGetStreamResponse = {
  stream?: {
    state?: string;
    health?: string;
    startTime?: string;
    playbackUrl?: string;
  };
};

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private s3Client: S3Client;
  private mediaConvertClient: MediaConvertClient;
  private inputBucket: string;
  private outputBucket: string;
  private roleArn: string;
  private cloudFrontDomain: string;
  private ivsRegion: string;
  private ivsEndpoint: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    const endpoint = this.configService.get<string>('AWS_MEDIACONVERT_ENDPOINT') || '';
    if (endpoint) {
      // O MediaConvert (endpoint específico) pode rodar numa região diferente da do S3
      const mcRegionMatch = endpoint.match(/mediaconvert\.([a-z0-9-]+)\.amazonaws/);
      const mcRegion = mcRegionMatch ? mcRegionMatch[1] : region;

      this.mediaConvertClient = new MediaConvertClient({
        region: mcRegion,
        endpoint,
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
        },
      });
    }

    this.inputBucket = this.configService.get<string>('AWS_S3_INPUT_BUCKET') || '';
    this.outputBucket = this.configService.get<string>('AWS_S3_OUTPUT_BUCKET') || '';
    this.roleArn = this.configService.get<string>('AWS_MEDIACONVERT_ROLE_ARN') || '';
    this.cloudFrontDomain = this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') || '';
    this.ivsRegion = this.configService.get<string>('AWS_IVS_REGION') || region;
    this.ivsEndpoint =
      this.configService.get<string>('AWS_IVS_ENDPOINT') ||
      `https://ivs.${this.ivsRegion}.amazonaws.com`;
  }

  async uploadToS3(bucketType: 'input' | 'output', key: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const bucket = bucketType === 'input' ? this.inputBucket : this.outputBucket;

    this.logger.log(`Iniciando S3 PutObject para o bucket [${bucket}] com chave [${key}]. Tamanho do arquivo: ${fileBuffer.length} bytes...`);
    const start = Date.now();

    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      }));
      this.logger.log(`Upload S3 concluído em ${Date.now() - start}ms.`);
    } catch (e: any) {
      this.logger.error(`Falha no upload para o S3: ${e.message}`, e.stack);
      throw e;
    }

    return `https://${this.cloudFrontDomain}/${key}`;
  }

  async deleteS3Object(bucketType: 'input' | 'output', key: string): Promise<void> {
    const bucket = bucketType === 'input' ? this.inputBucket : this.outputBucket;
    this.logger.log(`Iniciando deleção do S3 para o bucket [${bucket}] com chave [${key}]...`);

    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      this.logger.log(`Objeto deletado com sucesso no S3 (Bucket: ${bucket}, Key: ${key}).`);
    } catch (e: any) {
      this.logger.error(`Falha ao deletar arquivo no S3 (${key}): ${e.message}`, e.stack);
    }
  }

  async deleteS3Folder(bucketType: 'input' | 'output', prefix: string): Promise<void> {
    const bucket = bucketType === 'input' ? this.inputBucket : this.outputBucket;
    this.logger.log(`Iniciando deleção do S3 para a pasta no bucket [${bucket}] com prefixo [${prefix}]...`);

    try {
      let continuationToken: string | undefined = undefined;
      do {
        const response: any = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (response.Contents && response.Contents.length > 0) {
          const objectsToDelete = response.Contents.map((obj: any) => ({ Key: obj.Key }));
          await this.s3Client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objectsToDelete },
          }));
          this.logger.log(`Deletados ${objectsToDelete.length} objetos com prefixo [${prefix}].`);
        }
        
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      this.logger.log(`Limpeza concluída para o prefixo [${prefix}].`);
    } catch (e: any) {
      this.logger.error(`Falha ao deletar pasta no S3 (${prefix}): ${e.message}`, e.stack);
    }
  }

  async startMediaConvertJob(inputKey: string, outputKeyPrefix: string): Promise<void> {
    if (!this.mediaConvertClient) {
      this.logger.warn('MediaConvertClient not initialized, skipping job creation.');
      return;
    }

    const inputUrl = `s3://${this.inputBucket}/${inputKey}`;
    const outputUrl = `s3://${this.outputBucket}/${outputKeyPrefix}`;

    const params = {
      Role: this.roleArn,
      Settings: {
        Inputs: [
          {
            AudioSelectors: {
              "Audio Selector 1": {
                DefaultSelection: "DEFAULT",
              }
            },
            FileInput: inputUrl,
            TimecodeSource: "ZEROBASED",
            VideoSelector: {}
          }
        ],
        OutputGroups: [
          {
            Name: "Apple HLS",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS",
              HlsGroupSettings: {
                Destination: outputUrl,
                MinSegmentLength: 0,
                SegmentLength: 10,
              }
            },
            Outputs: [
              {
                NameModifier: "_720p",
                ContainerSettings: {
                  Container: "M3U8",
                  M3u8Settings: {}
                },
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      Bitrate: 3000000,
                      CodecProfile: "MAIN",
                      RateControlMode: "CBR",
                    }
                  },
                  Width: 1280,
                  Height: 720
                },
                AudioDescriptions: [
                  {
                    AudioSourceName: "Audio Selector 1",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    try {
      this.logger.log(`Enviando CreateJobCommand para MediaConvert (Input: ${inputUrl}, Output: ${outputUrl})...`);
      const start = Date.now();
      await this.mediaConvertClient.send(new CreateJobCommand(params as any));
      this.logger.log(`MediaConvert Job criado com sucesso em ${Date.now() - start}ms.`);
    } catch (e: any) {
      this.logger.error(`MediaConvert Job Failed: ${e.message}`, e.stack);
      throw e;
    }
  }

  getCloudFrontUrl(key: string): string {
    return `https://${this.cloudFrontDomain}/${key}`;
  }

  async createLiveChannel(name: string): Promise<{
    channelArn: string;
    ingestEndpoint: string;
    playbackUrl: string;
    streamKeyArn: string;
    streamKeyValue: string;
  }> {
    const body: Record<string, unknown> = {
      name,
      latencyMode: this.configService.get<string>('AWS_IVS_LATENCY_MODE') || 'LOW',
      type: this.configService.get<string>('AWS_IVS_CHANNEL_TYPE') || 'STANDARD',
    };

    const recordingConfigurationArn = this.configService.get<string>('AWS_IVS_RECORDING_CONFIGURATION_ARN');
    if (recordingConfigurationArn) {
      body.recordingConfigurationArn = recordingConfigurationArn;
    } else {
      this.logger.warn('AWS_IVS_RECORDING_CONFIGURATION_ARN não configurado. A live será criada sem replay automático, apesar da gravação estar marcada como padrão no sistema.');
    }

    const response = await this.ivsRequest<IvsChannelResponse>('CreateChannel', body);
    const channelArn = response.channel?.arn || '';
    const ingestEndpoint = response.channel?.ingestEndpoint || '';
    const playbackUrl = response.channel?.playbackUrl || '';
    const streamKeyArn = response.streamKey?.arn || '';
    const streamKeyValue = response.streamKey?.value || '';

    if (!channelArn || !ingestEndpoint || !playbackUrl || !streamKeyArn || !streamKeyValue) {
      throw new Error('AWS IVS retornou uma resposta incompleta ao criar o canal.');
    }

    return {
      channelArn,
      ingestEndpoint,
      playbackUrl,
      streamKeyArn,
      streamKeyValue,
    };
  }

  async getLiveStreamKey(streamKeyArn: string): Promise<{ arn: string; value: string }> {
    const response = await this.ivsRequest<IvsGetStreamKeyResponse>('GetStreamKey', {
      arn: streamKeyArn,
    });

    const arn = response.streamKey?.arn || streamKeyArn;
    const value = response.streamKey?.value || '';

    if (!value) {
      throw new Error('Nao foi possivel recuperar a stream key da live.');
    }

    return { arn, value };
  }

  async getLiveStream(channelArn: string): Promise<{
    isLive: boolean;
    health: string | null;
    playbackUrl: string | null;
    startedAt: string | null;
  }> {
    try {
      const response = await this.ivsRequest<IvsGetStreamResponse>('GetStream', {
        channelArn,
      });

      return {
        isLive: response.stream?.state === 'LIVE',
        health: response.stream?.health || null,
        playbackUrl: response.stream?.playbackUrl || null,
        startedAt: response.stream?.startTime || null,
      };
    } catch (error: any) {
      if (
        error?.message?.includes('ChannelNotBroadcasting') ||
        error?.message?.includes('ResourceNotFound') ||
        error?.message?.includes('not currently online')
      ) {
        return {
          isLive: false,
          health: null,
          playbackUrl: null,
          startedAt: null,
        };
      }

      throw error;
    }
  }

  async stopLiveStream(channelArn: string): Promise<void> {
    await this.ivsRequest('StopStream', { channelArn });
  }

  private async ivsRequest<T = any>(action: string, body: Record<string, unknown>): Promise<T> {
    const endpoint = new URL(this.ivsEndpoint);
    const hostname = endpoint.hostname;
    const bodyString = JSON.stringify(body);

    const request = new HttpRequest({
      protocol: endpoint.protocol,
      hostname,
      method: 'POST',
      path: `/${action}`,
      headers: {
        host: hostname,
        'content-type': 'application/json',
      },
      body: bodyString,
    });

    const signer = new SignatureV4({
      service: 'ivs',
      region: this.ivsRegion,
      sha256: Sha256,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    const signedRequest = await signer.sign(request);
    const response = await fetch(`${this.ivsEndpoint}/${action}`, {
      method: 'POST',
      headers: signedRequest.headers as Record<string, string>,
      body: bodyString,
    });

    const responseText = await response.text();
    const parsed = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      const message =
        parsed?.message ||
        parsed?.Message ||
        parsed?.exceptionMessage ||
        parsed?.Error ||
        `AWS IVS ${action} falhou com status ${response.status}.`;
      throw new Error(message);
    }

    return parsed as T;
  }
}
