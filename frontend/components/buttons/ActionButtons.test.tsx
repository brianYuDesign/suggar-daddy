import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ActionButtons from '@/components/buttons/ActionButtons'

describe('ActionButtons Component', () => {
  const mockProps = {
    cardId: 'test-card-1',
    isLiked: false,
    isSubscribed: false,
    likesCount: 100,
    subscribersCount: 1000,
  }

  it('should render all action buttons', () => {
    render(<ActionButtons {...mockProps} />)

    expect(screen.getByLabelText('Like')).toBeInTheDocument()
    expect(screen.getByLabelText('Comment')).toBeInTheDocument()
    expect(screen.getByLabelText('Share')).toBeInTheDocument()
  })

  it('should show unsubscribe button when not subscribed', () => {
    render(<ActionButtons {...mockProps} isSubscribed={false} />)
    expect(screen.getByLabelText('Subscribe')).toBeInTheDocument()
  })

  it('should not show subscribe button when already subscribed', () => {
    render(<ActionButtons {...mockProps} isSubscribed={true} />)
    expect(screen.queryByLabelText('Subscribe')).not.toBeInTheDocument()
  })

  it('should call onLike when like button is clicked', () => {
    const onLike = jest.fn()
    render(<ActionButtons {...mockProps} onLike={onLike} />)

    const likeButton = screen.getByLabelText('Like')
    fireEvent.click(likeButton)

    expect(onLike).toHaveBeenCalled()
  })

  it('should call onComment when comment button is clicked', () => {
    const onComment = jest.fn()
    render(<ActionButtons {...mockProps} onComment={onComment} />)

    const commentButton = screen.getByLabelText('Comment')
    fireEvent.click(commentButton)

    expect(onComment).toHaveBeenCalled()
  })

  it('should call onShare when share button is clicked', () => {
    const onShare = jest.fn()
    render(<ActionButtons {...mockProps} onShare={onShare} />)

    const shareButton = screen.getByLabelText('Share')
    fireEvent.click(shareButton)

    expect(onShare).toHaveBeenCalled()
  })

  it('should call onSubscribe when subscribe button is clicked', () => {
    const onSubscribe = jest.fn()
    render(
      <ActionButtons {...mockProps} isSubscribed={false} onSubscribe={onSubscribe} />
    )

    const subscribeButton = screen.getByLabelText('Subscribe')
    fireEvent.click(subscribeButton)

    expect(onSubscribe).toHaveBeenCalled()
  })

  it('should display likes count', () => {
    const { container } = render(<ActionButtons {...mockProps} likesCount={250} />)
    expect(container.textContent).toContain('250')
  })

  it('should have correct aria labels for accessibility', () => {
    render(<ActionButtons {...mockProps} />)

    expect(screen.getByLabelText('Like')).toHaveAttribute('aria-label', 'Like')
    expect(screen.getByLabelText('Comment')).toHaveAttribute(
      'aria-label',
      'Comment'
    )
    expect(screen.getByLabelText('Share')).toHaveAttribute('aria-label', 'Share')
  })

  it('should apply active styles when liked', () => {
    const { container } = render(<ActionButtons {...mockProps} isLiked={true} />)
    const likeButton = screen.getByLabelText('Unlike')

    expect(likeButton).toHaveClass('text-primary')
  })
})
