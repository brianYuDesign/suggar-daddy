import { IsArray, IsUUID, ArrayMaxSize } from 'class-validator';

export class BatchBlogDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  ids: string[];
}
