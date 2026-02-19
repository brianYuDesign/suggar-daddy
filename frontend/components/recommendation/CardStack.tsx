'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import RecommendationCard from '@/components/cards/RecommendationCard'
import { CardStackProps } from '@/types/recommendation'

export default function CardStack({
  cards,
  onLike,
  onUnlike,
  onSubscribe,
  onShare,
  onComment,
  onCardChange,
  isLoading = false,
  hasMore = false,
  onLoadMore,
}: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore?.()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onCardChange?.(cards[newIndex].id, 'down')
    }
  }, [currentIndex, cards, onCardChange])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      onCardChange?.(cards[newIndex].id, 'up')
    }
  }, [currentIndex, cards, onCardChange])

  const currentCard = cards[currentIndex]

  if (!currentCard) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        role="status"
        aria-label="No cards available"
      >
        <p className="text-gray-500">No recommendations available</p>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full flex flex-col"
      role="region"
      aria-label="Card stack - swipe up to see next content"
    >
      {/* Main Card Container */}
      <div className="flex-1 relative overflow-hidden p-4 sm:p-6">
        <div className="h-full rounded-lg overflow-hidden">
          <RecommendationCard
            card={currentCard}
            isActive={true}
            onLike={() => onLike?.(currentCard.id)}
            onUnlike={() => onUnlike?.(currentCard.id)}
            onSubscribe={() => onSubscribe?.(currentCard.id)}
            onShare={() => onShare?.(currentCard.id)}
            onComment={() => onComment?.(currentCard.id)}
          />
        </div>

        {/* Card Position Indicator */}
        <div
          className="absolute top-4 right-4 px-3 py-1 bg-black/50 text-white text-xs rounded-full"
          aria-label={`Card ${currentIndex + 1} of ${cards.length}`}
        >
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 pb-6 px-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="
            p-3 rounded-full transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-white shadow-md hover:shadow-lg hover:scale-110 active:scale-95
          "
          aria-label="Previous card"
          title="Previous (Keyboard: Arrow Up)"
        >
          <span className="text-2xl">⬆️</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            {isLoading ? 'Loading...' : `${currentIndex + 1} of ${cards.length}`}
          </p>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="
            p-3 rounded-full transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-white shadow-md hover:shadow-lg hover:scale-110 active:scale-95
          "
          aria-label="Next card"
          title="Next (Keyboard: Arrow Down)"
        >
          <span className="text-2xl">⬇️</span>
        </button>
      </div>

      {/* Pagination Dots */}
      <div
        className="flex items-center justify-center gap-1.5 pb-4 overflow-x-auto"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={cards.length}
      >
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              onCardChange?.(cards[index].id, index > currentIndex ? 'down' : 'up')
            }}
            className={`
              h-1.5 rounded-full transition-all duration-300
              ${
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }
            `}
            aria-label={`Go to card ${index + 1}`}
            aria-current={index === currentIndex ? 'step' : undefined}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={observerTarget} className="h-1" aria-hidden="true" />

      {/* Empty State */}
      {cards.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/80"
          role="status"
        >
          <p className="text-gray-500">
            {isLoading ? 'Loading recommendations...' : 'No more recommendations'}
          </p>
        </div>
      )}
    </div>
  )
}
