import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CardStack from '@/components/recommendation/CardStack'
import { generateMockCards } from '@/utils/mockData'

describe('CardStack Component', () => {
  const mockCards = generateMockCards(5)
  const mockProps = {
    cards: mockCards,
    onLike: jest.fn(),
    onUnlike: jest.fn(),
    onSubscribe: jest.fn(),
    onShare: jest.fn(),
    onComment: jest.fn(),
    onCardChange: jest.fn(),
    isLoading: false,
    hasMore: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the first card', () => {
    render(<CardStack {...mockProps} />)
    expect(screen.getByText(/Card 1 of 5/i)).toBeInTheDocument()
  })

  it('should navigate to next card when next button is clicked', () => {
    render(<CardStack {...mockProps} />)

    const nextButton = screen.getByLabelText('Next card')
    fireEvent.click(nextButton)

    expect(screen.getByText(/Card 2 of 5/i)).toBeInTheDocument()
  })

  it('should navigate to previous card when previous button is clicked', () => {
    render(<CardStack {...mockProps} />)

    const nextButton = screen.getByLabelText('Next card')
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)

    const prevButton = screen.getByLabelText('Previous card')
    fireEvent.click(prevButton)

    expect(screen.getByText(/Card 2 of 5/i)).toBeInTheDocument()
  })

  it('should disable previous button on first card', () => {
    render(<CardStack {...mockProps} />)

    const prevButton = screen.getByLabelText('Previous card')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last card', () => {
    render(<CardStack {...mockProps} />)

    const nextButton = screen.getByLabelText('Next card')
    for (let i = 0; i < 4; i++) {
      fireEvent.click(nextButton)
    }

    expect(nextButton).toBeDisabled()
  })

  it('should navigate via pagination dots', () => {
    render(<CardStack {...mockProps} />)

    const dots = screen.getAllByLabelText(/Go to card/)
    fireEvent.click(dots[3])

    expect(screen.getByText(/Card 4 of 5/i)).toBeInTheDocument()
  })

  it('should call onLike when like button is clicked on card', () => {
    const onLike = jest.fn()
    render(<CardStack {...mockProps} onLike={onLike} />)

    const likeButton = screen.getByLabelText('Like')
    fireEvent.click(likeButton)

    expect(onLike).toHaveBeenCalledWith(mockCards[0].id)
  })

  it('should call onSubscribe when subscribe button is clicked', () => {
    const onSubscribe = jest.fn()
    render(<CardStack {...mockProps} onSubscribe={onSubscribe} />)

    const subscribeButton = screen.getByLabelText('Subscribe')
    fireEvent.click(subscribeButton)

    expect(onSubscribe).toHaveBeenCalledWith(mockCards[0].id)
  })

  it('should render empty state when no cards', () => {
    render(<CardStack {...mockProps} cards={[]} />)
    expect(
      screen.getByText(/No recommendations available|No more recommendations/i)
    ).toBeInTheDocument()
  })

  it('should call onCardChange when navigating cards', () => {
    const onCardChange = jest.fn()
    render(<CardStack {...mockProps} onCardChange={onCardChange} />)

    const nextButton = screen.getByLabelText('Next card')
    fireEvent.click(nextButton)

    expect(onCardChange).toHaveBeenCalledWith(mockCards[1].id, 'down')
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<CardStack {...mockProps} />)

    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Card stack')
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<CardStack {...mockProps} isLoading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
