import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private s3Client: S3Client;
  private mediaConvertClient: MediaConvertClient;
  private inputBucket: string;
  private outputBucket: string;
  private roleArn: string;
  private cloudFrontDomain: string;

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
      this.mediaConvertClient = new MediaConvertClient({
        region,
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
  }

  async uploadToS3(bucketType: 'input' | 'output', key: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const bucket = bucketType === 'input' ? this.inputBucket : this.outputBucket;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    }));

    return `https://${this.cloudFrontDomain}/${key}`;
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
                      MaxBitrate: 3000000,
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
      await this.mediaConvertClient.send(new CreateJobCommand(params as any));
    } catch (e: any) {
      this.logger.error(`MediaConvert Job Failed: ${e.message}`);
      throw e;
    }
  }

  getCloudFrontUrl(key: string): string {
    return `https://${this.cloudFrontDomain}/${key}`;
  }
}
