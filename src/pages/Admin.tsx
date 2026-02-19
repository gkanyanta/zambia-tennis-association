import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Hero } from '@/components/Hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Newspaper,
  Trophy,
  DollarSign,
  Users,
  BarChart3,
  UserCog,
  Building2,
  UserCircle,
  Globe,
  FileText,
  CreditCard,
  Calendar,
  TrendingUp
} from 'lucide-react';

export function Admin() {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  const adminSections = [
    {
      title: 'User Management',
      description: 'Create and manage admin and staff accounts',
      icon: UserCog,
      action: () => navigate('/admin/users'),
      color: 'text-purple-500'
    },
    {
      title: 'Manage News',
      description: 'Create, edit, and delete news articles',
      icon: Newspaper,
      action: () => navigate('/news'),
      color: 'text-blue-500'
    },
    {
      title: 'Manage Tournaments',
      description: 'Create and manage tournament entries and draws',
      icon: Trophy,
      action: () => navigate('/admin/tournaments'),
      color: 'text-yellow-500'
    },
    {
      title: 'Manage Rankings',
      description: 'Update player rankings and standings',
      icon: BarChart3,
      action: () => navigate('/rankings'),
      color: 'text-green-500'
    },
    {
      title: 'Manage Players',
      description: 'Edit players and move them between clubs',
      icon: UserCircle,
      action: () => navigate('/admin/players'),
      color: 'text-pink-500'
    },
    {
      title: 'Manage Clubs',
      description: 'Create, edit, and manage tennis clubs',
      icon: Building2,
      action: () => navigate('/admin/clubs'),
      color: 'text-indigo-500'
    },
    {
      title: 'Manage Coaches',
      description: 'Manage coaches, listings, and payments',
      icon: Users,
      action: () => navigate('/admin/coaches'),
      color: 'text-orange-500'
    },
    {
      title: 'Membership Management',
      description: 'Manage ZPIN memberships, club affiliations, and pricing',
      icon: CreditCard,
      action: () => navigate('/admin/membership'),
      color: 'text-emerald-500'
    },
    {
      title: 'Calendar Events',
      description: 'Manage tennis calendar and events',
      icon: Calendar,
      action: () => navigate('/admin/calendar'),
      color: 'text-rose-500'
    },
    {
      title: 'Income & Payments',
      description: 'View all payments, donations, and financial reports',
      icon: DollarSign,
      action: () => navigate('/admin/income'),
      color: 'text-lime-500'
    },
    {
      title: 'Executive Members',
      description: 'Manage executive committee members',
      icon: Users,
      action: () => navigate('/admin/executive-members'),
      color: 'text-teal-500'
    },
    {
      title: 'Affiliations',
      description: 'Manage organizational affiliations',
      icon: Globe,
      action: () => navigate('/admin/affiliations'),
      color: 'text-cyan-500'
    },
    {
      title: 'About Content',
      description: 'Edit About page content sections',
      icon: FileText,
      action: () => navigate('/admin/about-content'),
      color: 'text-slate-500'
    },
    {
      title: 'Manage Leagues',
      description: 'Manage leagues, teams, fixtures, and standings',
      icon: Trophy,
      action: () => navigate('/admin/leagues'),
      color: 'text-red-500'
    },
    {
      title: 'Traffic & Analytics',
      description: 'View website traffic, SEO status, and visitor statistics',
      icon: TrendingUp,
      action: () => navigate('/admin/traffic'),
      color: 'text-sky-500'
    }
  ];

  return (
    <div className="flex flex-col">
      <Hero
        title="Admin Dashboard"
        description="Manage all aspects of the Zambia Tennis Association"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245</div>
                <p className="text-xs text-muted-foreground">+12 from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">2 with open registration</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Revenue (Month)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">K 45,200</div>
                <p className="text-xs text-muted-foreground">+8% from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Sections */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Management Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Card key={section.title} className="card-elevated-hover cursor-pointer" onClick={section.action}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <section.icon className={`h-5 w-5 ${section.color}`} />
                        {section.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={section.action}>
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="mt-12">
            <h3 className="text-xl font-bold text-foreground mb-4">Recent Activity</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground">10 minutes ago</span>
                    <span className="flex-1">New tournament registration by John Banda</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-muted-foreground">1 hour ago</span>
                    <span className="flex-1">New player registration completed</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-muted-foreground">2 hours ago</span>
                    <span className="flex-1">New membership payment received</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-muted-foreground">3 hours ago</span>
                    <span className="flex-1">Rankings updated for Men's Singles</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
