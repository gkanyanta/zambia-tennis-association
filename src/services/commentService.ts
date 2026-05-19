import apiClient from './apiClient';

export type CommentTargetType = 'news' | 'tournament' | 'rankings';

export interface CommentAuthor {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Comment {
  _id: string;
  targetType: CommentTargetType;
  targetId: string;
  author: CommentAuthor;
  body: string;
  parentId: string | null;
  likes: string[];
  status: 'visible' | 'flagged';
  createdAt: string;
  updatedAt: string;
}

export const commentService = {
  async getComments(targetType: CommentTargetType, targetId: string): Promise<Comment[]> {
    const res = await apiClient.get('/comments', { params: { targetType, targetId } });
    return res.data.data;
  },

  async postComment(targetType: CommentTargetType, targetId: string, body: string, parentId?: string): Promise<Comment> {
    const res = await apiClient.post('/comments', { targetType, targetId, body, parentId: parentId || null });
    return res.data.data;
  },

  async likeComment(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
    const res = await apiClient.post(`/comments/${commentId}/like`);
    return res.data;
  },

  async flagComment(commentId: string): Promise<void> {
    await apiClient.post(`/comments/${commentId}/flag`);
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/comments/${commentId}`);
  },

  async setCommentStatus(commentId: string, status: 'visible' | 'hidden' | 'flagged'): Promise<void> {
    await apiClient.patch(`/comments/${commentId}/status`, { status });
  }
};
