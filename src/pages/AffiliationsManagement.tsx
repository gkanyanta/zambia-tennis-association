import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, Globe, Loader2 } from 'lucide-react';
import {
  fetchAffiliations,
  createAffiliation,
  updateAffiliation,
  deleteAffiliation,
  Affiliation
} from '@/services/aboutService';
import { uploadService } from '@/services/uploadService';
import { useToast } from '@/hooks/use-toast';

export function AffiliationsManagement() {
  const { toast } = useToast();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState<Affiliation | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    acronym: '',
    description: '',
    logo: '',
    websiteUrl: '',
    category: 'international' as 'international' | 'continental' | 'national' | 'regional',
    displayOrder: 0,
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchAffiliations({});
      setAffiliations(response.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load affiliations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAffiliation(null);
    setFormData({
      name: '',
      acronym: '',
      description: '',
      logo: '',
      websiteUrl: '',
      category: 'international',
      displayOrder: affiliations.length + 1,
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (affiliation: Affiliation) => {
    setEditingAffiliation(affiliation);
    setFormData({
      name: affiliation.name,
      acronym: affiliation.acronym || '',
      description: affiliation.description || '',
      logo: affiliation.logo || '',
      websiteUrl: affiliation.websiteUrl || '',
      category: affiliation.category,
      displayOrder: affiliation.displayOrder,
      isActive: affiliation.isActive
    });
    setShowModal(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size should be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploadingLogo(true);
      const logoUrl = await uploadService.uploadAffiliationLogo(file);
      setFormData({ ...formData, logo: logoUrl });
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAffiliation) {
        await updateAffiliation(editingAffiliation._id, formData);
        toast({
          title: 'Success',
          description: 'Affiliation updated successfully'
        });
      } else {
        await createAffiliation(formData);
        toast({
          title: 'Success',
          description: 'Affiliation created successfully'
        });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to save affiliation',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliation?')) return;

    try {
      await deleteAffiliation(id);
      toast({
        title: 'Success',
        description: 'Affiliation deleted successfully'
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to delete affiliation',
        variant: 'destructive'
      });
    }
  };

  const filteredAffiliations = affiliations.filter((affiliation) => {
    const matchesSearch = affiliation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (affiliation.acronym && affiliation.acronym.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || affiliation.category === filterCategory;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && affiliation.isActive) ||
      (filterStatus === 'inactive' && !affiliation.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero title="Affiliations Management" subtitle="Manage organizational affiliations and partnerships" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name or acronym..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                  <SelectItem value="continental">Continental</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Affiliation
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredAffiliations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No affiliations found
                </CardContent>
              </Card>
            ) : (
              filteredAffiliations.map((affiliation) => (
                <Card key={affiliation._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border flex-shrink-0 p-2">
                        {affiliation.logo ? (
                          <img
                            src={affiliation.logo}
                            alt={affiliation.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Globe className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {affiliation.name}
                              {affiliation.acronym && (
                                <span className="text-gray-600 ml-2">({affiliation.acronym})</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">
                                {affiliation.category.charAt(0).toUpperCase() + affiliation.category.slice(1)}
                              </Badge>
                              <Badge variant={affiliation.isActive ? 'default' : 'outline'}>
                                {affiliation.isActive ? (
                                  <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                )}
                              </Badge>
                              <span className="text-sm text-gray-500">Order: {affiliation.displayOrder}</span>
                            </div>
                            {affiliation.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{affiliation.description}</p>
                            )}
                            {affiliation.websiteUrl && (
                              <a
                                href={affiliation.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline mt-1 inline-block"
                              >
                                Visit Website →
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(affiliation)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(affiliation._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAffiliation ? 'Edit Affiliation' : 'Add Affiliation'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acronym">Acronym</Label>
                  <Input
                    id="acronym"
                    value={formData.acronym}
                    onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                    placeholder="e.g., ITF, CAT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="continental">Continental</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order *</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the organization..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                {formData.logo && (
                  <div className="mb-2">
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      className="w-32 h-32 object-contain border rounded-lg p-2 bg-white"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <p className="text-sm text-gray-500">
                  Recommended: PNG or SVG with transparent background, at least 300x300px
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingLogo}>
                {editingAffiliation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
