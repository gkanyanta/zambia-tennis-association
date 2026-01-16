import { Link, useNavigate } from 'react-router-dom'
import { Facebook, Instagram, Mail, Phone, MapPin, Heart, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Match header navigation structure
const footerLinks = {
  tennis: [
    { name: 'Tournaments', href: '/tournaments' },
    { name: 'Leagues', href: '/leagues' },
    { name: 'Rankings', href: '/rankings' },
    { name: 'News', href: '/news' },
    { name: 'Calendar', href: '/calendar' },
  ],
  connect: [
    { name: 'Players', href: '/players' },
    { name: 'Clubs', href: '/clubs' },
    { name: 'Coaches', href: '/coaches' },
    { name: 'Juniors', href: '/juniors' },
    { name: 'Madalas', href: '/madalas' },
    { name: 'Play', href: '/play' },
  ],
  about: [
    { name: 'About ZTA', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Membership', href: '/membership' },
    { name: 'Sponsors', href: '/sponsors' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ],
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const navigate = useNavigate()

  return (
    <footer className="border-t bg-muted/30">
      {/* CTA Section */}
      <div className="bg-primary/5 border-b">
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-lg text-foreground">Support Zambian Tennis</h3>
              <p className="text-sm text-muted-foreground">Help us grow the game and develop future champions</p>
            </div>
            <Button onClick={() => navigate('/donate')} size="lg">
              <Heart className="h-4 w-4 mr-2" />
              Donate Now
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand & Contact */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/zta-logo.png"
                alt="ZTA Logo"
                className="h-12 w-12 object-contain"
              />
              <div>
                <span className="font-bold text-lg text-foreground block">
                  Zambia Tennis Association
                </span>
                <span className="text-xs text-muted-foreground">Official Governing Body</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Promoting excellence, development, and participation in tennis at all levels across Zambia.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Olympic Youth Development Centre<br />Independence Avenue, Lusaka</span>
              </div>
              <a href="tel:+260979326778" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+260 979 326 778</span>
              </a>
              <a href="mailto:info@zambiatennis.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>info@zambiatennis.com</span>
              </a>
              <a href="https://wa.me/260979326778" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              <a
                href="https://web.facebook.com/profile.php?id=61553884656266"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Tennis Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Tennis</h3>
            <ul className="space-y-2.5">
              {footerLinks.tennis.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <ul className="space-y-2.5">
              {footerLinks.connect.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">About</h3>
            <ul className="space-y-2.5">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-muted/50">
        <div className="container-custom py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
            <p>
              © {currentYear} Zambia Tennis Association. All rights reserved.
            </p>
            <div className="flex gap-4">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-muted">
            <p className="text-xs text-muted-foreground">
              Designed by{' '}
              <a
                href="https://wa.me/260965982894"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-primary transition-colors"
              >
                Privtech Solutions Limited
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
