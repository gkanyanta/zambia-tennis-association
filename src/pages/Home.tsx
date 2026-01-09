import { useState, useEffect } from 'react'
import { Slideshow } from '@/components/Slideshow'
import { NewsCard } from '@/components/NewsCard'
import { Button } from '@/components/ui/button'
import { Trophy, Users, Calendar, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { galleryService } from '@/services/galleryService'
import { newsService, NewsArticle } from '@/services/newsService'
import { statsService, Stats } from '@/services/statsService'

export function Home() {
  const navigate = useNavigate()
  const [slides, setSlides] = useState<any[]>([])
  const [loadingSlides, setLoadingSlides] = useState(true)
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchSlides()
    fetchLatestNews()
    fetchStats()
  }, [])

  const fetchSlides = async () => {
    try {
      setLoadingSlides(true)
      const images = await galleryService.getGalleryImages(true) // Only slideshow images

      // Transform gallery images to slide format
      const transformedSlides = images.map(img => ({
        image: img.imageUrl,
        title: img.title,
        description: img.description || img.category
      }))

      setSlides(transformedSlides)
    } catch (err) {
      console.error('Failed to load slideshow:', err)
      // Fallback to empty or default slides
      setSlides([])
    } finally {
      setLoadingSlides(false)
    }
  }

  const fetchLatestNews = async () => {
    try {
      setLoadingNews(true)
      const articles = await newsService.getNews()
      // Filter published articles and get the 3 most recent
      const publishedArticles = articles
        .filter(article => article.published)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          return dateB - dateA
        })
        .slice(0, 3)

      setLatestNews(publishedArticles)
    } catch (err) {
      console.error('Failed to load news:', err)
      setLatestNews([])
    } finally {
      setLoadingNews(false)
    }
  }

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const data = await statsService.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
      // Set fallback stats if API fails
      setStats({
        activeMembers: 0,
        tournamentsYearly: 0,
        yearsOfExcellence: 35,
        growingClubs: 0
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const handleNewsClick = (articleId?: string) => {
    if (articleId) {
      navigate(`/news/${articleId}`)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Slideshow Section */}
      <section className="py-8 bg-muted/50">
        <div className="container-custom">
          {loadingSlides ? (
            <div className="h-[500px] md:h-[600px] rounded-lg bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Loading slideshow...</p>
            </div>
          ) : slides.length > 0 ? (
            <Slideshow slides={slides} autoPlay interval={5000} />
          ) : (
            <div className="h-[500px] md:h-[600px] rounded-lg bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">No slideshow images available</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container-custom">
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-20 mx-auto mb-2 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-24 mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.activeMembers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.tournamentsYearly}
                </div>
                <div className="text-sm text-muted-foreground">Tournaments This Year</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.yearsOfExcellence}
                </div>
                <div className="text-sm text-muted-foreground">Years of Excellence</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.growingClubs}
                </div>
                <div className="text-sm text-muted-foreground">Registered Clubs</div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Latest News
              </h2>
              <p className="text-muted-foreground">
                Stay updated with the latest from Zambian tennis
              </p>
            </div>
            <Link to="/news">
              <Button variant="outline">View All News</Button>
            </Link>
          </div>
          {loadingNews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : latestNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestNews.map((news) => (
                <NewsCard
                  key={news._id}
                  id={news._id}
                  title={news.title}
                  excerpt={news.excerpt}
                  date={new Date(news.createdAt || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  author={news.author}
                  category={news.category}
                  imageUrl={news.imageUrl}
                  onClick={() => handleNewsClick(news._id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No published news articles yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 gradient-hero">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Start Your Tennis Journey?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join the Zambia Tennis Association today and be part of our growing community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/membership">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90">
                Become a Member
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
