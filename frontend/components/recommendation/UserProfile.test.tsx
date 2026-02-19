import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import UserProfile from '@/components/recommendation/UserProfile'
import { generateCreator } from '@/utils/mockData'

describe('UserProfile Component', () => {
  const mockCreator = {
    id: 'creator-1',
    name: 'Test Creator',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'This is a test bio',
    followerCount: 50000,
    verificationStatus: 'VERIFIED' as const,
  }

  const mockProps = {
    creator: mockCreator,
    isSubscribed: false,
    contentCount: 25,
    totalEarnings: 15000,
  }

  it('should render creator information', () => {
    render(<UserProfile {...mockProps} />)

    expect(screen.getByText(mockCreator.name)).toBeInTheDocument()
    expect(screen.getByText(mockCreator.bio!)).toBeInTheDocument()
  })

  it('should display follower count', () => {
    render(<UserProfile {...mockProps} />)

    expect(screen.getByText('50K')).toBeInTheDocument()
    expect(screen.getByText('Followers')).toBeInTheDocument()
  })

  it('should display content count', () => {
    render(<UserProfile {...mockProps} contentCount={25} />)

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Posts')).toBeInTheDocument()
  })

  it('should display total earnings', () => {
    render(<UserProfile {...mockProps} totalEarnings={15000} />)

    expect(screen.getByText('15K')).toBeInTheDocument()
    expect(screen.getByText('Earnings')).toBeInTheDocument()
  })

  it('should show verification badge for verified creators', () => {
    render(<UserProfile {...mockProps} />)

    const verificationBadge = screen.getByTitle('VERIFIED creator')
    expect(verificationBadge).toBeInTheDocument()
  })

  it('should render subscribe button when not subscribed', () => {
    render(<UserProfile {...mockProps} isSubscribed={false} />)

    const subscribeButton = screen.getByLabelText(/Subscribe/)
    expect(subscribeButton).toHaveTextContent('Subscribe')
  })

  it('should render subscribed state', () => {
    render(<UserProfile {...mockProps} isSubscribed={true} />)

    const subscribeButton = screen.getByLabelText(/Unsubscribe/)
    expect(subscribeButton).toHaveTextContent('✓ Subscribed')
  })

  it('should call onSubscribe when subscribe button is clicked', () => {
    const onSubscribe = jest.fn()
    render(
      <UserProfile {...mockProps} isSubscribed={false} onSubscribe={onSubscribe} />
    )

    const subscribeButton = screen.getByLabelText(/Subscribe/)
    fireEvent.click(subscribeButton)

    expect(onSubscribe).toHaveBeenCalled()
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<UserProfile {...mockProps} />)

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(mockCreator.name)
    )
  })

  it('should display zero earnings correctly', () => {
    render(<UserProfile {...mockProps} totalEarnings={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should format large numbers correctly', () => {
    const largeEarningsCreator = {
      ...mockCreator,
      followerCount: 1500000,
    }

    render(
      <UserProfile
        {...mockProps}
        creator={largeEarningsCreator}
        totalEarnings={1250000}
      />
    )

    expect(screen.getByText('1.5M')).toBeInTheDocument()
    expect(screen.getByText('1.2M')).toBeInTheDocument()
  })

  it('should handle missing bio gracefully', () => {
    const creatorNoBio = { ...mockCreator, bio: undefined }
    const { container } = render(<UserProfile {...mockProps} creator={creatorNoBio} />)

    expect(container.textContent).not.toContain('undefined')
  })
})

// Helper function moved from mockData
function generateCreator() {
  return {
    id: 'creator-test',
    name: 'Test Creator',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    followerCount: 50000,
  }
}
