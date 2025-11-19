import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User, LayoutDashboard, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'News', href: '/news' },
  { name: 'Leagues', href: '/leagues' },
  { name: 'Tournaments', href: '/tournaments' },
  { name: 'Rankings', href: '/rankings' },
  { name: 'Membership', href: '/membership' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const communityMenu = [
  { name: 'Players', href: '/players' },
  { name: 'Clubs', href: '/clubs' },
  { name: 'Play', href: '/play' },
  { name: 'Juniors', href: '/juniors' },
  { name: 'Madalas', href: '/madalas' },
  { name: 'Coaches', href: '/coaches' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [communityDropdownOpen, setCommunityDropdownOpen] = useState(false)
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleDropdownEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
    setCommunityDropdownOpen(true)
  }

  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setCommunityDropdownOpen(false)
    }, 300) // 300ms delay before closing
    setDropdownTimeout(timeout)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-custom flex h-16 items-center gap-8" aria-label="Global">
        {/* Logo */}
        <div className="flex">
          <Link to="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Zambia Tennis Association</span>
            <div className="flex items-center gap-3">
              <img
                src="/zta-logo.png"
                alt="ZTA Logo"
                className="h-12 w-12 object-contain"
              />
              <span className="font-bold text-xl text-foreground hidden sm:block whitespace-nowrap">
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
        <div className="hidden lg:flex lg:gap-x-6 lg:items-center ml-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "text-sm font-semibold leading-6 transition-colors hover:text-primary",
                location.pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}

          {/* Community Dropdown */}
          <div
            className="relative"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className={cn(
                "text-sm font-semibold leading-6 transition-colors hover:text-primary flex items-center gap-1",
                communityMenu.some(item => location.pathname === item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Community
              <ChevronDown className="h-4 w-4" />
            </button>

            {communityDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-48 rounded-md shadow-lg bg-background border z-50"
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <div className="py-1">
                  {communityMenu.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors hover:bg-muted",
                        location.pathname === item.href
                          ? "text-primary font-semibold"
                          : "text-foreground"
                      )}
                      onClick={() => setCommunityDropdownOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3 ml-4 border-l pl-4">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user?.firstName}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
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
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Community submenu in mobile */}
            <div className="mt-1">
              <div className="px-3 py-2 text-base font-medium text-muted-foreground">
                Community
              </div>
              {communityMenu.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "block rounded-md px-6 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>

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
