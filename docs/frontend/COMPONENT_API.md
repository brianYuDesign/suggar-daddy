# Sugar Daddy Frontend - Component Documentation

## Overview

This document describes the React components available in the Sugar Daddy frontend application. All components are built with Next.js, React, TypeScript, and Tailwind CSS.

---

## Type Definitions

### `RecommendationCard` Interface

```typescript
interface RecommendationCard {
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
```

### `Creator` Interface

```typescript
interface Creator {
  id: string
  name: string
  avatar: string // Image URL
  bio?: string
  followerCount: number
  verificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'PREMIUM'
}
```

### `Content` Interface

```typescript
interface Content {
  id: string
  title: string
  description?: string
  thumbnail?: string // Image URL
  type: 'video' | 'image' | 'live'
  duration?: number // in seconds (for video)
  category?: string
}
```

---

## Components

### 1. RecommendationCard

A single recommendation card component displaying creator info and content preview.

**Location:** `components/cards/RecommendationCard.tsx`

**Props:**

```typescript
interface RecommendationCardProps {
  card: RecommendationCard
  isActive?: boolean
  onLike?: () => void
  onUnlike?: () => void
  onSubscribe?: () => void
  onShare?: () => void
  onComment?: () => void
}
```

**Features:**
- Display creator avatar, name, and follower count
- Show content thumbnail with type badge (VIDEO, IMAGE, LIVE)
- Display video duration for video content
- Verification badge for verified creators
- Subscription price and status
- Integrated action buttons

**Example Usage:**

```tsx
<RecommendationCard
  card={card}
  isActive={true}
  onLike={() => console.log('liked')}
  onSubscribe={() => console.log('subscribed')}
/>
```

---

### 2. CardStack

Container component for displaying a vertical stack of recommendation cards with navigation controls.

**Location:** `components/recommendation/CardStack.tsx`

**Props:**

```typescript
interface CardStackProps {
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
```

**Features:**
- Display one card at a time
- Navigate between cards with buttons or pagination dots
- Intersection Observer for infinite scroll
- Card position indicator
- Keyboard navigation support (Arrow Up/Down)
- Loading state
- Accessibility features (ARIA labels, keyboard navigation)

**Example Usage:**

```tsx
<CardStack
  cards={cards}
  onLike={(id) => handleLike(id)}
  onSubscribe={(id) => handleSubscribe(id)}
  hasMore={true}
  onLoadMore={() => loadMoreCards()}
/>
```

---

### 3. ActionButtons

Button group component with like, comment, share, and subscribe actions.

**Location:** `components/buttons/ActionButtons.tsx`

**Props:**

```typescript
interface ActionButtonsProps {
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
```

**Features:**
- Like/Unlike button with count
- Comment button
- Share button
- Subscribe button (conditionally shown)
- Hover animations and scale effects
- Mobile-optimized with emoji icons
- Accessibility labels

**Example Usage:**

```tsx
<ActionButtons
  cardId="card-123"
  isLiked={false}
  likesCount={150}
  onLike={() => console.log('liked')}
  onComment={() => openCommentModal()}
/>
```

---

### 4. UserProfile

Creator profile card component with statistics and subscription button.

**Location:** `components/recommendation/UserProfile.tsx`

**Props:**

```typescript
interface UserProfileProps {
  creator: Creator
  isSubscribed?: boolean
  onSubscribe?: () => void
  contentCount?: number
  totalEarnings?: number
}
```

**Features:**
- Display creator avatar with verification badge
- Show creator statistics (followers, posts, earnings)
- Subscription button with state
- Bio display
- Responsive grid layout

**Example Usage:**

```tsx
<UserProfile
  creator={creator}
  isSubscribed={false}
  contentCount={25}
  totalEarnings={15000}
  onSubscribe={() => handleSubscribe()}
/>
```

---

## Pages

### /explore

Main recommendation discovery page.

**Location:** `app/explore/page.tsx`

**Features:**
- Displays CardStack with mock data (initial implementation)
- Handles state management for likes and subscriptions
- Support for infinite scroll
- Keyboard navigation hints
- Responsive design (mobile-first)

**Usage Flow:**
1. Load initial set of cards
2. User scrolls/navigates through cards
3. User can like, comment, share, or subscribe
4. Load more cards as user reaches the end
5. Persist user preferences (likes, subscriptions)

---

## Utilities

### Mock Data Generation

**Location:** `utils/mockData.ts`

Functions for generating realistic mock data for development and testing.

```typescript
// Generate single card
export function generateMockCard(): RecommendationCard

// Generate multiple cards
export function generateMockCards(count: number): RecommendationCard[]

// Generate individual components
export function generateCreator(): Creator
export function generateContent(): Content
```

---

## Styling

### Design System

**Colors:**
- Primary: `#FF6B6B` (red)
- Secondary: `#FFE66D` (yellow)
- Dark: `#2D3436` (dark gray)
- Light: `#F5F6FA` (light gray)

**Typography:**
- Font: System stack (-apple-system, BlinkMacSystemFont, etc.)
- Sizes: 12px (xs) to 32px (2xl)

### Tailwind Classes

All components use Tailwind CSS for styling. Custom animations:
- `animate-slide-up`: Slide in from bottom with fade
- `animate-fade-in`: Simple fade in

---

## Testing

### Test Coverage

- **ActionButtons.test.tsx**: 100% coverage
- **CardStack.test.tsx**: ~95% coverage
- **RecommendationCard.test.tsx**: ~92% coverage
- **UserProfile.test.tsx**: ~90% coverage

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Example Test

```typescript
it('should navigate to next card when next button is clicked', () => {
  render(<CardStack {...mockProps} />)
  const nextButton = screen.getByLabelText('Next card')
  fireEvent.click(nextButton)
  expect(screen.getByText(/Card 2 of 5/i)).toBeInTheDocument()
})
```

---

## Accessibility Features

### ARIA Labels

All interactive elements have proper ARIA labels:
- Buttons: `aria-label="Like"`, `aria-label="Subscribe"`
- Regions: `role="region"`, `role="article"`, `role="group"`
- Progress: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Keyboard Navigation

- **Arrow Up/Down**: Navigate between cards
- **Tab**: Focus on interactive elements
- **Enter/Space**: Activate buttons

### Screen Reader Support

- Semantic HTML
- Descriptive labels for all elements
- Status updates via ARIA live regions
- Hidden decorative elements

---

## Performance Optimizations

### Image Optimization

- Next.js Image component for automatic optimization
- Responsive image sizes
- Lazy loading

### Infinite Scroll

- Intersection Observer API
- Prevents unnecessary re-renders
- Efficient DOM updates

### Code Splitting

- Dynamic imports via Next.js
- Page-level code splitting
- Component lazy loading

---

## Mobile Responsiveness

All components are designed mobile-first:

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Features:**
- Touch-friendly buttons (min 44x44px)
- Optimized layouts for small screens
- Hidden desktop-only content on mobile
- Swipe gesture support (future enhancement)

---

## Future Enhancements

### Planned Features

1. **Swipe Gestures**
   - Implement react-swipeable
   - Swipe up/down to navigate cards
   - Swipe left/right for quick actions

2. **Advanced Filtering**
   - Filter by category
   - Filter by price range
   - Search functionality

3. **User Preferences**
   - Save liked creators
   - Personalized recommendations
   - Content history

4. **Analytics**
   - Track card views
   - Track engagement metrics
   - User behavior analysis

5. **Real-time Updates**
   - Live notification badges
   - Real-time subscriber counts
   - Live stream indicators

---

## API Integration

### Current State

Components currently use mock data. API integration points:

```typescript
// Example: LoadMore handler
const handleLoadMore = async () => {
  const response = await fetch('/api/recommendations?page=2')
  const newCards = await response.json()
  setCards([...cards, ...newCards])
}

// Example: Like action
const handleLike = async (cardId: string) => {
  await fetch(`/api/likes/${cardId}`, { method: 'POST' })
  setLikedCards([...likedCards, cardId])
}
```

### Backend API Endpoints (Expected)

```
POST   /api/recommendations       - Get recommendation cards
POST   /api/likes/:cardId         - Like a card
DELETE /api/likes/:cardId         - Unlike a card
POST   /api/subscriptions         - Subscribe to creator
DELETE /api/subscriptions/:id     - Unsubscribe
POST   /api/comments              - Post comment
GET    /api/creator/:id           - Get creator profile
```

---

## Development Guidelines

### Code Style

- TypeScript for type safety
- React Hooks for state management
- Functional components (no class components)
- Props validation with TypeScript interfaces

### Component Structure

```
ComponentName/
├── ComponentName.tsx      # Main component
├── ComponentName.test.tsx # Unit tests
└── types.ts               # Type definitions (if needed)
```

### Naming Conventions

- Components: PascalCase (`RecommendationCard`)
- Functions/Hooks: camelCase (`handleLike`, `useFetch`)
- Constants: UPPER_SNAKE_CASE (`CARD_HEIGHT`)
- Files: Match component name

---

## Troubleshooting

### Common Issues

1. **Images not loading**
   - Check image URLs are HTTPS
   - Verify Next.js image domains in `next.config.ts`

2. **Styles not applying**
   - Ensure Tailwind config includes component paths
   - Check class names match Tailwind syntax

3. **Tests failing**
   - Clear Jest cache: `npm test -- --clearCache`
   - Check mock data imports
   - Verify DOM elements exist before assertions

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Testing Library](https://testing-library.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

**Last Updated:** 2026-02-19  
**Version:** 0.1.0  
**Status:** Beta
