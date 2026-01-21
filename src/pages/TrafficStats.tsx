import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  Users,
  Globe,
  Clock,
  Eye,
  MousePointer,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Info,
  Settings
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SEO } from '@/components/SEO'

interface QuickStat {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
}

export function TrafficStats() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const quickStats: QuickStat[] = [
    { label: 'Page Views Today', value: '-', icon: Eye },
    { label: 'Unique Visitors', value: '-', icon: Users },
    { label: 'Avg. Session Duration', value: '-', icon: Clock },
    { label: 'Bounce Rate', value: '-', icon: MousePointer },
  ]

  return (
    <>
      <SEO title="Traffic Statistics" noindex />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container-custom py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <BarChart3 className="h-8 w-8" />
                  Website Traffic & Analytics
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor website performance and visitor statistics
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  Back to Admin
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-custom py-8">
          {/* Setup Instructions */}
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Settings className="h-5 w-5" />
                Google Analytics Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-700 dark:text-amber-300">
              <p className="mb-4">
                To view real traffic statistics, you need to set up Google Analytics:
              </p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Analytics</a> and create an account</li>
                <li>Create a new property for <strong>zambiatennis.com</strong></li>
                <li>Copy your Measurement ID (starts with G-)</li>
                <li>Add <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">VITE_GA_TRACKING_ID=G-XXXXXXXXXX</code> to your Vercel environment variables</li>
                <li>Replace <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">G-XXXXXXXXXX</code> in <code>index.html</code> with your actual ID</li>
                <li>Redeploy the application</li>
              </ol>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.open('https://analytics.google.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Google Analytics
                </Button>
                <Button
                  variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.open('https://vercel.com/gerald-kanyantas-projects/zambia-tennis-association/settings/environment-variables', '_blank')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Vercel Environment Variables
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        {stat.change && (
                          <p className={`text-xs flex items-center gap-1 ${
                            stat.changeType === 'positive' ? 'text-green-600' :
                            stat.changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            {stat.changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
                            {stat.change}
                          </p>
                        )}
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="realtime">Real-time</TabsTrigger>
              <TabsTrigger value="pages">Top Pages</TabsTrigger>
              <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Google Analytics Embed */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Google Analytics Dashboard</CardTitle>
                    <CardDescription>
                      View your complete analytics in Google Analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-12 text-center">
                      <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Access Full Analytics</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        For detailed traffic analysis, audience insights, and conversion tracking,
                        visit the Google Analytics dashboard.
                      </p>
                      <Button
                        onClick={() => window.open('https://analytics.google.com', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Google Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* SEO Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      SEO Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Meta Tags</span>
                        <Badge className="bg-green-500">Configured</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Open Graph</span>
                        <Badge className="bg-green-500">Configured</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Twitter Cards</span>
                        <Badge className="bg-green-500">Configured</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Structured Data</span>
                        <Badge className="bg-green-500">Configured</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Sitemap</span>
                        <Badge className="bg-green-500">Generated</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Robots.txt</span>
                        <Badge className="bg-green-500">Configured</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Search Console */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Search Engine Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Submit your sitemap to search engines for better indexing:
                      </p>
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open('https://search.google.com/search-console', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Google Search Console
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open('https://www.bing.com/webmasters', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Bing Webmaster Tools
                        </Button>
                      </div>
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Your Sitemap URL:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          https://www.zambiatennis.com/sitemap.xml
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="realtime">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Visitors</CardTitle>
                  <CardDescription>
                    Real-time data is available in Google Analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      View real-time visitor data in Google Analytics
                    </p>
                    <Button
                      onClick={() => window.open('https://analytics.google.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Real-time Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                  <CardDescription>
                    Most visited pages on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-12 text-center">
                    <Eye className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Page analytics are available in Google Analytics
                    </p>
                    <Button
                      onClick={() => window.open('https://analytics.google.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Page Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>
                    Where your visitors are coming from
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-12 text-center">
                    <ArrowUpRight className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Traffic source data is available in Google Analytics
                    </p>
                    <Button
                      onClick={() => window.open('https://analytics.google.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Traffic Sources
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Info Card */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">About Website Analytics</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Google Analytics tracking has been configured for your website. Once you add your
                    Measurement ID, you'll be able to track:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Total page views and unique visitors</li>
                    <li>Traffic sources (search engines, social media, direct)</li>
                    <li>Most popular pages and content</li>
                    <li>User demographics and locations</li>
                    <li>Device and browser statistics</li>
                    <li>Conversion tracking for registrations and payments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
