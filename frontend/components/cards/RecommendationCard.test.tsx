import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import RecommendationCard from '@/components/cards/RecommendationCard'
import { generateMockCard } from '@/utils/mockData'

describe('RecommendationCard Component', () => {
  const mockCard = generateMockCard()
  const mockProps = {
    card: mockCard,
    isActive: true,
    onLike: jest.fn(),
    onUnlike: jest.fn(),
    onSubscribe: jest.fn(),
    onShare: jest.fn(),
    onComment: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render card with creator information', () => {
    render(<RecommendationCard {...mockProps} />)

    expect(screen.getByText(mockCard.creator.name)).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(mockCard.creator.followerCount.toLocaleString()))
    ).toBeInTheDocument()
  })

  it('should render content title', () => {
    render(<RecommendationCard {...mockProps} />)
    expect(screen.getByText(mockCard.content.title)).toBeInTheDocument()
  })

  it('should show subscription price when available', () => {
    render(<RecommendationCard {...mockProps} />)

    if (mockCard.subscriptionPrice) {
      expect(screen.getByText(`¥${mockCard.subscriptionPrice}`)).toBeInTheDocument()
    }
  })

  it('should call onSubscribe when subscribe button is clicked', () => {
    const onSubscribe = jest.fn()
    render(<RecommendationCard {...mockProps} onSubscribe={onSubscribe} />)

    const subscribeButtons = screen.getAllByLabelText(/Subscribe/)
    fireEvent.click(subscribeButtons[0])

    expect(onSubscribe).toHaveBeenCalled()
  })

  it('should show verification badge for verified creators', () => {
    const verifiedCard = {
      ...mockCard,
      creator: { ...mockCard.creator, verificationStatus: 'VERIFIED' as const },
    }

    render(<RecommendationCard {...mockProps} card={verifiedCard} />)
    expect(screen.getByTitle('Verified creator')).toBeInTheDocument()
  })

  it('should show content type badge', () => {
    render(<RecommendationCard {...mockProps} />)
    expect(screen.getByText(mockCard.content.type.toUpperCase())).toBeInTheDocument()
  })

  it('should show video duration for video content', () => {
    const videoCard = {
      ...mockCard,
      content: { ...mockCard.content, type: 'video' as const, duration: 300 },
    }

    render(<RecommendationCard {...mockProps} card={videoCard} />)
    expect(screen.getByText(/5:00/)).toBeInTheDocument()
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<RecommendationCard {...mockProps} />)

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(mockCard.creator.name)
    )
  })

  it('should apply active styles when isActive is true', () => {
    const { container } = render(
      <RecommendationCard {...mockProps} isActive={true} />
    )

    const cardElement = container.querySelector('[role="article"]')
    expect(cardElement).toHaveClass('scale-100')
  })

  it('should apply inactive styles when isActive is false', () => {
    const { container } = render(
      <RecommendationCard {...mockProps} isActive={false} />
    )

    const cardElement = container.querySelector('[role="article"]')
    expect(cardElement).toHaveClass('scale-95')
  })

  it('should call onLike when like button is clicked', () => {
    const onLike = jest.fn()
    render(<RecommendationCard {...mockProps} onLike={onLike} />)

    const likeButton = screen.getByLabelText(/Like|Unlike/)
    fireEvent.click(likeButton)

    expect(onLike).toHaveBeenCalled()
  })

  it('should toggle like state correctly', () => {
    const { rerender } = render(<RecommendationCard {...mockProps} />)

    let likeButton = screen.getByLabelText('Like')
    expect(likeButton).toBeInTheDocument()

    fireEvent.click(likeButton)
    rerender(
      <RecommendationCard
        {...mockProps}
        card={{ ...mockCard, isLiked: true }}
      />
    )

    likeButton = screen.getByLabelText('Unlike')
    expect(likeButton).toBeInTheDocument()
  })

  it('should show category tag when available', () => {
    if (mockCard.content.category) {
      render(<RecommendationCard {...mockProps} />)
      expect(screen.getByText(`#${mockCard.content.category}`)).toBeInTheDocument()
    }
  })

  it('should display correct subscription status', () => {
    render(
      <RecommendationCard
        {...mockProps}
        card={{ ...mockCard, isSubscribed: false }}
      />
    )

    const subscribeButtons = screen.getAllByLabelText(/Subscribe/)
    expect(subscribeButtons[0]).toHaveTextContent('Subscribe')
  })
})
