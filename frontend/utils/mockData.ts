import { RecommendationCard, Creator, Content } from '@/types/recommendation'

const creatorNames = [
  'Alice Chen',
  'Bob Johnson',
  'Carol Williams',
  'David Brown',
  'Emma Davis',
  'Frank Miller',
  'Grace Lee',
  'Henry Wilson',
  'Iris Garcia',
  'Jack Martinez',
]

const contentTitles = [
  'Morning Meditation Guide',
  'Cooking Italian Pasta',
  'Digital Art Tutorial',
  'Fitness Workout',
  'Music Production',
  'Travel Vlog',
  'Product Review',
  'Fashion Styling Tips',
  'Photography Basics',
  'Game Streaming',
]

const categories = [
  'lifestyle',
  'cooking',
  'art',
  'fitness',
  'music',
  'travel',
  'tech',
  'fashion',
  'photography',
  'gaming',
]

const contentTypes: Array<'video' | 'image' | 'live'> = ['video', 'image', 'live']

const avatarPlaceholders = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=10',
]

const thumbnailPlaceholders = [
  'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1479749971702-1461b8f6a4d7?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1463225291904-658ba7c44d8a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop',
]

export function generateCreator(): Creator {
  const name = creatorNames[Math.floor(Math.random() * creatorNames.length)]
  const avatarIndex = Math.floor(Math.random() * avatarPlaceholders.length)

  return {
    id: `creator-${Math.random().toString(36).substring(7)}`,
    name,
    avatar: avatarPlaceholders[avatarIndex],
    bio: `Professional ${categories[Math.floor(Math.random() * categories.length)]} creator`,
    followerCount: Math.floor(Math.random() * 500000) + 1000,
    verificationStatus: Math.random() > 0.7 ? 'VERIFIED' : undefined,
  }
}

export function generateContent(): Content {
  const type = contentTypes[Math.floor(Math.random() * contentTypes.length)]

  return {
    id: `content-${Math.random().toString(36).substring(7)}`,
    title:
      contentTitles[Math.floor(Math.random() * contentTitles.length)] +
      ` #${Math.floor(Math.random() * 100)}`,
    description:
      'Watch this amazing content from our talented creator. You will love it!',
    thumbnail: thumbnailPlaceholders[
      Math.floor(Math.random() * thumbnailPlaceholders.length)
    ],
    type,
    duration: type === 'video' ? Math.floor(Math.random() * 3600) + 60 : undefined,
    category: categories[Math.floor(Math.random() * categories.length)],
  }
}

export function generateMockCard(): RecommendationCard {
  const subscriptionLevel = Math.floor(Math.random() * 3)

  return {
    id: `card-${Math.random().toString(36).substring(7)}`,
    creator: generateCreator(),
    content: generateContent(),
    subscriptionLevel,
    subscriptionPrice:
      subscriptionLevel === 0
        ? undefined
        : subscriptionLevel === 1
          ? 99
          : 199,
    views: Math.floor(Math.random() * 100000) + 100,
    likes: Math.floor(Math.random() * 50000) + 10,
    isLiked: false,
    isSubscribed: false,
  }
}

export function generateMockCards(count: number): RecommendationCard[] {
  return Array.from({ length: count }, () => generateMockCard())
}
