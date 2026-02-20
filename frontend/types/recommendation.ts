/**
 * Type definitions for recommendation cards and related components
 */

export interface Creator {
  id: string
  name: string
  avatar: string
  bio?: string
  followerCount: number
  verificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'PREMIUM'
}

export interface Content {
  id: string
  title: string
  description?: string
  thumbnail?: string
  type: 'video' | 'image' | 'live'
  duration?: number // in seconds
  category?: string
}

export interface RecommendationCard {
  id: string
  creator: Creator
  content: Content
  subscriptionLevel: number // 0 = free, 1 = ¥99, 2 = ¥199
  subscriptionPrice?: number
  views?: number
  likes?: number
  isLiked?: boolean
  isSubscribed?: boolean
}

export interface CardStackProps {
  cards: RecommendationCard[]
  onLike?: (cardId: string) => void
  onUnlike?: (cardId: string) => void
  onSubscribe?: (cardId: string) => void
  onShare?: (cardId: string) => void
  onComment?: (cardId: string) => void
  onCardChange?: (cardId: string, direction: 'up' | 'down') => void
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface ActionButtonsProps {
  cardId: string
  isLiked?: boolean
  isSubscribed?: boolean
  onLike?: () => void
  onSubscribe?: () => void
  onShare?: () => void
  onComment?: () => void
  likesCount?: number
  subscribersCount?: number
}
