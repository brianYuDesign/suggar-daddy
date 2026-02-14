'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../providers/auth-provider';
import { contentApi, paymentsApi, usersApi, ApiError } from '../../../../lib/api';
import { timeAgo } from '../../../../lib/utils';
import type { Comment } from '@suggar-daddy/api-client';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  cn,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  Heart,
  Trash2,
  Lock,
  Calendar,
  DollarSign,
  Flag,
  MessageCircle,
  Send,
  Loader2,
} from 'lucide-react';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── Skeleton ─── */

function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.postId as string;

  // Post state
  const [post, setPost] = useState<Post | null>(null);
  const [authorName, setAuthorName] = useState<string>('');
  const [authorAvatar, setAuthorAvatar] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Tip state
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [isTipping, setIsTipping] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsNextCursor, setCommentsNextCursor] = useState<string | undefined>();
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Fetch post ─── */

  const fetchPost = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await contentApi.getPost(postId);
      setPost(data);

      // Resolve author name
      try {
        const profile = await usersApi.getProfile(data.authorId);
        setAuthorName(profile.displayName || data.authorId.slice(0, 8));
        setAuthorAvatar(profile.avatarUrl);
      } catch {
        setAuthorName(data.authorId.slice(0, 8));
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : '無法載入此貼文，請稍後再試';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  /* ─── Fetch comments ─── */

  const fetchComments = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) {
          setLoadingMoreComments(true);
        } else {
          setCommentsLoading(true);
        }
        const result = await contentApi.getComments(postId, cursor);
        setComments((prev) =>
          cursor ? [...prev, ...result.data] : result.data
        );
        setCommentsNextCursor(result.nextCursor);
        setCommentsHasMore(result.hasMore);
      } catch {
        // Silently fail for comments
      } finally {
        setCommentsLoading(false);
        setLoadingMoreComments(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, fetchPost, fetchComments]);

  /* ─── Like toggle ─── */

  const handleLikeToggle = async () => {
    if (!post) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    try {
      if (wasLiked) {
        await contentApi.unlikePost(post.id);
      } else {
        await contentApi.likePost(post.id);
      }
    } catch {
      setIsLiked(wasLiked);
    }
  };

  /* ─── Delete post ─── */

  const handleDelete = async () => {
    if (!post) return;
    try {
      setIsDeleting(true);
      await contentApi.deletePost(post.id);
      router.push('/feed');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : '刪除失敗，請稍後再試';
      setError(message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ─── Add comment ─── */

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const comment = await contentApi.addComment(postId, text);
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      setError(ApiError.getMessage(err, '留言失敗，請稍後再試'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  /* ─── Delete comment ─── */

  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      await contentApi.deleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (err) {
      setError(ApiError.getMessage(err, '刪除留言失敗'));
    } finally {
      setDeletingCommentId(null);
    }
  };

  const isOwner = user?.id === post?.authorId;
  const isLocked = post?.isPremium && !isOwner;
  const displayInitials = (authorName || '??').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">貼文詳情</h1>
      </div>

      {/* Loading */}
      {isLoading && <PostDetailSkeleton />}

      {/* Error */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setError(null);
                fetchPost();
              }}
            >
              重新載入
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Post content */}
      {post && !isLoading && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Author info */}
              <div className="flex items-center gap-3">
                <Link href={`/user/${post.authorId}`}>
                  <Avatar
                    src={authorAvatar}
                    fallback={displayInitials}
                    size="lg"
                    className="cursor-pointer"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/user/${post.authorId}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {authorName || post.authorId.slice(0, 8)}
                    </Link>
                    {post.isPremium && (
                      <Badge
                        variant="warning"
                        className="bg-brand-100 text-brand-700 border-brand-200"
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        付費
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>

                {/* Delete button - only for owner */}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="刪除貼文"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Premium locked overlay */}
              {isLocked ? (
                <div className="relative">
                  <div className="blur-sm select-none">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                    <div className="mb-3 rounded-full bg-brand-50 p-4">
                      <Lock className="h-8 w-8 text-brand-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      此為付費內容
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-xs text-center">
                      解鎖後即可查看完整內容
                    </p>
                    <Button
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                      disabled={isPurchasing}
                      onClick={async () => {
                        setIsPurchasing(true);
                        try {
                          await paymentsApi.purchasePost(postId);
                          fetchPost();
                        } catch (err) {
                          setError(
                            ApiError.getMessage(err, '購買失敗，請稍後再試')
                          );
                        } finally {
                          setIsPurchasing(false);
                        }
                      }}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {isPurchasing ? '處理中...' : '解鎖此內容'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Content text */}
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Media images */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="space-y-3">
                      {post.mediaUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-xl bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Media ${idx + 1}`}
                            className="w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Timestamp detail */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 gap-2',
                    isLiked &&
                      'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600'
                  )}
                  onClick={handleLikeToggle}
                >
                  <Heart
                    className={cn('h-4 w-4', isLiked && 'fill-current')}
                  />
                  {isLiked ? '已喜歡' : '喜歡'}
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-gray-500"
                  onClick={() => commentInputRef.current?.focus()}
                >
                  <MessageCircle className="h-4 w-4" />
                  留言
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-brand-600 border-brand-200 hover:bg-brand-50"
                  onClick={() => setShowTipDialog(true)}
                >
                  <DollarSign className="h-4 w-4" />
                  {tipSuccess ? '已打賞' : '打賞'}
                </Button>

                {!isOwner && (
                  <Button
                    variant="outline"
                    className="gap-2 text-gray-500 border-gray-200 hover:bg-gray-50"
                    onClick={() => setShowReportDialog(true)}
                    disabled={reportSuccess}
                  >
                    <Flag className="h-4 w-4" />
                    {reportSuccess ? '已檢舉' : '檢舉'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Comments Section ─── */}
          {!isLocked && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  留言 {comments.length > 0 && `(${comments.length})`}
                </h2>

                {/* Add comment input */}
                {user && (
                  <div className="flex gap-3">
                    <Avatar
                      src={user.avatarUrl}
                      fallback={
                        (user.displayName || '?').slice(0, 2).toUpperCase()
                      }
                      size="sm"
                      className="shrink-0 mt-1"
                    />
                    <div className="flex-1 relative">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="寫下你的留言..."
                        rows={2}
                        maxLength={500}
                        className="flex w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-12 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={
                          !newComment.trim() || isSubmittingComment
                        }
                        className="absolute right-2 bottom-2 p-1.5 rounded-full text-brand-500 hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="送出留言"
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments loading */}
                {commentsLoading && (
                  <div className="space-y-1 divide-y">
                    <CommentSkeleton />
                    <CommentSkeleton />
                    <CommentSkeleton />
                  </div>
                )}

                {/* Comments list */}
                {!commentsLoading && comments.length > 0 && (
                  <div className="divide-y">
                    {comments.map((comment) => (
                      <div
                        key={comment.commentId}
                        className="flex gap-3 py-3 first:pt-0"
                      >
                        <Link href={`/user/${comment.userId}`}>
                          <Avatar
                            src={comment.avatarUrl}
                            fallback={(
                              comment.username || '?'
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                            size="sm"
                            className="shrink-0 cursor-pointer"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/user/${comment.userId}`}
                              className="text-sm font-semibold text-gray-900 hover:underline"
                            >
                              {comment.username}
                            </Link>
                            <span className="text-xs text-gray-400">
                              {timeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {comment.text}
                          </p>
                        </div>
                        {/* Delete own comment */}
                        {user?.id === comment.userId && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteComment(comment.commentId)
                            }
                            disabled={
                              deletingCommentId === comment.commentId
                            }
                            className="self-start mt-1 p-1 rounded text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                            aria-label="刪除留言"
                          >
                            {deletingCommentId === comment.commentId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty comments */}
                {!commentsLoading && comments.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">
                    還沒有留言，成為第一個留言的人吧
                  </p>
                )}

                {/* Load more comments */}
                {commentsHasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={() => fetchComments(commentsNextCursor)}
                      disabled={loadingMoreComments}
                    >
                      {loadingMoreComments ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          載入中...
                        </>
                      ) : (
                        '載入更多留言'
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tip dialog */}
      {showTipDialog && post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                打賞創作者
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((amt) => (
                  <Button
                    key={amt}
                    variant={
                      tipAmount === String(amt) ? 'default' : 'outline'
                    }
                    className={
                      tipAmount === String(amt)
                        ? 'bg-brand-500 text-white'
                        : ''
                    }
                    onClick={() => setTipAmount(String(amt))}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="自訂金額"
                min="1"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowTipDialog(false);
                    setTipAmount('');
                  }}
                  disabled={isTipping}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                  disabled={
                    isTipping || !tipAmount || Number(tipAmount) <= 0
                  }
                  onClick={async () => {
                    setIsTipping(true);
                    try {
                      await paymentsApi.sendTip(
                        post.authorId,
                        Number(tipAmount)
                      );
                      setTipSuccess(true);
                      setShowTipDialog(false);
                      setTipAmount('');
                    } catch (err) {
                      setError(ApiError.getMessage(err, '打賞失敗'));
                    } finally {
                      setIsTipping(false);
                    }
                  }}
                >
                  {isTipping ? '處理中...' : '確認打賞'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report dialog */}
      {showReportDialog && post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                檢舉此貼文
              </h3>
              <div className="space-y-2">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">選擇檢舉原因</option>
                  <option value="spam">垃圾內容</option>
                  <option value="harassment">騷擾或霸凌</option>
                  <option value="inappropriate">不當內容</option>
                  <option value="fraud">詐騙</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="補充說明（選填）"
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReportDialog(false);
                    setReportReason('');
                    setReportDescription('');
                  }}
                  disabled={isReporting}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  disabled={isReporting || !reportReason}
                  onClick={async () => {
                    setIsReporting(true);
                    try {
                      await contentApi.reportPost(
                        post.id,
                        reportReason,
                        reportDescription || undefined
                      );
                      setReportSuccess(true);
                      setShowReportDialog(false);
                      setReportReason('');
                      setReportDescription('');
                    } catch (err) {
                      setError(
                        ApiError.getMessage(err, '檢舉失敗，請稍後再試')
                      );
                    } finally {
                      setIsReporting(false);
                    }
                  }}
                >
                  {isReporting ? '提交中...' : '提交檢舉'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                確定刪除此貼文？
              </h3>
              <p className="text-sm text-gray-500">
                刪除後將無法恢復，此操作不可撤銷。
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? '刪除中...' : '確認刪除'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
