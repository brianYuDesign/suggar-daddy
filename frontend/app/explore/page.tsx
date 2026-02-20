'use client'

import React, { useState, useEffect, useCallback } from 'react'
import CardStack from '@/components/recommendation/CardStack'
import { RecommendationCard } from '@/types/recommendation'
import { generateMockCards } from '@/utils/mockData'

export default function ExplorePage() {
  const [cards, setCards] = useState<RecommendationCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set())
  const [subscribedCards, setSubscribedCards] = useState<Set<string>>(new Set())

  // Initial load
  useEffect(() => {
    const initializeCards = async () => {
      setIsLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))
        const mockCards = generateMockCards(10)
        setCards(mockCards)
      } catch (error) {
        console.error('Failed to load cards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeCards()
  }, [])

  const handleLoadMore = useCallback(async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newCards = generateMockCards(5)
      setCards((prev) => [...prev, ...newCards])
    } catch (error) {
      console.error('Failed to load more cards:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleLike = useCallback((cardId: string) => {
    setLikedCards((prev) => new Set([...prev, cardId]))
  }, [])

  const handleUnlike = useCallback((cardId: string) => {
    setLikedCards((prev) => {
      const newSet = new Set(prev)
      newSet.delete(cardId)
      return newSet
    })
  }, [])

  const handleSubscribe = useCallback((cardId: string) => {
    setSubscribedCards((prev) => new Set([...prev, cardId]))
    // TODO: Call API to subscribe
  }, [])

  const handleShare = useCallback((cardId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (card && navigator.share) {
      navigator.share({
        title: card.content.title,
        text: `Check out ${card.creator.name}'s content!`,
        url: window.location.href,
      })
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/creator/${card?.creator.id}`
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }, [cards])

  const handleComment = useCallback((cardId: string) => {
    // TODO: Open comment modal
    console.log('Open comment for card:', cardId)
  }, [])

  const handleCardChange = useCallback(
    (cardId: string, direction: 'up' | 'down') => {
      console.log(`Card changed to ${cardId} (direction: ${direction})`)
      // TODO: Track analytics
    },
    []
  )

  // Map cards with liked/subscribed state
  const cardsWithState = cards.map((card) => ({
    ...card,
    isLiked: likedCards.has(card.id),
    isSubscribed: subscribedCards.has(card.id),
  }))

  return (
    <main className="w-full h-screen bg-gradient-to-b from-light to-white overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/90 to-transparent py-4 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-dark">Explore</h1>
          <p className="text-sm text-gray-500">Discover amazing creators</p>
        </div>
      </header>

      {/* Card Stack */}
      <div className="w-full h-full pt-20">
        <CardStack
          cards={cardsWithState}
          onLike={handleLike}
          onUnlike={handleUnlike}
          onSubscribe={handleSubscribe}
          onShare={handleShare}
          onComment={handleComment}
          onCardChange={handleCardChange}
          isLoading={isLoading}
          hasMore={true}
          onLoadMore={handleLoadMore}
        />
      </div>

      {/* Keyboard Navigation Hint */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-400 pointer-events-none hidden md:block">
        <p>↑ Previous | ↓ Next</p>
      </div>
    </main>
  )
}
