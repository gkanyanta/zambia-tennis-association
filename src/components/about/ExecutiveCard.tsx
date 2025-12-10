import { Mail, Phone, Linkedin, Twitter, Facebook } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ExecutiveMember } from '@/services/aboutService';

interface ExecutiveCardProps {
  member: ExecutiveMember;
}

export function ExecutiveCard({ member }: ExecutiveCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="mb-4">
            <img
              src={member.profileImage}
              alt={member.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-primary/10"
              loading="lazy"
            />
          </div>

          {/* Name and Position */}
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {member.name}
          </h3>
          <p className="text-sm font-medium text-primary mb-3">
            {member.position}
          </p>

          {/* Bio */}
          {member.bio && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {member.bio}
            </p>
          )}

          {/* Contact Information */}
          <div className="w-full space-y-2">
            {member.email && (
              <div className="flex items-center justify-center text-xs text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <a
                  href={`mailto:${member.email}`}
                  className="hover:text-primary transition-colors"
                >
                  {member.email}
                </a>
              </div>
            )}

            {member.phone && (
              <div className="flex items-center justify-center text-xs text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                <a
                  href={`tel:${member.phone}`}
                  className="hover:text-primary transition-colors"
                >
                  {member.phone}
                </a>
              </div>
            )}
          </div>

          {/* Social Media Links */}
          {(member.socialMedia?.linkedin ||
            member.socialMedia?.twitter ||
            member.socialMedia?.facebook) && (
            <div className="flex gap-3 mt-4">
              {member.socialMedia.linkedin && (
                <a
                  href={member.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {member.socialMedia.twitter && (
                <a
                  href={member.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {member.socialMedia.facebook && (
                <a
                  href={member.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
