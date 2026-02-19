import { RecommendationResult } from '../services/recommendation.service';

export class RecommendationQueryDto {
  user_id: string;
  limit?: number = 20;
}

export class RecommendationResponseDto implements RecommendationResult {
  content_id: string;
  title: string;
  tags: string[];
  score: number;
  reason: string;
}

export class RecommendationsListDto {
  user_id: string;
  count: number;
  recommendations: RecommendationResponseDto[];
  generated_at: Date;
  cache_hit: boolean;
}
