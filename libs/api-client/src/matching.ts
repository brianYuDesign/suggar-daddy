import type { ApiClient } from './client';
import type {
  SwipeRequestDto,
  SwipeResponseDto,
  CardsResponseDto,
  MatchesResponseDto,
} from '@suggar-daddy/dto';

export class MatchingApi {
  constructor(private readonly client: ApiClient) {}

  getCards(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<CardsResponseDto>('/api/v1/matching/cards', { params });
  }

  swipe(dto: SwipeRequestDto) {
    return this.client.post<SwipeResponseDto>('/api/v1/matching/swipe', dto);
  }

  getMatches(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<MatchesResponseDto>('/api/v1/matching/matches', { params });
  }
}
