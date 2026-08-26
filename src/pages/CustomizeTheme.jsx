import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Palette, 
  Upload, 
  Download, 
  Save, 
  RotateCcw,
  Sparkles,
  Type,
  Layout,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_THEME = {
  primaryColor: '#d97706',
  secondaryColor: '#44403c',
  backgroundColor: '#0c0a09',
  cardColor: '#1c1917',
  textColor: '#fef3c7',
  accentColor: '#fbbf24',
  borderRadius: 12,
  fontFamily: 'system-ui',
  darkMode: true,
  customCss: ''
};

const PRESET_THEMES = [
  { name: 'Legion Gold (Default)', ...DEFAULT_THEME },
  { name: 'Crimson Empire', primaryColor: '#dc2626', accentColor: '#f87171', backgroundColor: '#1c1917' },
  { name: 'Imperial Purple', primaryColor: '#7c3aed', accentColor: '#a78bfa', backgroundColor: '#1e1b2e' },
  { name: 'Ocean Blue', primaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#0c1929' },
  { name: 'Forest Green', primaryColor: '#16a34a', accentColor: '#4ade80', backgroundColor: '#0f1a14' },
  { name: 'Midnight', primaryColor: '#6366f1', accentColor: '#818cf8', backgroundColor: '#0f0f1a' },
  { name: 'Sunset Orange', primaryColor: '#ea580c', accentColor: '#fb923c', backgroundColor: '#1a0f0c' },
  { name: 'Rose Gold', primaryColor: '#e11d48', accentColor: '#fb7185', backgroundColor: '#1a0f14' },
];

const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System Default' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Georgia, serif', label: 'Georgia' },
];

export default function CustomizeTheme() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [previewMode, setPreviewMode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: savedTheme } = useQuery({
    queryKey: ['user-theme', user?.email],
    queryFn: async () => {
      const themes = await base44.entities.CreatorTheme.filter({ user_email: user.email }, '-updated_date', 1);
      return themes[0] || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (savedTheme?.theme_data) {
      setTheme({ ...DEFAULT_THEME, ...savedTheme.theme_data });
    }
  }, [savedTheme]);

  // Default OFF: the theme only styles the creator's own profile/stream pages
  // (via ThemeScope), never the visitor's whole app. Turning this on ALSO
  // pushes the accent globally via the existing accentTheme mechanism — that
  // one is a real, intentional app-wide override (same as the Settings
  // customizer), so it's opt-in here rather than automatic.
  const [applyEverywhere, setApplyEverywhere] = useState(!!savedTheme?.theme_data?.applyEverywhere);
  useEffect(() => {
    setApplyEverywhere(!!savedTheme?.theme_data?.applyEverywhere);
  }, [savedTheme]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const theme_data = { ...theme, applyEverywhere };
      if (savedTheme) {
        return base44.entities.CreatorTheme.update(savedTheme.id, { theme_data });
      } else {
        return base44.entities.CreatorTheme.create({
          user_email: user.email,
          theme_name: 'My Theme',
          theme_data
        });
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['user-theme'] });
      // Opt-in global push, using the SAME mechanism the Settings accent
      // picker already uses correctly — not a separate/competing system.
      if (applyEverywhere) {
        const { applyAccentColor } = await import('@/lib/accentTheme');
        applyAccentColor(theme.accentColor);
        localStorage.setItem('legion_accent_color', theme.accentColor);
      }
      toast.success(applyEverywhere ? 'Theme saved — applied to your whole app' : 'Theme saved for your profile/stream');
    }
  });

  const handleExport = () => {
    const dataStr = JSON.stringify(theme, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'legion-theme.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Theme exported!');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          setTheme({ ...DEFAULT_THEME, ...imported });
          toast.success('Theme imported!');
        } catch (error) {
          toast.error('Invalid theme file');
        }
      };
      reader.readAsText(file);
    }
  };

  const applyPreset = (preset) => {
    setTheme({ ...DEFAULT_THEME, ...preset });
    toast.success(`Applied ${preset.name} theme`);
  };

  return (
    <div className="min-h-screen bg-[#050508] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">Customization</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Customize Your Experience</h1>
          <p className="text-amber-400/70">Personalize the platform to match your style - completely free!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customization Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="colors" className="space-y-4">
              <TabsList className="bg-stone-800/50 border border-amber-600/20">
                <TabsTrigger value="colors" className="data-[state=active]:bg-amber-600">
                  <Palette className="w-4 h-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="typography" className="data-[state=active]:bg-amber-600">
                  <Type className="w-4 h-4 mr-2" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="layout" className="data-[state=active]:bg-amber-600">
                  <Layout className="w-4 h-4 mr-2" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="presets" className="data-[state=active]:bg-amber-600">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Presets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Color Scheme</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-amber-200">Primary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={theme.primaryColor}
                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                            className="w-12 h-10 p-1 bg-transparent border-amber-600/20"
                          />
                          <Input
                            value={theme.primaryColor}
                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-200">Accent Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={theme.accentColor}
                            onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                            className="w-12 h-10 p-1 bg-transparent border-amber-600/20"
                          />
                          <Input
                            value={theme.accentColor}
                            onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-200">Background Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={theme.backgroundColor}
                            onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                            className="w-12 h-10 p-1 bg-transparent border-amber-600/20"
                          />
                          <Input
                            value={theme.backgroundColor}
                            onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-200">Card Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={theme.cardColor}
                            onChange={(e) => setTheme({ ...theme, cardColor: e.target.value })}
                            className="w-12 h-10 p-1 bg-transparent border-amber-600/20"
                          />
                          <Input
                            value={theme.cardColor}
                            onChange={(e) => setTheme({ ...theme, cardColor: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-200">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={theme.textColor}
                            onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                            className="w-12 h-10 p-1 bg-transparent border-amber-600/20"
                          />
                          <Input
                            value={theme.textColor}
                            onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="typography">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Typography</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-amber-200">Font Family</Label>
                      <Select 
                        value={theme.fontFamily} 
                        onValueChange={(v) => setTheme({ ...theme, fontFamily: v })}
                      >
                        <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-stone-900 border-amber-600/30">
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.value} value={font.value} className="text-amber-100">
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Layout Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-amber-200">Border Radius: {theme.borderRadius}px</Label>
                      <Slider
                        value={[theme.borderRadius]}
                        onValueChange={([v]) => setTheme({ ...theme, borderRadius: v })}
                        min={0}
                        max={24}
                        step={1}
                        className="mt-2 [&_[role=slider]]:bg-amber-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-amber-200">Dark Mode</Label>
                      <Switch
                        checked={theme.darkMode}
                        onCheckedChange={(v) => setTheme({ ...theme, darkMode: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="presets">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Theme Presets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PRESET_THEMES.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => applyPreset(preset)}
                          className="p-3 rounded-lg border border-amber-600/20 hover:border-amber-500/50 transition-all text-center"
                          style={{ 
                            background: `linear-gradient(135deg, ${preset.primaryColor}40, ${preset.backgroundColor || '#1c1917'})` 
                          }}
                        >
                          <div 
                            className="w-8 h-8 rounded-full mx-auto mb-2"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span className="text-amber-100 text-xs">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Where this theme applies */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3">
              <div>
                <p className="text-white text-sm font-semibold">Apply everywhere in the app</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {applyEverywhere
                    ? 'This will also become your personal app-wide accent color.'
                    : 'Off: only styles your own profile and stream pages for visitors.'}
                </p>
              </div>
              <Switch checked={applyEverywhere} onCheckedChange={setApplyEverywhere} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Theme'}
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-amber-600/30 text-amber-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <label>
                <Button
                  variant="outline"
                  className="border-amber-600/30 text-amber-300 cursor-pointer"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
              <Button
                onClick={() => setTheme(DEFAULT_THEME)}
                variant="outline"
                className="border-amber-600/30 text-amber-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <Card className="bg-stone-800/30 border-amber-600/20 sticky top-24">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="rounded-lg overflow-hidden border"
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor + '40',
                    borderRadius: theme.borderRadius,
                    fontFamily: theme.fontFamily
                  }}
                >
                  {/* Mini Preview */}
                  <div className="p-3" style={{ backgroundColor: theme.cardColor }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <div>
                        <div style={{ color: theme.textColor, fontSize: '12px', fontWeight: 600 }}>
                          Creator Name
                        </div>
                        <div style={{ color: theme.textColor + '99', fontSize: '10px' }}>
                          Live Now
                        </div>
                      </div>
                    </div>
                    <div 
                      className="h-24 rounded mb-2"
                      style={{ 
                        backgroundColor: theme.backgroundColor,
                        borderRadius: theme.borderRadius / 2
                      }}
                    />
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 rounded text-xs text-white"
                        style={{ 
                          backgroundColor: theme.primaryColor,
                          borderRadius: theme.borderRadius / 2
                        }}
                      >
                        Follow
                      </button>
                      <button 
                        className="px-3 py-1 rounded text-xs"
                        style={{ 
                          backgroundColor: theme.accentColor + '30',
                          color: theme.accentColor,
                          borderRadius: theme.borderRadius / 2
                        }}
                      >
                        Gift
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-amber-400/60 text-xs mt-3 text-center">
                  Theme changes are applied to your profile view
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}