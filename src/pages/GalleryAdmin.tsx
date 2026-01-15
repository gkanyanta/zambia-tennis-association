import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { galleryService, GalleryImage } from '@/services/galleryService';
import { useNavigate } from 'react-router-dom';

const categories = ['Tournaments', 'Juniors', 'Infrastructure', 'Education', 'Development', 'Madalas', 'Training', 'Slideshow'];

export function GalleryAdmin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Tournaments',
    isSlideshow: false,
    focalPoint: 'top' as 'top' | 'center' | 'bottom',
    order: 0,
    date: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchImages();
  }, [isAdmin, navigate]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const data = await galleryService.getGalleryImages();
      setImages(data);
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile && !editingId) {
      alert('Please select an image');
      return;
    }

    try {
      if (editingId) {
        await galleryService.updateImage(editingId, formData, selectedFile || undefined);
        alert('Image updated successfully!');
      } else {
        if (selectedFile) {
          await galleryService.createImage(formData, selectedFile);
          alert('Image uploaded successfully!');
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        category: 'Tournaments',
        isSlideshow: false,
        focalPoint: 'top',
        order: 0,
        date: ''
      });
      setSelectedFile(null);
      setImagePreview(null);
      await fetchImages();
    } catch (err: any) {
      alert(err.message || 'Failed to save image');
    }
  };

  const handleEdit = (image: GalleryImage) => {
    setFormData({
      title: image.title,
      description: image.description || '',
      category: image.category,
      isSlideshow: image.isSlideshow,
      focalPoint: image.focalPoint || 'center',
      order: image.order,
      date: image.date || ''
    });
    setImagePreview(image.imageUrl);
    setEditingId(image._id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await galleryService.deleteImage(id);
      alert('Image deleted successfully!');
      await fetchImages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  const filteredImages = filterCategory === 'All'
    ? images
    : filterCategory === 'Slideshow'
    ? images.filter(img => img.isSlideshow)
    : images.filter(img => img.category === filterCategory);

  return (
    <div className="flex flex-col min-h-screen">
      <Hero
        title="Gallery & Slideshow Management"
        description="Upload and manage images for the gallery and homepage slideshow"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Image Management
            </h2>
            <Button onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setFormData({
                  title: '',
                  description: '',
                  category: 'Tournaments',
                  isSlideshow: false,
                  focalPoint: 'top',
                  order: 0,
                  date: ''
                });
                setSelectedFile(null);
                setImagePreview(null);
              }
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Cancel' : 'Upload Image'}
            </Button>
          </div>

          {/* Upload Form */}
          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Image' : 'Upload New Image'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image *</label>
                    {!imagePreview ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Choose an image to upload
                        </p>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Image
                        </Button>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center" style={{height: '16rem'}}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        {categories.filter(c => c !== 'Slideshow').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date</label>
                      <Input
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        placeholder="e.g., January 2025"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Order</label>
                      <Input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isSlideshow"
                      checked={formData.isSlideshow}
                      onChange={(e) => setFormData({ ...formData, isSlideshow: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="isSlideshow" className="text-sm font-medium">
                      Show in Homepage Slideshow
                    </label>
                  </div>

                  {/* Focal Point Selector - only shown for slideshow images */}
                  {formData.isSlideshow && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <label className="text-sm font-medium mb-3 block">
                        Image Focal Point
                        <span className="text-xs text-muted-foreground ml-2">
                          (Where should the image focus when cropped?)
                        </span>
                      </label>
                      <div className="flex gap-3">
                        {(['top', 'center', 'bottom'] as const).map((position) => (
                          <button
                            key={position}
                            type="button"
                            onClick={() => setFormData({ ...formData, focalPoint: position })}
                            className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                              formData.focalPoint === position
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted border-input'
                            }`}
                          >
                            {position.charAt(0).toUpperCase() + position.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Choose "Top" for portraits, "Center" for general images, "Bottom" for landscapes with sky
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingId ? 'Update Image' : 'Upload Image'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filterCategory === 'All' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('All')}
            >
              All ({images.length})
            </Button>
            <Button
              variant={filterCategory === 'Slideshow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('Slideshow')}
            >
              Slideshow ({images.filter(i => i.isSlideshow).length})
            </Button>
            {categories.filter(c => c !== 'Slideshow').map(cat => (
              <Button
                key={cat}
                variant={filterCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(cat)}
              >
                {cat} ({images.filter(i => i.category === cat).length})
              </Button>
            ))}
          </div>

          {/* Images Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading images...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No images found. Click "Upload Image" to add one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <Card key={image._id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm line-clamp-2">{image.title}</h4>
                      {image.isSlideshow && (
                        <Badge variant="secondary" className="shrink-0">Slideshow</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{image.category}</p>
                    {image.date && (
                      <p className="text-xs text-muted-foreground mb-3">{image.date}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(image)} className="flex-1">
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(image._id!)} className="flex-1">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
