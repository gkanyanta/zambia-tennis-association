import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Hero } from '@/components/Hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  TrendingUp,
  Loader2,
  ClipboardList
} from 'lucide-react';
import { statsService, type AdminStats } from '@/services/statsService';

export function Admin() {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      statsService.getAdminStats()
        .then(data => setStats(data))
        .catch(err => console.error('Failed to load admin stats:', err))
        .finally(() => setStatsLoading(false));
    }
  }, [isAdmin]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

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
          {statsLoading ? (
            <div className="flex items-center justify-center py-8 mb-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPlayers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeMembers} active, {stats.expiredMembers} expired
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingPayment} awaiting payment, {stats.pendingApproval} awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tournaments ({new Date().getFullYear()})</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.tournamentsThisYear}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.clubsCount} registered club{stats.clubsCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">K {stats.revenueThisMonth.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.revenueTransactions} transaction{stats.revenueTransactions !== 1 ? 's' : ''}
                    {stats.revenueChange !== 0 && (
                      <span className={stats.revenueChange > 0 ? ' text-green-600' : ' text-red-600'}>
                        {' '}{stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange}% vs last month
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

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

          {/* Recent Registrations */}
          {stats && stats.recentRegistrations.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold text-foreground mb-4">Recent Registrations</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {stats.recentRegistrations.map((reg, i) => {
                      const statusColor = {
                        pending_payment: 'bg-amber-500',
                        pending_approval: 'bg-blue-500',
                        approved: 'bg-green-500',
                        rejected: 'bg-red-500'
                      }[reg.status] || 'bg-gray-500';
                      const statusLabel = reg.status.replace(/_/g, ' ');
                      const timeAgo = getTimeAgo(reg.createdAt);

                      return (
                        <div key={i} className="flex items-center gap-4 text-sm">
                          <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                          <span className="text-muted-foreground w-28 shrink-0">{timeAgo}</span>
                          <span className="flex-1">
                            {reg.firstName} {reg.lastName} — {reg.membershipTypeName}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">{statusLabel}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
