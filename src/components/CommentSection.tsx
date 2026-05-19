import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { commentService, Comment, CommentTargetType } from '@/services/commentService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, Flag, Trash2, Reply, MessageSquare, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  targetType: CommentTargetType;
  targetId: string;
}

function authorName(author: Comment['author']) {
  return `${author.firstName} ${author.lastName}`;
}

function isAdminRole(role: string) {
  return role === 'admin' || role === 'staff';
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  isAdmin,
  onReply,
  onLike,
  onFlag,
  onDelete,
  onHide,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  isAdmin: boolean;
  onReply: (parentId: string, parentAuthor: string) => void;
  onLike: (id: string) => void;
  onFlag: (id: string) => void;
  onDelete: (id: string) => void;
  onHide: (id: string, status: 'visible' | 'hidden') => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const liked = currentUserId ? comment.likes.includes(currentUserId) : false;
  const isOwn = currentUserId === comment.author._id;
  const isFlagged = comment.status === 'flagged';

  return (
    <div className="space-y-2">
      <div className={`rounded-lg border p-4 ${isFlagged && isAdmin ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : 'bg-card'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {comment.author.firstName[0]}{comment.author.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{authorName(comment.author)}</span>
              {isAdminRole(comment.author.role) && (
                <Badge variant="secondary" className="text-xs py-0 px-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> ZTA
                </Badge>
              )}
              {isFlagged && isAdmin && (
                <Badge variant="destructive" className="text-xs py-0 px-1">Flagged</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Body */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">{comment.body}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {currentUserId && (
            <>
              <button
                onClick={() => onLike(comment._id)}
                className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
              </button>
              <button
                onClick={() => onReply(comment._id, authorName(comment.author))}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
              {!isOwn && (
                <button
                  onClick={() => onFlag(comment._id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" /> Flag
                </button>
              )}
              {(isOwn || isAdmin) && (
                <button
                  onClick={() => onDelete(comment._id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
              {isAdmin && isFlagged && (
                <button
                  onClick={() => onHide(comment._id, 'visible')}
                  className="text-xs text-muted-foreground hover:text-green-600 transition-colors"
                >
                  Restore
                </button>
              )}
              {isAdmin && !isFlagged && (
                <button
                  onClick={() => onHide(comment._id, 'hidden')}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Hide
                </button>
              )}
            </>
          )}
          {!currentUserId && comment.likes.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="h-3.5 w-3.5" /> {comment.likes.length}
            </span>
          )}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
          {replies.map(reply => (
            <div key={reply._id} className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {reply.author.firstName[0]}{reply.author.lastName[0]}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs">{authorName(reply.author)}</span>
                  {isAdminRole(reply.author.role) && (
                    <Badge variant="secondary" className="text-xs py-0 px-1 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> ZTA
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words mb-2">{reply.body}</p>
              {currentUserId && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onLike(reply._id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${reply.likes.includes(currentUserId) ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {reply.likes.length > 0 && <span>{reply.likes.length}</span>}
                  </button>
                  {(currentUserId === reply.author._id || isAdmin) && (
                    <button
                      onClick={() => onDelete(reply._id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ targetType, targetId }: Props) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ parentId: string; author: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
  }, [targetType, targetId]);

  async function fetchComments() {
    try {
      setLoading(true);
      const data = await commentService.getComments(targetType, targetId);
      setComments(data);
    } catch {
      // silent — comment section failing shouldn't break the page
    } finally {
      setLoading(false);
    }
  }

  function startReply(parentId: string, author: string) {
    setReplyTo({ parentId, author });
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancelReply() {
    setReplyTo(null);
    setBody('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      setSubmitting(true);
      const newComment = await commentService.postComment(
        targetType,
        targetId,
        body.trim(),
        replyTo?.parentId
      );
      setComments(prev => [...prev, newComment]);
      setBody('');
      setReplyTo(null);
    } catch {
      toast({ title: 'Failed to post comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(commentId: string) {
    try {
      const { liked } = await commentService.likeComment(commentId);
      setComments(prev => prev.map(c => {
        if (c._id !== commentId) return c;
        const newLikes = liked
          ? [...c.likes, user!.id]
          : c.likes.filter(id => id !== user!.id);
        return { ...c, likes: newLikes };
      }));
    } catch {
      toast({ title: 'Could not update like', variant: 'destructive' });
    }
  }

  async function handleFlag(commentId: string) {
    try {
      await commentService.flagComment(commentId);
      toast({ title: 'Comment reported', description: 'Thank you — our team will review it.' });
    } catch {
      toast({ title: 'Could not flag comment', variant: 'destructive' });
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch {
      toast({ title: 'Could not delete comment', variant: 'destructive' });
    }
  }

  async function handleSetStatus(commentId: string, status: 'visible' | 'hidden') {
    try {
      await commentService.setCommentStatus(commentId, status);
      if (status === 'hidden') {
        setComments(prev => prev.filter(c => c._id !== commentId));
      } else {
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, status: 'visible' } : c));
      }
    } catch {
      toast({ title: 'Could not update comment status', variant: 'destructive' });
    }
  }

  // Separate top-level comments and replies
  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap: Record<string, Comment[]> = {};
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    }
  }

  const visibleTopLevel = isAdmin
    ? topLevel
    : topLevel.filter(c => c.status !== 'flagged');

  return (
    <div className="mt-12 pt-8 border-t space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Discussion
          {comments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({topLevel.length} {topLevel.length === 1 ? 'comment' : 'comments'})
            </span>
          )}
        </h2>
      </div>

      {/* Compose */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="h-4 w-4" />
              Replying to <span className="font-medium text-foreground">{replyTo.author}</span>
              <button type="button" onClick={cancelReply} className="text-xs underline ml-1">cancel</button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary mt-1">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={replyTo ? `Reply to ${replyTo.author}…` : 'Share your thoughts…'}
                rows={3}
                maxLength={2000}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{body.length}/2000</span>
                <Button type="submit" size="sm" disabled={!body.trim() || submitting}>
                  {submitting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            <Link to="/login" className="text-primary underline font-medium">Sign in</Link> to join the discussion
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : visibleTopLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No comments yet. {isAuthenticated ? 'Be the first to share your thoughts!' : ''}
        </p>
      ) : (
        <div className="space-y-4">
          {visibleTopLevel.map(comment => (
            <CommentItem
              key={comment._id}
              comment={comment}
              replies={repliesMap[comment._id] || []}
              currentUserId={user?.id || null}
              isAdmin={isAdmin}
              onReply={startReply}
              onLike={handleLike}
              onFlag={handleFlag}
              onDelete={handleDelete}
              onHide={handleSetStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
