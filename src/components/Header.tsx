import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User, LayoutDashboard, ChevronDown, Heart, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

// Dropdown menu configurations
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

  const isMenuActive = (menu: { href: string }[]) => {
    return menu.some(item => location.pathname === item.href)
  }

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
          "text-sm font-semibold leading-6 transition-colors hover:text-primary flex items-center gap-1",
          isMenuActive(items) ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          openDropdown === menuKey && "rotate-180"
        )} />
      </button>

      {openDropdown === menuKey && (
        <div
          className="absolute left-0 top-full mt-1 w-48 rounded-md shadow-lg bg-background border z-50"
          onMouseEnter={() => handleDropdownEnter(menuKey)}
          onMouseLeave={handleDropdownLeave}
        >
          <div className="py-1">
            {items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors hover:bg-muted",
                  location.pathname === item.href
                    ? "text-primary font-semibold"
                    : "text-foreground"
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
          "w-full flex items-center justify-between rounded-md px-3 py-2 text-base font-medium transition-colors",
          isMenuActive(items) ? "text-primary" : "text-foreground hover:bg-muted"
        )}
      >
        {label}
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          mobileExpandedMenu === menuKey && "rotate-180"
        )} />
      </button>
      {mobileExpandedMenu === menuKey && (
        <div className="ml-4 mt-1 space-y-1">
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-custom flex h-16 items-center gap-2 lg:gap-8" aria-label="Global">
        {/* Logo */}
        <div className="flex flex-shrink-0">
          <Link to="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Zambia Tennis Association</span>
            <div className="flex items-center gap-2 lg:gap-3">
              <img
                src="/zta-logo.png"
                alt="ZTA Logo"
                className="h-10 w-10 lg:h-12 lg:w-12 object-contain"
              />
              <span className="font-bold text-base lg:text-xl text-foreground hidden md:block whitespace-nowrap">
                Zambia Tennis Association
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-4 xl:gap-x-8 lg:items-center ml-auto">
          {/* Home */}
          <Link
            to="/"
            className={cn(
              "text-sm font-semibold leading-6 transition-colors hover:text-primary whitespace-nowrap",
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Home
          </Link>

          {/* Tennis Dropdown */}
          <DropdownMenu label="Tennis" menuKey="tennis" items={tennisMenu} />

          {/* Connect Dropdown */}
          <DropdownMenu label="Connect" menuKey="connect" items={connectMenu} />

          {/* About Dropdown */}
          <DropdownMenu label="About" menuKey="about" items={aboutMenu} />

          {/* Sponsorship */}
          <Link
            to="/sponsors"
            className={cn(
              "text-sm font-semibold leading-6 transition-colors hover:text-primary flex items-center gap-1 whitespace-nowrap",
              location.pathname === "/sponsors" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Handshake className="h-4 w-4" />
            Sponsorship
          </Link>

          {/* Donate Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/donate')}
            className="bg-primary hover:bg-primary/90"
          >
            <Heart className="h-4 w-4 mr-2" />
            Donate
          </Button>

          {/* Auth buttons */}
          <div className="flex items-center gap-2 lg:gap-3 ml-2 lg:ml-4 border-l pl-2 lg:pl-4">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="hidden xl:flex"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="xl:hidden"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-xs lg:text-sm text-muted-foreground hidden xl:flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user?.firstName}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden xl:flex">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="xl:hidden">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {/* Home */}
            <Link
              to="/"
              className={cn(
                "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                location.pathname === "/"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {/* Tennis Menu */}
            <MobileDropdownMenu label="Tennis" menuKey="tennis" items={tennisMenu} />

            {/* Connect Menu */}
            <MobileDropdownMenu label="Connect" menuKey="connect" items={connectMenu} />

            {/* About Menu */}
            <MobileDropdownMenu label="About" menuKey="about" items={aboutMenu} />

            {/* Sponsorship */}
            <Link
              to="/sponsors"
              className={cn(
                "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                location.pathname === "/sponsors"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center gap-2">
                <Handshake className="h-4 w-4" />
                Sponsorship
              </span>
            </Link>

            {/* Mobile Donate Button */}
            <Button
              variant="default"
              className="w-full justify-start mt-3"
              onClick={() => {
                navigate('/donate')
                setMobileMenuOpen(false)
              }}
            >
              <Heart className="h-4 w-4 mr-2" />
              Donate to ZTA
            </Button>

            {/* Mobile auth */}
            <div className="border-t mt-3 pt-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Logged in as {user?.firstName} {user?.lastName}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/admin')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('/login')
                      setMobileMenuOpen(false)
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      navigate('/register')
                      setMobileMenuOpen(false)
                    }}
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
