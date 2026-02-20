import type { ApiClient } from './client';
import type {
  SwipeRequestDto,
  SwipeResponseDto,
  CardsResponseDto,
  MatchesResponseDto,
} from './types';

export class MatchingApi {
  constructor(private readonly client: ApiClient) {}

  getCards(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<CardsResponseDto>('/api/matching/cards', { params });
  }

  swipe(dto: SwipeRequestDto) {
    return this.client.post<SwipeResponseDto>('/api/matching/swipe', dto);
  }

  getMatches(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<MatchesResponseDto>('/api/matching/matches', { params });
  }

  /**
   * 取消配對
   */
  unmatch(matchId: string) {
    return this.client.delete<void>(`/api/matching/matches/${matchId}`);
  }
}
