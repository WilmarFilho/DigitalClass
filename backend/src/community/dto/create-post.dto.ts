import { IsString, IsIn, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaItemDto {
  @IsString()
  url: string;

  @IsIn(['image', 'video'])
  type: 'image' | 'video';
}

export class CreatePostDto {
  @IsIn(['text', 'photo', 'video', 'clip'])
  type: 'text' | 'photo' | 'video' | 'clip';

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];
}
