import { Calendar, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface NewsCardProps {
  id?: string | number
  title: string
  excerpt: string
  date: string
  author?: string
  category?: string
  imageUrl?: string
  onClick?: () => void
}

export function NewsCard({
  title,
  excerpt,
  date,
  author,
  category,
  imageUrl,
  onClick,
}: NewsCardProps) {
  console.log('NewsCard rendering:', { title, imageUrl });

  // Debug: Check if imageUrl is valid
  if (imageUrl) {
    console.log('Image URL type:', typeof imageUrl);
    console.log('Image URL starts with http:', imageUrl.startsWith('http'));
  }

  return (
    <Card
      className="card-elevated-hover cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-contain"
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              console.error('Error target:', e.currentTarget);
              console.error('Natural dimensions:', e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              console.log('Image loaded successfully:', imageUrl);
              console.log('Dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
            }}
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          {category && <Badge variant="secondary">{category}</Badge>}
        </div>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        <CardDescription className="line-clamp-3">{excerpt}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          {author && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{author}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
