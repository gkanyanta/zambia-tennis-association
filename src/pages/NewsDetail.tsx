import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { newsService, NewsArticle } from '@/services/newsService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, User, Eye } from 'lucide-react'

export function NewsDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchArticle(id)
    }
  }, [id])

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await newsService.getNewsById(articleId)
      setArticle(data)
    } catch (err: any) {
      console.error('Failed to load article:', err)
      setError(err.message || 'Failed to load article')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container-custom py-16">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-64 bg-muted rounded mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="container-custom py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-8">
          {error || 'The article you are looking for does not exist.'}
        </p>
        <Button onClick={() => navigate('/news')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to News
        </Button>
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/news')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to News
      </Button>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Badge variant="secondary" className="mb-4">
            {article.category}
          </Badge>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {article.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(article.createdAt || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {article.views !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{article.views} views</span>
              </div>
            )}
          </div>

          {/* Excerpt */}
          <p className="text-xl text-muted-foreground mb-8">
            {article.excerpt}
          </p>
        </div>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-auto object-cover"
              onError={(e) => {
                console.error('Image failed to load:', article.imageUrl)
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {article.content ? (
            <div
              className="text-foreground leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}
            />
          ) : (
            <p className="text-muted-foreground italic">No content available for this article.</p>
          )}
        </div>

        {/* Back to News button at bottom */}
        <div className="mt-12 pt-8 border-t">
          <Button onClick={() => navigate('/news')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All News
          </Button>
        </div>
      </article>
    </div>
  )
}
