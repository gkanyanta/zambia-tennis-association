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
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, User, Loader2 } from 'lucide-react';
import {
  fetchExecutiveMembers,
  createExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
  ExecutiveMember
} from '@/services/aboutService';
import { uploadService } from '@/services/uploadService';
import { useToast } from '@/hooks/use-toast';

export function ExecutiveMembersManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<ExecutiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ExecutiveMember | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    profileImage: '',
    bio: '',
    email: '',
    phone: '',
    region: 'national' as 'national' | 'northern' | 'southern' | 'eastern' | 'western',
    displayOrder: 0,
    hierarchyLevel: 0,
    reportsTo: '',
    department: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchExecutiveMembers({});
      setMembers(response.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load executive members',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      position: '',
      profileImage: '',
      bio: '',
      email: '',
      phone: '',
      region: 'national',
      displayOrder: members.length + 1,
      hierarchyLevel: 0,
      reportsTo: '',
      department: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (member: ExecutiveMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      position: member.position,
      profileImage: member.profileImage || '',
      bio: member.bio || '',
      email: member.email || '',
      phone: member.phone || '',
      region: member.region,
      displayOrder: member.displayOrder,
      hierarchyLevel: member.hierarchyLevel || 0,
      reportsTo: member.reportsTo || '',
      department: member.department || '',
      startDate: member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: member.endDate ? new Date(member.endDate).toISOString().split('T')[0] : '',
      isActive: member.isActive
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadingImage(true);
      const imageUrl = await uploadService.uploadExecutiveMemberImage(file);
      setFormData({ ...formData, profileImage: imageUrl });
      toast({
        title: 'Success',
        description: 'Image uploaded successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const memberData = {
        ...formData,
        reportsTo: formData.reportsTo || null,
        department: formData.department || undefined,
        startDate: formData.startDate ? formData.startDate : undefined,
        endDate: formData.endDate ? formData.endDate : undefined
      };

      if (editingMember) {
        await updateExecutiveMember(editingMember._id, memberData);
        toast({
          title: 'Success',
          description: 'Executive member updated successfully'
        });
      } else {
        await createExecutiveMember(memberData);
        toast({
          title: 'Success',
          description: 'Executive member created successfully'
        });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to save executive member',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this executive member?')) return;

    try {
      await deleteExecutiveMember(id);
      toast({
        title: 'Success',
        description: 'Executive member deleted successfully'
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to delete executive member',
        variant: 'destructive'
      });
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = filterRegion === 'all' || member.region === filterRegion;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && member.isActive) ||
      (filterStatus === 'inactive' && !member.isActive);

    return matchesSearch && matchesRegion && matchesStatus;
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
      <Hero title="Executive Members Management" subtitle="Manage executive committee members" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="northern">Northern</SelectItem>
                  <SelectItem value="southern">Southern</SelectItem>
                  <SelectItem value="eastern">Eastern</SelectItem>
                  <SelectItem value="western">Western</SelectItem>
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
              Add Member
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No executive members found
                </CardContent>
              </Card>
            ) : (
              filteredMembers.map((member) => (
                <Card key={member._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {member.profileImage ? (
                          <img
                            src={member.profileImage}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">{member.name}</h3>
                            <p className="text-gray-600">{member.position}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={member.region === 'national' ? 'default' : 'secondary'}>
                                {member.region.charAt(0).toUpperCase() + member.region.slice(1)}
                              </Badge>
                              <Badge variant={member.isActive ? 'default' : 'outline'}>
                                {member.isActive ? (
                                  <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                )}
                              </Badge>
                              <span className="text-sm text-gray-500">Order: {member.displayOrder}</span>
                            </div>
                            {member.bio && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{member.bio}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(member)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(member._id)}
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
              {editingMember ? 'Edit Executive Member' : 'Add Executive Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value: any) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="northern">Northern</SelectItem>
                      <SelectItem value="southern">Southern</SelectItem>
                      <SelectItem value="eastern">Eastern</SelectItem>
                      <SelectItem value="western">Western</SelectItem>
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

              {/* Organizational Hierarchy Section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Organizational Hierarchy</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hierarchyLevel">Hierarchy Level</Label>
                    <Select
                      value={formData.hierarchyLevel.toString()}
                      onValueChange={(value) => setFormData({ ...formData, hierarchyLevel: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - President/CEO</SelectItem>
                        <SelectItem value="1">1 - Vice President</SelectItem>
                        <SelectItem value="2">2 - Director</SelectItem>
                        <SelectItem value="3">3 - Manager</SelectItem>
                        <SelectItem value="4">4 - Coordinator</SelectItem>
                        <SelectItem value="5">5 - Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportsTo">Reports To</Label>
                    <Select
                      value={formData.reportsTo}
                      onValueChange={(value) => setFormData({ ...formData, reportsTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (Top Level)</SelectItem>
                        {members
                          .filter(m => m._id !== editingMember?._id)
                          .sort((a, b) => (a.hierarchyLevel || 0) - (b.hierarchyLevel || 0))
                          .map(member => (
                            <SelectItem key={member._id} value={member._id}>
                              {member.name} ({member.position})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Technical, Marketing"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  placeholder="Brief biography..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileImage">Profile Image</Label>
                {formData.profileImage && (
                  <div className="mb-2">
                    <img
                      src={formData.profileImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <p className="text-sm text-gray-500">
                  Recommended: Square image, at least 400x400px
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingImage}>
                {editingMember ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
