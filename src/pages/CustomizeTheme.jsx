import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload, Save, Eye, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomizeTheme() {
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: theme } = useQuery({
    queryKey: ['creator-theme', creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      const themes = await base44.entities.CreatorTheme.filter({ creator_id: creator.id }, null, 1);
      return themes[0] || null;
    },
    enabled: !!creator?.id
  });

  const [formData, setFormData] = useState({
    profile_background_url: theme?.profile_background_url || '',
    stream_overlay_url: theme?.stream_overlay_url || '',
    brand_color_primary: theme?.brand_color_primary || '#C9A227',
    brand_color_secondary: theme?.brand_color_secondary || '#8B0000',
    font_style: theme?.font_style || 'roman',
    chat_theme: theme?.chat_theme || 'dark'
  });

  const saveThemeMutation = useMutation({
    mutationFn: async (data) => {
      if (theme) {
        return base44.entities.CreatorTheme.update(theme.id, data);
      } else {
        return base44.entities.CreatorTheme.create({
          creator_id: creator.id,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['creator-theme']);
      toast.success('Theme saved successfully!');
    }
  });

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: result.file_url });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Palette className="w-8 h-8 text-amber-400" />
            Customize Your Brand
          </h1>
          <p className="text-amber-400/70">Personalize your profile and stream appearance</p>
        </div>

        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="images">Images & Overlays</TabsTrigger>
            <TabsTrigger value="fonts">Typography</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="colors">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Brand Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-amber-200">Primary Color</Label>
                  <div className="flex gap-4">
                    <Input
                      type="color"
                      value={formData.brand_color_primary}
                      onChange={(e) => setFormData({ ...formData, brand_color_primary: e.target.value })}
                      className="w-20 h-12"
                    />
                    <Input
                      value={formData.brand_color_primary}
                      onChange={(e) => setFormData({ ...formData, brand_color_primary: e.target.value })}
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200">Secondary Color</Label>
                  <div className="flex gap-4">
                    <Input
                      type="color"
                      value={formData.brand_color_secondary}
                      onChange={(e) => setFormData({ ...formData, brand_color_secondary: e.target.value })}
                      className="w-20 h-12"
                    />
                    <Input
                      value={formData.brand_color_secondary}
                      onChange={(e) => setFormData({ ...formData, brand_color_secondary: e.target.value })}
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Images & Overlays</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-amber-200">Profile Background</Label>
                  {formData.profile_background_url && (
                    <img src={formData.profile_background_url} className="w-full h-40 object-cover rounded-lg" alt="Background" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer p-4 border-2 border-dashed border-amber-600/30 rounded-lg hover:border-amber-500/50 transition-colors">
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-200">Upload Background Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'profile_background_url')} />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200">Stream Overlay</Label>
                  {formData.stream_overlay_url && (
                    <img src={formData.stream_overlay_url} className="w-full h-40 object-cover rounded-lg" alt="Overlay" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer p-4 border-2 border-dashed border-amber-600/30 rounded-lg hover:border-amber-500/50 transition-colors">
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-200">Upload Stream Overlay (PNG with transparency)</span>
                    <input type="file" accept="image/png" className="hidden" onChange={(e) => handleUpload(e, 'stream_overlay_url')} />
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fonts">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['roman', 'modern', 'elegant', 'bold'].map(style => (
                    <button
                      key={style}
                      onClick={() => setFormData({ ...formData, font_style: style })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.font_style === style
                          ? 'border-amber-500 bg-amber-600/20'
                          : 'border-amber-600/20 bg-stone-900/50'
                      }`}
                    >
                      <p className="text-amber-100 capitalize font-semibold">{style}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview Your Theme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-8 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${formData.brand_color_primary}20, ${formData.brand_color_secondary}20)`
                  }}
                >
                  <h2 
                    className="text-3xl font-bold mb-4"
                    style={{ color: formData.brand_color_primary }}
                  >
                    {creator?.display_name || 'Your Channel'}
                  </h2>
                  <p 
                    className="text-lg"
                    style={{ color: formData.brand_color_secondary }}
                  >
                    This is how your customized brand will look!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => saveThemeMutation.mutate(formData)}
            disabled={saveThemeMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveThemeMutation.isPending ? 'Saving...' : 'Save Theme'}
          </Button>
        </div>
      </div>
    </div>
  );
}