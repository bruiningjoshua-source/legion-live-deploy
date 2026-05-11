import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  Video, 
  X,
  Plus,
  ShoppingBag,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_TYPES = [
  { value: 'physical_product', label: 'Physical Product' },
  { value: 'digital_product', label: 'Digital Product' },
  { value: 'service', label: 'Service' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'course', label: 'Course/Education' },
  { value: 'software', label: 'Software/App' },
  { value: 'other', label: 'Other' }
];

const CATEGORIES = [
  { value: 'tech', label: 'Technology' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'beauty', label: 'Beauty & Skincare' },
  { value: 'fitness', label: 'Fitness & Sports' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'finance', label: 'Finance & Investing' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'travel', label: 'Travel' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' }
];

const INTERESTS = [
  'Budget-Friendly', 'Premium', 'Eco-Friendly', 'Luxury', 'DIY', 'Professional',
  'Beginner', 'Family', 'Solo', 'Outdoor', 'Indoor', 'Trending', 'Classic', 
  'Innovative', 'Handmade', 'Tech-Savvy', 'Minimalist', 'Bold'
];

export default function AffiliateVideoUpload({ isOpen, onClose, partnerId, onSuccess }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    video_type: 'long_form',
    brand_name: '',
    product_type: '',
    service_type: '',
    category: '',
    interests: [],
    product_link: '',
    promo_code: '',
    discount_info: '',
    price_usd: 0,
    info_section: {
      custom_header: '',
      about_product: '',
      key_features: [],
      affiliate_disclosure: 'This video contains affiliate links. I may earn a commission on purchases.',
      contact_info: ''
    }
  });

  const [newFeature, setNewFeature] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title || !formData.brand_name || !formData.video_url) {
        throw new Error('Please fill in required fields');
      }

      return base44.entities.AffiliateVideo.create({
        ...formData,
        partner_id: partnerId,
        is_published: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-videos']);
      toast.success('Video uploaded successfully!');
      onSuccess?.();
      onClose();
      resetForm();
    },
    onError: (error) => toast.error(error.message)
  });

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await base44.integrations.Core.UploadFile({ file });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setFormData({ ...formData, video_url: result.file_url });
      toast.success('Video uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, thumbnail_url: result.file_url });
  };

  const addFeature = () => {
    if (newFeature && formData.info_section.key_features.length < 10) {
      setFormData({
        ...formData,
        info_section: {
          ...formData.info_section,
          key_features: [...formData.info_section.key_features, newFeature]
        }
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      info_section: {
        ...formData.info_section,
        key_features: formData.info_section.key_features.filter((_, i) => i !== index)
      }
    });
  };

  const toggleInterest = (interest) => {
    const current = formData.interests || [];
    if (current.includes(interest)) {
      setFormData({ ...formData, interests: current.filter(i => i !== interest) });
    } else if (current.length < 5) {
      setFormData({ ...formData, interests: [...current, interest] });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      video_type: 'long_form',
      brand_name: '',
      product_type: '',
      service_type: '',
      category: '',
      interests: [],
      product_link: '',
      promo_code: '',
      discount_info: '',
      price_usd: 0,
      info_section: {
        custom_header: '',
        about_product: '',
        key_features: [],
        affiliate_disclosure: 'This video contains affiliate links. I may earn a commission on purchases.',
        contact_info: ''
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-amber-600/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-400" />
            Upload Product/Service Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Upload */}
          <div className="space-y-2">
            <Label className="text-amber-200">Video File *</Label>
            {formData.video_url ? (
              <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                <Video className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm flex-1">Video uploaded</span>
                <button onClick={() => setFormData({ ...formData, video_url: '' })}>
                  <X className="w-4 h-4 text-green-400" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-600/30 rounded-lg cursor-pointer hover:border-amber-500/50">
                {uploading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
                    <span className="text-amber-400 text-sm">{uploadProgress}%</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-amber-400/50 mb-2" />
                    <span className="text-amber-400/70 text-sm">Click to upload video</span>
                  </>
                )}
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </label>
            )}
          </div>

          {/* Video Type */}
          <div className="flex gap-4">
            <button
              onClick={() => setFormData({ ...formData, video_type: 'short' })}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.video_type === 'short'
                  ? 'bg-amber-600/20 border-amber-500'
                  : 'border-amber-600/20 hover:border-amber-500/50'
              }`}
            >
              <p className="text-amber-100 font-semibold">Short</p>
              <p className="text-amber-400/60 text-xs">Under 60 seconds</p>
            </button>
            <button
              onClick={() => setFormData({ ...formData, video_type: 'long_form' })}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.video_type === 'long_form'
                  ? 'bg-amber-600/20 border-amber-500'
                  : 'border-amber-600/20 hover:border-amber-500/50'
              }`}
            >
              <p className="text-amber-100 font-semibold">Long Form</p>
              <p className="text-amber-400/60 text-xs">Full reviews & demos</p>
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-amber-200">Video Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Amazing Product Review..."
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Brand Name *</Label>
              <Input
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Product/Service Type</Label>
              <Select value={formData.product_type} onValueChange={(v) => setFormData({ ...formData, product_type: v })}>
                <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {PRODUCT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-amber-100">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-amber-100">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200">Price (USD)</Label>
              <Input
                type="number"
                value={formData.price_usd}
                onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-amber-200">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the product/service..."
              className="bg-stone-800 border-amber-600/20 text-amber-100 min-h-[80px]"
            />
          </div>

          {/* Interests/Tags */}
          <div className="space-y-2">
            <Label className="text-amber-200">Interests/Tags (select up to 5)</Label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    formData.interests?.includes(interest)
                      ? 'bg-green-600 text-white'
                      : 'bg-stone-700/50 text-amber-300 hover:bg-stone-700'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Affiliate Links */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-amber-200">Product Link</Label>
              <Input
                value={formData.product_link}
                onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
                placeholder="https://..."
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-amber-200">Promo Code</Label>
              <Input
                value={formData.promo_code}
                onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                placeholder="SAVE20"
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>
          </div>

          {/* Info Section */}
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-100 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Custom Info Section (Below Video)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-amber-200 text-xs">Section Header</Label>
                <Input
                  value={formData.info_section.custom_header}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    info_section: { ...formData.info_section, custom_header: e.target.value }
                  })}
                  placeholder="About This Product"
                  className="bg-stone-900 border-amber-600/20 text-amber-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-amber-200 text-xs">About Product/Service</Label>
                <Textarea
                  value={formData.info_section.about_product}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    info_section: { ...formData.info_section, about_product: e.target.value }
                  })}
                  placeholder="Detailed information..."
                  className="bg-stone-900 border-amber-600/20 text-amber-100 min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-amber-200 text-xs">Key Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button onClick={addFeature} size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.info_section.key_features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.info_section.key_features.map((f, i) => (
                      <Badge key={i} className="bg-green-600/20 text-green-300 border-green-500/30">
                        {f}
                        <button onClick={() => removeFeature(i)} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-amber-200 text-xs">Affiliate Disclosure</Label>
                <Textarea
                  value={formData.info_section.affiliate_disclosure}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    info_section: { ...formData.info_section, affiliate_disclosure: e.target.value }
                  })}
                  className="bg-stone-900 border-amber-600/20 text-amber-100 min-h-[40px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label className="text-amber-200">Thumbnail</Label>
            <div className="flex items-center gap-4">
              {formData.thumbnail_url ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                  <img src={formData.thumbnail_url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="w-32 h-20 border-2 border-dashed border-amber-600/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-amber-500/50">
                  <Upload className="w-5 h-5 text-amber-400/50" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!formData.title || !formData.brand_name || !formData.video_url || uploadMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Publish Video'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}