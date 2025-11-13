import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { NewsCard } from '@/components/NewsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Eye, Plus, Edit, Trash2, Upload, X, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { newsService, NewsArticle } from '@/services/newsService'

export function News() {
  const { isAdmin } = useAuth()
  const [viewMode, setViewMode] = useState<'view' | 'manage'>('view')
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    excerpt: '',
    author: '',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)

  // Fetch news on component mount
  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const data = await newsService.getNews()
      setNews(data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setSelectedFile(null)
    const fileInput = document.getElementById('image-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingId) {
        // Update existing article
        await newsService.updateNews(editingId, formData, selectedFile || undefined)
      } else {
        // Create new article
        await newsService.createNews(formData, selectedFile || undefined)
      }

      // Reset form and refresh news
      setFormData({ title: '', category: '', excerpt: '', author: '' })
      setImagePreview(null)
      setSelectedFile(null)
      setEditingId(null)
      await fetchNews()
      alert(editingId ? 'Article updated successfully!' : 'Article published successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to save article')
    }
  }

  const handleEdit = (article: NewsArticle) => {
    setFormData({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      author: article.author,
    })
    setImagePreview(article.imageUrl || null)
    setEditingId(article._id || null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      await newsService.deleteNews(id)
      await fetchNews()
      alert('Article deleted successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to delete article')
    }
  }

  const handleCancelEdit = () => {
    setFormData({ title: '', category: '', excerpt: '', author: '' })
    setImagePreview(null)
    setSelectedFile(null)
    setEditingId(null)
  }

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article)
  }

  const handleCloseModal = () => {
    setSelectedArticle(null)
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Tennis News & Updates"
        description="Stay informed with the latest news, announcements, and stories from Zambian tennis"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Mode Toggle - Only show if admin */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {viewMode === 'view' ? 'All News' : 'Manage News'}
            </h2>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'view' ? 'default' : 'outline'}
                  onClick={() => setViewMode('view')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Mode
                </Button>
                <Button
                  variant={viewMode === 'manage' ? 'default' : 'outline'}
                  onClick={() => setViewMode('manage')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Mode
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {viewMode === 'view' ? (
            // View Mode - Display News Grid
            loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading news articles...
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No news articles yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((article) => (
                  <NewsCard
                    key={article._id}
                    id={article._id || 0}
                    title={article.title}
                    excerpt={article.excerpt}
                    date={new Date(article.createdAt || '').toLocaleDateString()}
                    author={article.author}
                    category={article.category}
                    imageUrl={article.imageUrl}
                    onClick={() => handleArticleClick(article)}
                  />
                ))}
              </div>
            )
          ) : (
            // Manage Mode - Admin Interface
            <div className="space-y-6">
              {/* Add/Edit News Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    {editingId ? 'Edit Article' : 'Add New Article'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Title *
                      </label>
                      <Input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter article title"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Category *
                      </label>
                      <Input
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="e.g., Tournaments, Juniors, Rankings"
                        required
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Featured Image
                      </label>
                      <div className="space-y-3">
                        {!imagePreview ? (
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                              PNG, JPG, GIF up to 10MB
                            </p>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('image-upload')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </Button>
                          </div>
                        ) : (
                          <div className="relative rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center" style={{height: '12rem'}}>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-contain"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={handleRemoveImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {selectedFile && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <p className="text-white text-sm font-medium truncate">
                                  {selectedFile.name}
                                </p>
                                <p className="text-white/80 text-xs">
                                  {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Excerpt *
                      </label>
                      <Textarea
                        name="excerpt"
                        value={formData.excerpt}
                        onChange={handleInputChange}
                        placeholder="Brief summary of the article"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Author *
                      </label>
                      <Input
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        placeholder="Author name"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">
                        <Plus className="h-4 w-4 mr-2" />
                        {editingId ? 'Update Article' : 'Publish Article'}
                      </Button>
                      {editingId && (
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* News Management List */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Existing Articles ({news.length})
                </h3>
                {loading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Loading articles...
                  </div>
                ) : news.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No articles yet. Create one above!
                  </div>
                ) : (
                  news.map((article) => (
                    <Card key={article._id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 flex-1">
                            {article.imageUrl && (
                              <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                  src={article.imageUrl}
                                  alt={article.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-foreground">
                                  {article.title}
                                </h4>
                                <Badge variant="secondary">{article.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {article.excerpt}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                By {article.author} • {new Date(article.createdAt || '').toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(article)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(article._id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              {selectedArticle.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
                  <img
                    src={selectedArticle.imageUrl}
                    alt={selectedArticle.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                {selectedArticle.category && <Badge variant="secondary">{selectedArticle.category}</Badge>}
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">{selectedArticle.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(selectedArticle.createdAt || '').toLocaleDateString()}</span>
                </div>
                {selectedArticle.author && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{selectedArticle.author}</span>
                  </div>
                )}
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content || selectedArticle.excerpt}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
