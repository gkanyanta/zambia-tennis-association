import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { commentService, Comment, CommentTargetType } from '@/services/commentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Flag,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ThumbsUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  all: 'All Comments',
  flagged: 'Flagged',
  visible: 'Visible',
  hidden: 'Hidden'
};

const TARGET_LABELS: Record<CommentTargetType | 'all', string> = {
  all: 'All Sections',
  news: 'News',
  tournament: 'Tournaments',
  rankings: 'Rankings'
};

const STATUS_BADGE: Record<string, React.ReactElement> = {
  visible: <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Visible</Badge>,
  flagged: <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs flex items-center gap-1"><Flag className="h-3 w-3" /> Flagged</Badge>,
  hidden: <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs flex items-center gap-1"><EyeOff className="h-3 w-3" /> Hidden</Badge>
};

const PAGE_SIZE = 20;

export function CommentModeration() {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('flagged');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
    fetchComments();
  }, [page, statusFilter, targetFilter]);

  async function fetchComments() {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (targetFilter !== 'all') params.targetType = targetFilter;
      const result = await commentService.getAdminComments(params);
      setComments(result.data);
      setTotal(result.total);
    } catch {
      toast({ title: 'Failed to load comments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function resetPage() {
    setPage(1);
  }

  async function handleSetStatus(commentId: string, status: 'visible' | 'hidden') {
    setActionPending(commentId);
    try {
      await commentService.setCommentStatus(commentId, status);
      setComments(prev => prev.map(c =>
        c._id === commentId ? ({ ...c, status } as Comment) : c
      ));
      toast({ title: status === 'visible' ? 'Comment restored' : 'Comment hidden' });
    } catch {
      toast({ title: 'Action failed', variant: 'destructive' });
    } finally {
      setActionPending(null);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm('Permanently delete this comment?')) return;
    setActionPending(commentId);
    try {
      await commentService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setTotal(t => t - 1);
      toast({ title: 'Comment deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setActionPending(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const flaggedCount = statusFilter === 'flagged' ? total : null;

  return (
    <div className="container-custom py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Admin
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Comment Moderation
          </h1>
          <p className="text-sm text-muted-foreground">Review and moderate user comments across the site</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['flagged', 'visible', 'hidden', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); resetPage(); }}
            className={`rounded-lg border p-3 text-left transition-colors ${statusFilter === s ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          >
            <div className="text-xs text-muted-foreground mb-1">{STATUS_LABELS[s]}</div>
            {statusFilter === s && !loading ? (
              <div className="font-bold text-lg">{total}</div>
            ) : (
              <div className="h-6" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" /> Section:
        </div>
        {(['all', 'news', 'tournament', 'rankings'] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={targetFilter === t ? 'default' : 'outline'}
            onClick={() => { setTargetFilter(t); resetPage(); }}
          >
            {TARGET_LABELS[t]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchComments} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Comment list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {loading ? 'Loading…' : `${total} comment${total !== 1 ? 's' : ''}`}
            {flaggedCount !== null && flaggedCount > 0 && (
              <span className="ml-2 text-orange-500 text-sm font-normal">— review required</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No comments match this filter</p>
            </div>
          ) : (
            <div className="divide-y">
              {comments.map(comment => (
                <CommentRow
                  key={comment._id}
                  comment={comment}
                  pending={actionPending === comment._id}
                  onSetStatus={handleSetStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  pending,
  onSetStatus,
  onDelete
}: {
  comment: Comment;
  pending: boolean;
  onSetStatus: (id: string, status: 'visible' | 'hidden') => void;
  onDelete: (id: string) => void;
}) {
  const isAdminAuthor = comment.author.role === 'admin' || comment.author.role === 'staff';

  const targetLink = comment.targetType === 'news'
    ? `/news/${comment.targetId}`
    : comment.targetType === 'tournament'
    ? `/tournaments/${comment.targetId}`
    : '/rankings';

  return (
    <div className={`p-4 ${comment.status === 'flagged' ? 'bg-orange-50/50 dark:bg-orange-950/10' : comment.status === 'hidden' ? 'bg-gray-50/50 dark:bg-gray-900/20 opacity-60' : ''}`}>
      {/* Top row: author + meta */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {comment.author.firstName[0]}{comment.author.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-medium text-sm">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            {isAdminAuthor && (
              <Badge variant="secondary" className="text-xs py-0 px-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> ZTA
              </Badge>
            )}
            {STATUS_BADGE[comment.status]}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground capitalize">{comment.targetType}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.parentId && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground italic">reply</span>
              </>
            )}
          </div>

          {/* Comment body */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1 mb-2">
            {comment.body}
          </p>

          {/* Likes count */}
          {comment.likes.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <ThumbsUp className="h-3 w-3" /> {comment.likes.length} like{comment.likes.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={targetLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
            >
              <Eye className="h-3 w-3" /> View in context
            </a>
            {comment.status !== 'visible' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={pending}
                onClick={() => onSetStatus(comment._id, 'visible')}
              >
                <Eye className="h-3 w-3 mr-1" /> Restore
              </Button>
            )}
            {comment.status !== 'hidden' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={pending}
                onClick={() => onSetStatus(comment._id, 'hidden')}
              >
                <EyeOff className="h-3 w-3 mr-1" /> Hide
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() => onDelete(comment._id)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
