export class RecordInteractionDto {
  user_id: string;
  content_id: string;
  interaction_type: 'view' | 'like' | 'share' | 'comment' | 'skip';
}

export class InteractionStatsDto {
  content_id: string;
  view_count: number;
  like_count: number;
  share_count: number;
  engagement_score: number;
}
