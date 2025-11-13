import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Settings } from 'lucide-react'
import { galleryService, GalleryImage } from '@/services/galleryService'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'

const oldGalleryImages: any[] = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1554068865-24ceef4997b8?w=800&auto=format&fit=crop',
    title: 'National Championships 2024',
    category: 'Tournaments',
    date: 'December 2024',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&auto=format&fit=crop',
    title: 'Junior Training Camp',
    category: 'Juniors',
    date: 'November 2024',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=800&auto=format&fit=crop',
    title: 'New Courts Opening in Ndola',
    category: 'Infrastructure',
    date: 'October 2024',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1490886728941-a3010497f7e7?w=800&auto=format&fit=crop',
    title: 'Women\'s Singles Final',
    category: 'Tournaments',
    date: 'December 2024',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1519311965067-36d3e5f33d39?w=800&auto=format&fit=crop',
    title: 'Coaching Certification Program',
    category: 'Education',
    date: 'September 2024',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&auto=format&fit=crop',
    title: 'Junior Champions',
    category: 'Juniors',
    date: 'August 2024',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1617883861744-7e25fc49dcc8?w=800&auto=format&fit=crop',
    title: 'Community Outreach Program',
    category: 'Development',
    date: 'July 2024',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop',
    title: 'Doubles Championship',
    category: 'Tournaments',
    date: 'June 2024',
  },
  {
    id: 9,
    src: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=800&auto=format&fit=crop',
    title: 'Olympic Youth Development Centre',
    category: 'Infrastructure',
    date: 'May 2024',
  },
  {
    id: 10,
    src: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=800&auto=format&fit=crop',
    title: 'Madalas Tournament',
    category: 'Madalas',
    date: 'April 2024',
  },
  {
    id: 11,
    src: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop',
    title: 'Team Training Session',
    category: 'Training',
    date: 'March 2024',
  },
  {
    id: 12,
    src: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&auto=format&fit=crop',
    title: 'Victory Celebration',
    category: 'Tournaments',
    date: 'February 2024',
  },
]

const categories = ['All', 'Tournaments', 'Juniors', 'Infrastructure', 'Education', 'Development', 'Madalas', 'Training']

export function Gallery() {
  const { isAdmin } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      setLoading(true)
      const data = await galleryService.getGalleryImages(false) // Only non-slideshow images
      setImages(data)
    } catch (err) {
      console.error('Failed to load gallery:', err)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const filteredImages = selectedCategory === 'All'
    ? images
    : images.filter(img => img.category === selectedCategory)

  return (
    <div className="flex flex-col">
      <Hero
        title="Photo Gallery"
        description="Moments captured from tournaments, training sessions, and events across Zambia"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Admin Button */}
          {isAdmin && (
            <div className="flex justify-end mb-6">
              <Link to="/gallery/manage">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Gallery
                </Button>
              </Link>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading gallery...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No images in this category yet.
              {isAdmin && (
                <div className="mt-4">
                  <Link to="/gallery/manage">
                    <Button>Upload Images</Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <Card
                  key={image._id}
                  className="overflow-hidden cursor-pointer card-elevated-hover"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="aspect-square relative group bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-semibold mb-1 text-sm">{image.title}</h3>
                        <p className="text-xs text-white/80">{image.date || image.category}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-white text-center">
              <h3 className="text-2xl font-bold mb-2">{selectedImage.title}</h3>
              {selectedImage.description && (
                <p className="text-white/90 mb-2">{selectedImage.description}</p>
              )}
              <p className="text-white/80">
                {selectedImage.category} {selectedImage.date && `• ${selectedImage.date}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
