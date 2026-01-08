import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { ExecutiveCard } from '@/components/about/ExecutiveCard';
import { AffiliationCard } from '@/components/about/AffiliationCard';
import { OrganizationalChart } from '@/components/about/OrganizationalChart';
import { Loader2, Users, Globe, LayoutGrid, Network } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  fetchExecutiveMembers,
  fetchAffiliations,
  fetchAboutContent,
  ExecutiveMember,
  Affiliation,
  AboutContent
} from '@/services/aboutService';

export function About() {
  const { toast } = useToast();
  const [executives, setExecutives] = useState<ExecutiveMember[]>([]);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [content, setContent] = useState<{ [key: string]: AboutContent }>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('chart'); // Default to org chart

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    try {
      setLoading(true);

      const [execRes, affRes, contentRes] = await Promise.all([
        fetchExecutiveMembers({ isActive: true }),
        fetchAffiliations({ isActive: true }),
        fetchAboutContent()
      ]);

      setExecutives(execRes.data);
      setAffiliations(affRes.data);

      // Convert content array to object for easy access
      const contentMap: { [key: string]: AboutContent } = {};
      contentRes.data.forEach((item) => {
        contentMap[item.section] = item;
      });
      setContent(contentMap);
    } catch (error: any) {
      console.error('Failed to load about page data:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load page data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Group executives by region
  const nationalLeadership = executives
    .filter((e) => e.region === 'national')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const regionalLeadership = executives
    .filter((e) => e.region !== 'national')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Group affiliations by category
  const internationalAffiliations = affiliations
    .filter((a) => a.category === 'international' || a.category === 'continental')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const nationalAffiliations = affiliations
    .filter((a) => a.category === 'national')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero
        title="About ZTA"
        subtitle="Learn about the Zambia Tennis Association, our leadership, and mission"
      />

      {/* About Section */}
      {content.about && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {content.about.title}
              </h2>
              <div
                className="prose prose-lg mx-auto"
                dangerouslySetInnerHTML={{ __html: content.about.content }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Mission & Vision */}
      {(content.mission || content.vision) && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Mission */}
              {content.mission && (
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold mb-4 text-primary">
                    {content.mission.title}
                  </h2>
                  <div
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: content.mission.content }}
                  />
                </div>
              )}

              {/* Vision */}
              {content.vision && (
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold mb-4 text-primary">
                    {content.vision.title}
                  </h2>
                  <div
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: content.vision.content }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Executive Committee */}
      {executives.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Executive Committee</h2>
              <p className="text-gray-600 mb-6">
                Meet the dedicated leaders of the Zambia Tennis Association
              </p>

              {/* View Mode Toggle */}
              <div className="flex justify-center gap-2">
                <Button
                  variant={viewMode === 'chart' ? 'default' : 'outline'}
                  onClick={() => setViewMode('chart')}
                  className="flex items-center gap-2"
                >
                  <Network className="w-4 h-4" />
                  Organizational Chart
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  onClick={() => setViewMode('cards')}
                  className="flex items-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Card View
                </Button>
              </div>
            </div>

            {/* Organizational Chart View */}
            {viewMode === 'chart' && (
              <OrganizationalChart executives={executives} />
            )}

            {/* Card Grid View */}
            {viewMode === 'cards' && (
              <>
                {/* National Leadership */}
                {nationalLeadership.length > 0 && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-semibold mb-6 text-center">
                      National Leadership
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {nationalLeadership.map((member) => (
                        <ExecutiveCard key={member._id} member={member} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regional Leadership */}
                {regionalLeadership.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-semibold mb-6 text-center">
                      Regional Leadership
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {regionalLeadership.map((member) => (
                        <ExecutiveCard key={member._id} member={member} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Affiliations */}
      {affiliations.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Our Affiliations</h2>
              <p className="text-gray-600">
                Proud members of local and international tennis organizations
              </p>
            </div>

            {/* International & Continental */}
            {internationalAffiliations.length > 0 && (
              <div className="mb-12">
                <h3 className="text-2xl font-semibold mb-6 text-center">
                  International & Continental
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {internationalAffiliations.map((affiliation) => (
                    <AffiliationCard key={affiliation._id} affiliation={affiliation} />
                  ))}
                </div>
              </div>
            )}

            {/* National */}
            {nationalAffiliations.length > 0 && (
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-center">
                  National
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {nationalAffiliations.map((affiliation) => (
                    <AffiliationCard key={affiliation._id} affiliation={affiliation} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* History */}
      {content.history && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {content.history.title}
              </h2>
              <div
                className="prose prose-lg mx-auto"
                dangerouslySetInnerHTML={{ __html: content.history.content }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Objectives */}
      {content.objectives && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {content.objectives.title}
              </h2>
              <div
                className="prose prose-lg mx-auto"
                dangerouslySetInnerHTML={{ __html: content.objectives.content }}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
