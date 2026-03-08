import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Upload, Check } from 'lucide-react';
import { THEME_PRESETS } from './RomanThemeBackgrounds';
import { toast } from 'sonner';

export default function ThemeCustomizer({ user, onThemeChange }) {
  const [selectedPreset, setSelectedPreset] = useState('colosseum');
  const [customName, setCustomName] = useState('');
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#D97706');
  const [secondaryColor, setSecondaryColor] = useState('#8B0000');
  const [accentColor, setAccentColor] = useState('#FEF3C7');
  const [uploading, setUploading] = useState(false);

  const { data: themes } = useQuery({
    queryKey: ['user-themes', user?.email],
    queryFn: () => 
      user?.email 
        ? base44.entities.AppTheme.filter({ user_email: user.email }, null, 50)
        : Promise.resolve([]),
    enabled: !!user?.email
  });

  const saveThemeMutation = useMutation({
    mutationFn: async (themeData) => {
      const response = await base44.functions.invoke('saveUserTheme', {
        theme_name: themeData.theme_name,
        background_preset_id: themeData.background_preset_id,
        custom_background_url: themeData.custom_background_url,
        primary_color: themeData.primary_color,
        secondary_color: themeData.secondary_color,
        accent_color: themeData.accent_color
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Theme saved!');
      if (onThemeChange) onThemeChange(data);
    },
    onError: (error) => {
      toast.error('Failed to save theme: ' + error.message);
    }
  });

  const handleUploadBackground = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await base44.functions.invoke('uploadThemeBackground', {
        file: file
      });
      setCustomBgUrl(response.data.file_url);
      toast.success('Background uploaded!');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTheme = () => {
    if (!customName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    saveThemeMutation.mutate({
      theme_name: customName,
      background_preset_id: !customBgUrl ? selectedPreset : null,
      custom_background_url: customBgUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor
    });
  };

  const handleApplyPreset = (presetId) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomBgUrl('');
      setPrimaryColor(preset.primaryColor);
      setSecondaryColor(preset.secondaryColor);
      setAccentColor(preset.accentColor);
      setCustomName(`${preset.name} - Custom`);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleApplyPreset(preset.id)}
            className={`p-3 rounded border-2 transition ${
              selectedPreset === preset.id && !customBgUrl
                ? 'border-amber-400 bg-amber-950/30'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div 
              className="h-16 rounded mb-2"
              style={{
                backgroundImage: `url('${preset.backgroundUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <p className="text-xs font-semibold text-white">{preset.name}</p>
          </button>
        ))}
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-300">
            <Upload className="w-4 h-4" />
            Custom Background
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadBackground}
              disabled={uploading}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full border-dashed border-2"
              disabled={uploading}
              asChild
            >
              <span>{uploading ? 'Uploading...' : 'Click to Upload Background'}</span>
            </Button>
          </label>
          {customBgUrl && (
            <div className="mt-3 p-2 bg-green-950/30 rounded border border-green-500/30 text-xs text-green-300">
              ✓ Background uploaded
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-300">
            <Palette className="w-4 h-4" />
            Color Scheme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Primary</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Secondary</label>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Accent</label>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <input
          type="text"
          placeholder="Theme name (e.g. 'My Colosseum')"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 mb-3"
        />
        <Button 
          onClick={handleSaveTheme}
          disabled={saveThemeMutation.isPending}
          className="w-full bg-amber-700 hover:bg-amber-600"
        >
          <Check className="w-4 h-4 mr-2" />
          Save Theme
        </Button>
      </div>

      {themes && themes.length > 0 && (
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Saved Themes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className="w-full p-2 rounded bg-white/5 hover:bg-white/10 text-left text-xs text-white transition"
              >
                {theme.theme_name}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}