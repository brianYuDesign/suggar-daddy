/**
 * Admin-related type definitions
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'ADMIN' | 'CREATOR' | 'SUBSCRIBER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  lastLogin?: string;
  totalContent?: number;
  earnings?: number;
}

export interface PendingContent {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  description: string;
  thumbnail: string;
  type: 'video' | 'image' | 'audio' | 'text';
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ReportedContent {
  id: string;
  contentId: string;
  contentTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalContent: number;
  todayRevenue: number;
  pendingReviews: number;
  userGrowth: string;
  contentGrowth: string;
  revenueGrowth: string;
}

export interface Activity {
  id: string;
  type: 'user_signup' | 'content_published' | 'payment_received' | 'content_reported' | 'user_suspended';
  description: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  refunds: number;
  netRevenue: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueChange: string;
}

export interface PlatformSettings {
  platformFee: number; // percentage
  minWithdrawal: number;
  maxUploadSize: number; // in MB
  allowedFileTypes: string[];
  autoApproveContent: boolean;
  maintenanceMode: boolean;
}

export interface RecommendationSettings {
  enabled: boolean;
  algorithm: 'popularity' | 'engagement' | 'hybrid' | 'ai';
  refreshInterval: number; // in hours
  maxRecommendations: number;
  personalizedWeight: number; // 0-1
}
