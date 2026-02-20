/**
 * Creator-related type definitions
 */

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  verified: boolean;
  followers: number;
  totalViews: number;
  totalEarnings: number;
  subscriptionPrice?: number;
  joinDate: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

export interface Content {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  thumbnail: string;
  type: 'video' | 'image' | 'audio' | 'text';
  duration?: number; // in seconds
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  price?: number; // subscription required price
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  size: number;
  uploadedSize: number;
  error?: string;
}

export interface CreatorSettings {
  id: string;
  creatorId: string;
  subscriptionPrice: number;
  subscriptionDescription: string;
  emailNotifications: boolean;
  publicProfile: boolean;
  allowComments: boolean;
  autoPublish: boolean;
  bankAccount?: {
    accountHolder: string;
    accountNumber: string;
    bankName: string;
  };
}

export interface Analytics {
  period: 'day' | 'week' | 'month' | 'year';
  totalViews: number;
  totalEarnings: number;
  newSubscribers: number;
  averageEngagement: number; // percentage
  topContent: Content[];
  viewsOverTime: { date: string; views: number }[];
  earningsOverTime: { date: string; earnings: number }[];
}

export interface ContentStats {
  contentId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number; // percentage
  revenue: number;
}
