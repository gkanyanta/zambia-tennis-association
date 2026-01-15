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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { calendarService, CalendarEvent, CreateCalendarEventData } from '@/services/calendarService';
import { useToast } from '@/hooks/use-toast';

const eventTypes = [
  { value: 'tournament', label: 'Tournament', color: 'bg-blue-500' },
  { value: 'education', label: 'Education', color: 'bg-green-500' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-500' },
  { value: 'social', label: 'Social', color: 'bg-orange-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
];

export function CalendarManagement() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState<CreateCalendarEventData & { published: boolean }>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    type: 'other',
    published: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await calendarService.getAdminEvents();
      setEvents(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load calendar events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      startDate: today,
      endDate: today,
      location: '',
      type: 'other',
      published: true
    });
    setShowModal(true);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      endDate: new Date(event.endDate).toISOString().split('T')[0],
      location: event.location || '',
      type: event.type,
      published: event.published
    });
    setShowModal(true);
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) return;

    try {
      await calendarService.deleteEvent(event._id);
      toast({
        title: 'Success',
        description: 'Event deleted successfully'
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete event',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingEvent) {
        await calendarService.updateEvent(editingEvent._id, formData);
        toast({
          title: 'Success',
          description: 'Event updated successfully'
        });
      } else {
        await calendarService.createEvent(formData);
        toast({
          title: 'Success',
          description: 'Event created successfully'
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save event',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (event: CalendarEvent) => {
    try {
      await calendarService.updateEvent(event._id, { published: !event.published });
      toast({
        title: 'Success',
        description: `Event ${event.published ? 'unpublished' : 'published'} successfully`
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update event',
        variant: 'destructive'
      });
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'published' && event.published) ||
      (filterStatus === 'unpublished' && !event.published);

    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeColor = (type: string) => {
    return eventTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="flex flex-col">
      <Hero
        title="Calendar Management"
        description="Manage events and activities on the ZTA calendar"
        gradient
      />

      <section className="py-8">
        <div className="container-custom">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          {/* Events List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No events found</p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map(event => (
                <Card key={event._id} className={`${!event.published ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Date Badge */}
                      <div className="flex-shrink-0 w-20 text-center hidden md:block">
                        <div className="text-2xl font-bold text-primary">
                          {new Date(event.startDate).getDate()}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {new Date(event.startDate).toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getTypeColor(event.type)} text-white`}>
                              {eventTypes.find(t => t.value === event.type)?.label}
                            </Badge>
                            {!event.published && (
                              <Badge variant="outline">Draft</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateRange(event.startDate, event.endDate)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublished(event)}
                          title={event.published ? 'Unpublish' : 'Publish'}
                        >
                          {event.published ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        </div>
      </section>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Event location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Event Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: CalendarEvent['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Published</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
