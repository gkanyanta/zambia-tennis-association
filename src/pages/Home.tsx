import { useState, useEffect } from 'react'
import { Slideshow } from '@/components/Slideshow'
import { NewsCard } from '@/components/NewsCard'
import { Button } from '@/components/ui/button'
import { Trophy, Users, Calendar, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { galleryService } from '@/services/galleryService'

const latestNews = [
  {
    id: 1,
    title: 'ZTA Announces National Championships 2025',
    excerpt: 'The Zambia Tennis Association is proud to announce the dates for the National Championships. Join us for the biggest tennis event of the year.',
    date: 'January 15, 2025',
    author: 'ZTA Admin',
    category: 'Tournaments',
  },
  {
    id: 2,
    title: 'Junior Development Program Launch',
    excerpt: 'New junior development program aims to identify and nurture young tennis talent across Zambia. Registration now open for aspiring champions.',
    date: 'January 10, 2025',
    author: 'Development Team',
    category: 'Juniors',
  },
  {
    id: 3,
    title: 'Updated National Rankings Released',
    excerpt: 'Check out the latest national rankings across all categories. Congratulations to all players who have shown remarkable progress.',
    date: 'January 5, 2025',
    author: 'Rankings Committee',
    category: 'Rankings',
  },
]

const stats = [
  { icon: Users, label: 'Active Members', value: '2,500+' },
  { icon: Trophy, label: 'Tournaments Yearly', value: '50+' },
  { icon: Calendar, label: 'Years of Excellence', value: '35+' },
  { icon: TrendingUp, label: 'Growing Clubs', value: '45+' },
]

export function Home() {
  const [slides, setSlides] = useState<any[]>([])
  const [loadingSlides, setLoadingSlides] = useState(true)

  useEffect(() => {
    fetchSlides()
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestNews.map((news) => (
              <NewsCard key={news.id} {...news} />
            ))}
          </div>
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
