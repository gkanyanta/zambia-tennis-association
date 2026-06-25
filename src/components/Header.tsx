import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User, LayoutDashboard, ChevronDown, Heart, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const tennisMenu = [
  { name: 'Tournaments', href: '/tournaments' },
  { name: 'Live Scores', href: '/live-scores' },
  { name: 'Leagues', href: '/leagues' },
  { name: 'Rankings', href: '/rankings' },
  { name: 'News', href: '/news' },
  { name: 'Calendar', href: '/calendar' },
]

const connectMenu = [
  { name: 'Players', href: '/players' },
  { name: 'Clubs', href: '/clubs' },
  { name: 'Coaches', href: '/coaches' },
  { name: 'Juniors', href: '/juniors' },
  { name: 'Madalas', href: '/madalas' },
  { name: 'Play', href: '/play' },
]

const aboutMenu = [
  { name: 'About ZTA', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Membership', href: '/membership' },
  { name: 'Register ZPIN', href: '/register-zpin' },
  { name: 'Club Affiliation', href: '/club-affiliation' },
  { name: 'Get App', href: '/install' },
]

type DropdownKey = 'tennis' | 'connect' | 'about'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null)
  const [dropdownTimeout, setDropdownTimeout] = useState<number | null>(null)
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<DropdownKey | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleDropdownEnter = (key: DropdownKey) => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
    setOpenDropdown(key)
  }

  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null)
    }, 300)
    setDropdownTimeout(timeout as unknown as number)
  }

  const isMenuActive = (menu: { href: string }[]) =>
    menu.some(item => location.pathname === item.href)

  const toggleMobileMenu = (key: DropdownKey) => {
    setMobileExpandedMenu(mobileExpandedMenu === key ? null : key)
  }

  const DropdownMenu = ({
    label,
    menuKey,
    items
  }: {
    label: string
    menuKey: DropdownKey
    items: { name: string; href: string }[]
  }) => (
    <div
      className="relative"
      onMouseEnter={() => handleDropdownEnter(menuKey)}
      onMouseLeave={handleDropdownLeave}
    >
      <button
        className={cn(
          "text-sm font-medium leading-6 transition-colors flex items-center gap-1",
          isMenuActive(items)
            ? "text-emerald-400"
            : "text-zinc-300 hover:text-white"
        )}
      >
        {label}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform opacity-60",
          openDropdown === menuKey && "rotate-180"
        )} />
      </button>

      {openDropdown === menuKey && (
        <div
          className="absolute left-0 top-full mt-2 w-48 rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden"
          style={{ background: '#0d2114' }}
          onMouseEnter={() => handleDropdownEnter(menuKey)}
          onMouseLeave={handleDropdownLeave}
        >
          <div className="py-1.5">
            {items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors",
                  location.pathname === item.href
                    ? "text-emerald-400 font-medium bg-white/5"
                    : "text-zinc-300 hover:text-white hover:bg-white/8"
                )}
                onClick={() => setOpenDropdown(null)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const MobileDropdownMenu = ({
    label,
    menuKey,
    items
  }: {
    label: string
    menuKey: DropdownKey
    items: { name: string; href: string }[]
  }) => (
    <div>
      <button
        onClick={() => toggleMobileMenu(menuKey)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isMenuActive(items)
            ? "text-emerald-400"
            : "text-zinc-300 hover:text-white hover:bg-white/8"
        )}
      >
        {label}
        <ChevronDown className={cn(
          "h-4 w-4 opacity-60 transition-transform",
          mobileExpandedMenu === menuKey && "rotate-180"
        )} />
      </button>
      {mobileExpandedMenu === menuKey && (
        <div className="ml-3 mt-0.5 border-l border-white/10 pl-3 space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                location.pathname === item.href
                  ? "text-emerald-400 font-medium"
                  : "text-zinc-400 hover:text-white"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/8 backdrop-blur-md"
      style={{ background: 'rgba(8, 26, 12, 0.97)' }}
    >
      <nav className="container-custom flex h-16 items-center gap-2 lg:gap-8" aria-label="Global">
        {/* Logo */}
        <div className="flex flex-shrink-0">
          <Link to="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Zambia Tennis Association</span>
            <div className="flex items-center gap-2.5 lg:gap-3">
              <img
                src="/zta-logo.png"
                alt="ZTA Logo"
                className="h-9 w-9 lg:h-11 lg:w-11 object-contain"
              />
              <span className="font-bold text-base lg:text-lg text-white hidden md:block whitespace-nowrap tracking-tight">
                Zambia Tennis Association
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden ml-auto">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-5 xl:gap-x-7 lg:items-center ml-auto">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium leading-6 transition-colors whitespace-nowrap",
              location.pathname === "/" ? "text-emerald-400" : "text-zinc-300 hover:text-white"
            )}
          >
            Home
          </Link>

          <DropdownMenu label="Tennis" menuKey="tennis" items={tennisMenu} />
          <DropdownMenu label="Connect" menuKey="connect" items={connectMenu} />
          <DropdownMenu label="About" menuKey="about" items={aboutMenu} />

          <Link
            to="/partnerships"
            className={cn(
              "text-sm font-medium leading-6 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              location.pathname === "/partnerships" ? "text-emerald-400" : "text-zinc-300 hover:text-white"
            )}
          >
            <Handshake className="h-3.5 w-3.5 opacity-70" />
            Partnership
          </Link>

          {/* Donate */}
          <Button
            size="sm"
            onClick={() => navigate('/donate')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-medium"
          >
            <Heart className="h-3.5 w-3.5 mr-1.5" />
            Donate
          </Button>

          {/* Auth */}
          <div className="flex items-center gap-2 border-l border-white/15 pl-4 ml-1">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="hidden xl:flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/8"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="xl:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                  </button>
                )}
                <span className="text-sm text-zinc-400 hidden xl:flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {user?.firstName}
                </span>
                <button
                  onClick={handleLogout}
                  className="hidden xl:flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/8"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
                <button
                  onClick={handleLogout}
                  className="xl:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/8"
                >
                  Login
                </button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="bg-white text-[#081a0c] hover:bg-zinc-100 font-semibold border-0"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-white/10"
          style={{ background: '#081a0c' }}
        >
          <div className="px-4 py-3 space-y-0.5">
            <Link
              to="/"
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === "/"
                  ? "text-emerald-400"
                  : "text-zinc-300 hover:text-white hover:bg-white/8"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            <MobileDropdownMenu label="Tennis" menuKey="tennis" items={tennisMenu} />
            <MobileDropdownMenu label="Connect" menuKey="connect" items={connectMenu} />
            <MobileDropdownMenu label="About" menuKey="about" items={aboutMenu} />

            <Link
              to="/partnerships"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === "/partnerships"
                  ? "text-emerald-400"
                  : "text-zinc-300 hover:text-white hover:bg-white/8"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Handshake className="h-4 w-4 opacity-70" />
              Partnership
            </Link>

            <div className="pt-2 pb-1">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-medium"
                onClick={() => { navigate('/donate'); setMobileMenuOpen(false) }}
              >
                <Heart className="h-4 w-4 mr-2" />
                Donate to ZTA
              </Button>
            </div>

            <div className="border-t border-white/10 pt-3 mt-2 space-y-1.5">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-1 text-xs text-zinc-500">
                    {user?.firstName} {user?.lastName}
                  </div>
                  {isAdmin && (
                    <button
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/8 transition-colors"
                      onClick={() => { navigate('/admin'); setMobileMenuOpen(false) }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </button>
                  )}
                  <button
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
                    onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/8 transition-colors text-left"
                    onClick={() => { navigate('/login'); setMobileMenuOpen(false) }}
                  >
                    Login
                  </button>
                  <Button
                    className="w-full bg-white text-[#081a0c] hover:bg-zinc-100 font-semibold border-0"
                    onClick={() => { navigate('/register'); setMobileMenuOpen(false) }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
