/**
 * Shared types for the content moderation system.
 */

export type ModerationSeverity = 'low' | 'medium' | 'high';

export type ModerationCategory =
  | 'profanity'
  | 'spam'
  | 'scam'
  | 'sexual'
  | 'violence'
  | 'clean';

export type ReportReason =
  | 'spam'
  | 'nudity'
  | 'harassment'
  | 'violence'
  | 'scam'
  | 'underage'
  | 'impersonation'
  | 'copyright'
  | 'other';

export type AutoModerationStatus =
  | 'pending'
  | 'passed'
  | 'flagged'
  | 'auto_hidden';

export interface TextFilterResult {
  passed: boolean;
  flaggedWords: string[];
  severity: ModerationSeverity | null;
  category: ModerationCategory;
}

export interface NsfwResult {
  nsfwScore: number;
  category: 'safe' | 'suggestive' | 'nsfw';
  safe: boolean;
  processingTimeMs: number;
}

export interface ModerationResult {
  contentType: 'post' | 'comment' | 'story' | 'message' | 'bio';
  contentId: string;
  textResult?: TextFilterResult;
  imageResults?: NsfwResult[];
  overallSeverity: ModerationSeverity | null;
  action: 'pass' | 'flag' | 'auto_hide';
  processedAt: string;
}

export interface WordListEntry {
  pattern: string;
  severity: ModerationSeverity;
  category: ModerationCategory;
}

export interface ModerationModuleOptions {
  enabled?: boolean;
  nsfwAutoHideThreshold?: number;
  nsfwFlagThreshold?: number;
}
