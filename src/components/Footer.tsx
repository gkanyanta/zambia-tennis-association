import { Link, useNavigate } from 'react-router-dom'
import { Facebook, Instagram, Mail, Phone, MapPin, Heart, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    { name: 'Register ZPIN', href: '/register-zpin' },
    { name: 'Club Affiliation', href: '/club-affiliation' },
    { name: 'Partnership', href: '/partnerships' },
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
    <footer style={{ background: '#081a0c' }}>
      {/* CTA Band */}
      <div className="border-b border-white/8">
        <div className="container-custom py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-lg text-white">Support Zambian Tennis</h3>
              <p className="text-sm text-zinc-400 mt-1">Help us grow the game and develop future champions</p>
            </div>
            <Button
              onClick={() => navigate('/donate')}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-semibold px-8"
            >
              <Heart className="h-4 w-4 mr-2" />
              Donate Now
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-custom py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand & Contact */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <img
                src="/zta-logo.png"
                alt="ZTA Logo"
                className="h-12 w-12 object-contain"
              />
              <div>
                <span className="font-bold text-lg text-white block tracking-tight">
                  Zambia Tennis Association
                </span>
                <span className="text-xs text-zinc-500">Official Governing Body</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-7 max-w-sm leading-relaxed">
              Promoting excellence, development, and participation in tennis at all levels across Zambia.
            </p>
            <div className="space-y-2.5 text-sm text-zinc-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-500" />
                <span>Olympic Youth Development Centre<br />Independence Avenue, Lusaka</span>
              </div>
              <a href="tel:+260979326778" className="flex items-center gap-2.5 hover:text-emerald-400 transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                +260 979 326 778
              </a>
              <a href="mailto:info@zambiatennis.com" className="flex items-center gap-2.5 hover:text-emerald-400 transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                info@zambiatennis.com
              </a>
              <a href="https://wa.me/260979326778" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-emerald-400 transition-colors">
                <MessageCircle className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                WhatsApp
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-7">
              <a
                href="https://web.facebook.com/profile.php?id=61553884656266"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-zinc-400 hover:bg-emerald-600 hover:text-white transition-all duration-200"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-zinc-400 hover:bg-emerald-600 hover:text-white transition-all duration-200"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Tennis Links */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-5">Tennis</h3>
            <ul className="space-y-3">
              {footerLinks.tennis.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-5">Connect</h3>
            <ul className="space-y-3">
              {footerLinks.connect.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-5">About</h3>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/8" style={{ background: '#051208' }}>
        <div className="container-custom py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-zinc-500">
            <p>© {currentYear} Zambia Tennis Association. All rights reserved.</p>
            <div className="flex gap-5">
              {footerLinks.legal.map((link) => (
                <Link key={link.name} to={link.href} className="hover:text-zinc-300 transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-white/6">
            <p className="text-xs text-zinc-600">
              Designed by{' '}
              <a
                href="https://wa.me/260965982894"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
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
