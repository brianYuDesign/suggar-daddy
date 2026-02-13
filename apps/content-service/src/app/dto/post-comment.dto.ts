import { IsString, IsOptional } from 'class-validator';

export class CreatePostCommentDto {
  @IsString()
  postId: string;

  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
