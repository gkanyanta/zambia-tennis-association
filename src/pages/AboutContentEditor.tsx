import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, FileText, Loader2 } from 'lucide-react';
import {
  fetchAboutContent,
  updateContentSection,
  AboutContent
} from '@/services/aboutService';
import { useToast } from '@/hooks/use-toast';

const SECTIONS = [
  { key: 'about', label: 'About', description: 'Main about section introducing ZTA' },
  { key: 'mission', label: 'Mission', description: 'Organization mission statement' },
  { key: 'vision', label: 'Vision', description: 'Organization vision statement' },
  { key: 'history', label: 'History', description: 'History and background of ZTA' },
  { key: 'objectives', label: 'Objectives', description: 'Key objectives and goals' }
];

export function AboutContentEditor() {
  const { toast } = useToast();
  const [content, setContent] = useState<{ [key: string]: AboutContent }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('about');

  const [formData, setFormData] = useState<{ [key: string]: { title: string; content: string } }>({
    about: { title: '', content: '' },
    mission: { title: '', content: '' },
    vision: { title: '', content: '' },
    history: { title: '', content: '' },
    objectives: { title: '', content: '' }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchAboutContent();
      const contentMap: { [key: string]: AboutContent } = {};
      const formDataMap: { [key: string]: { title: string; content: string } } = {};

      response.data.forEach((item) => {
        contentMap[item.section] = item;
        formDataMap[item.section] = {
          title: item.title,
          content: item.content
        };
      });

      setContent(contentMap);
      setFormData({ ...formData, ...formDataMap });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load about content',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    try {
      setSaving(section);
      await updateContentSection(section, {
        title: formData[section].title,
        content: formData[section].content
      });
      toast({
        title: 'Success',
        description: `${SECTIONS.find(s => s.key === section)?.label} section updated successfully`
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to save content',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const updateFormData = (section: string, field: 'title' | 'content', value: string) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero title="About Content Editor" subtitle="Manage content sections for the About page" />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-6">
              {SECTIONS.map((section) => (
                <TabsTrigger key={section.key} value={section.key}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {SECTIONS.map((section) => (
              <TabsContent key={section.key} value={section.key}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {section.label} Section
                    </CardTitle>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${section.key}-title`}>Section Title</Label>
                        <Input
                          id={`${section.key}-title`}
                          value={formData[section.key]?.title || ''}
                          onChange={(e) => updateFormData(section.key, 'title', e.target.value)}
                          placeholder="Enter section title..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${section.key}-content`}>Content (HTML)</Label>
                        <Textarea
                          id={`${section.key}-content`}
                          value={formData[section.key]?.content || ''}
                          onChange={(e) => updateFormData(section.key, 'content', e.target.value)}
                          rows={15}
                          className="font-mono text-sm"
                          placeholder="Enter HTML content..."
                        />
                        <p className="text-sm text-gray-500">
                          You can use HTML tags like &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="border rounded-lg p-4 bg-white min-h-[200px]">
                          <h3 className="text-xl font-bold mb-4">{formData[section.key]?.title}</h3>
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: formData[section.key]?.content || '' }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleSave(section.key)}
                          disabled={saving === section.key}
                          className="gap-2"
                        >
                          {saving === section.key ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>HTML Formatting Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Common Tags:</h4>
                  <ul className="space-y-1 text-gray-600 font-mono">
                    <li>&lt;p&gt;Paragraph text&lt;/p&gt;</li>
                    <li>&lt;strong&gt;Bold text&lt;/strong&gt;</li>
                    <li>&lt;em&gt;Italic text&lt;/em&gt;</li>
                    <li>&lt;br /&gt; - Line break</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Lists:</h4>
                  <ul className="space-y-1 text-gray-600 font-mono">
                    <li>&lt;ul&gt; - Unordered list</li>
                    <li>&lt;ol&gt; - Ordered list</li>
                    <li>&lt;li&gt;List item&lt;/li&gt;</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Tip:</strong> Test your changes using the preview before saving. The content will appear on the public About page exactly as shown in the preview.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
