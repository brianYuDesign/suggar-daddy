import { IsString } from 'class-validator';

export class CreatePostCommentDto {
  @IsString()
  postId: string;

  @IsString()
  userId: string;

  @IsString()
  content: string;
}
