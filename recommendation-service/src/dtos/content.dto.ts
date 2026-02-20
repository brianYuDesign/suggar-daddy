export class CreateContentDto {
  title: string;
  description?: string;
  creator_id: string;
  tags?: string[];
}

export class UpdateContentDto {
  title?: string;
  description?: string;
  is_featured?: boolean;
}

export class ContentResponseDto {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  view_count: number;
  like_count: number;
  share_count: number;
  engagement_score: number;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}
