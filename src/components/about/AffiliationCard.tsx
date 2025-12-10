import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Affiliation } from '@/services/aboutService';

interface AffiliationCardProps {
  affiliation: Affiliation;
}

export function AffiliationCard({ affiliation }: AffiliationCardProps) {
  const categoryColors = {
    international: 'bg-blue-100 text-blue-800',
    continental: 'bg-green-100 text-green-800',
    national: 'bg-purple-100 text-purple-800'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center h-full">
          {/* Logo */}
          <div className="mb-4 h-24 flex items-center justify-center">
            <img
              src={affiliation.logo}
              alt={affiliation.name}
              className="max-h-24 max-w-full object-contain"
              loading="lazy"
            />
          </div>

          {/* Acronym Badge */}
          <Badge variant="outline" className="mb-2">
            {affiliation.acronym}
          </Badge>

          {/* Name */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {affiliation.name}
          </h3>

          {/* Category Badge */}
          <Badge className={`mb-3 ${categoryColors[affiliation.category]}`}>
            {affiliation.category}
          </Badge>

          {/* Description */}
          {affiliation.description && (
            <p className="text-sm text-gray-600 mb-4 flex-grow">
              {affiliation.description}
            </p>
          )}

          {/* Website Link */}
          <a
            href={affiliation.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors mt-auto"
          >
            Visit Website
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
