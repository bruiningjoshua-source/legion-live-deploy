import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Sparkles, 
  Image as ImageIcon,
  Palette,
  Contrast,
  Sun,
  Droplets,
  ZoomIn,
  Upload,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const filters = [
  { id: 'none', name: 'None', icon: '🚫' },
  { id: 'warm', name: 'Roman Gold', icon: '🏛️', filter: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'vintage', name: 'Ancient Scroll', icon: '📜', filter: 'sepia(0.5) contrast(1.1)' },
  { id: 'bronze', name: 'Bronze Age', icon: '🥉', filter: 'sepia(0.4) saturate(1.2) brightness(1.1)' },
  { id: 'imperial', name: 'Imperial Purple', icon: '💜', filter: 'hue-rotate(270deg) saturate(1.3)' },
  { id: 'dramatic', name: 'Colosseum', icon: '⚔️', filter: 'contrast(1.3) brightness(0.9) saturate(1.2)' },
  { id: 'cool', name: 'Ice Legion', icon: '❄️', filter: 'hue-rotate(180deg) saturate(0.8) brightness(1.1)' },
  { id: 'noir', name: 'Shadow', icon: '🌑', filter: 'grayscale(0.8) contrast(1.4) brightness(0.85)' },
  { id: 'sunset', name: 'Golden Hour', icon: '🌅', filter: 'sepia(0.2) saturate(1.6) hue-rotate(-20deg) brightness(1.05)' },
  { id: 'neon', name: 'Neon Nights', icon: '💫', filter: 'saturate(2) contrast(1.2) brightness(1.1)' },
  { id: 'vintage_film', name: 'Old Film', icon: '🎬', filter: 'sepia(0.6) contrast(0.9) brightness(1.1) saturate(0.7)' },
  { id: 'forest', name: 'Forest', icon: '🌲', filter: 'hue-rotate(60deg) saturate(1.1) brightness(0.95)' },
];

const backgrounds = [
  { id: 'none', name: 'None', preview: '🚫' },
  { id: 'forum', name: 'Roman Forum', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800' },
  { id: 'colosseum', name: 'Colosseum', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800' },
  { id: 'temple', name: 'Temple', url: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800' },
  { id: 'pillars', name: 'Marble Pillars', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800' },
  { id: 'mosaic', name: 'Roman Mosaic', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
];

export default function HostControls({ videoRef, onSettingsChange, onMirrorChange, initialMirror = true, onBackgroundChange }) {
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState('');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [zoom, setZoom] = useState(0.5);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCustomBackgroundUrl(result.file_url);
      setSelectedBackground('custom');
      onBackgroundChange?.(result.file_url);
      toast.success('Background uploaded!');
    } catch (error) {
      toast.error('Failed to upload background');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setIsUploading(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setCustomBackgroundUrl(result.file_url);
        setSelectedBackground('custom');
        onBackgroundChange?.(result.file_url);
        toast.success('Background uploaded!');
      } catch (error) {
        toast.error('Failed to upload background');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const applySettings = () => {
    if (!videoRef?.current) return;

    let filterStr = '';
    
    // Add selected preset filter
    const filter = filters.find(f => f.id === selectedFilter);
    if (filter?.filter) {
      filterStr = filter.filter;
    }
    
    // Add custom adjustments
    filterStr += ` brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    
    videoRef.current.style.filter = filterStr;
    
    // Apply zoom using scale transform
    videoRef.current.style.transform = `scaleX(${mirrorEnabled ? -1 : 1}) scale(${zoom})`;
    
    // Notify parent of mirror change
    onMirrorChange?.(mirrorEnabled);
    
    onSettingsChange?.({
      mirror: mirrorEnabled,
      filter: selectedFilter,
      background: selectedBackground,
      brightness,
      contrast,
      saturation,
      zoom
    });
  };

  React.useEffect(() => {
    applySettings();
  }, [mirrorEnabled, selectedFilter, selectedBackground, brightness, contrast, saturation, zoom]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-amber-600/30 text-amber-300 hover:bg-amber-800/20"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-stone-900 border-amber-600/30 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-amber-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Stream Effects
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Mirror Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-amber-200">Mirror Camera</Label>
              <Switch
                checked={mirrorEnabled}
                onCheckedChange={setMirrorEnabled}
              />
            </div>
            <p className="text-xs text-amber-400/60">Flip video horizontally</p>
          </div>

          {/* Preset Filters */}
          <div className="space-y-3">
            <Label className="text-amber-200 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Themed Filters
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={selectedFilter === filter.id ? "default" : "outline"}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`h-auto py-3 flex flex-col gap-1 ${
                    selectedFilter === filter.id
                      ? "bg-amber-600 text-white"
                      : "border-amber-600/30 text-amber-300 hover:bg-amber-800/20"
                  }`}
                >
                  <span className="text-2xl">{filter.icon}</span>
                  <span className="text-xs">{filter.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Camera Zoom */}
          <div className="space-y-3">
            <Label className="text-amber-200 flex items-center gap-2">
              <ZoomIn className="w-4 h-4" />
              Camera Distance
            </Label>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-amber-300">Zoom</span>
                <span className="text-sm text-amber-400">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="[&_[role=slider]]:bg-amber-500"
              />
              <p className="text-xs text-amber-400/60">Lower = further back, Higher = closer in</p>
            </div>
          </div>

          {/* Custom Adjustments */}
          <div className="space-y-4">
            <Label className="text-amber-200 flex items-center gap-2">
              <Contrast className="w-4 h-4" />
              Custom Adjustments
            </Label>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-amber-300">Brightness</span>
                  <span className="text-sm text-amber-400">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-amber-300">Contrast</span>
                  <span className="text-sm text-amber-400">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-amber-300">Saturation</span>
                  <span className="text-sm text-amber-400">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  onValueChange={([v]) => setSaturation(v)}
                  min={0}
                  max={200}
                  step={1}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Virtual Backgrounds */}
          <div className="space-y-3">
            <Label className="text-amber-200 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Virtual Backgrounds
            </Label>
            
            {/* Upload Custom Background */}
            <div 
              className="border-2 border-dashed border-amber-600/30 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-amber-400 text-sm">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-amber-400/70 mx-auto mb-2" />
                  <p className="text-amber-400/70 text-xs">Drop PNG/JPG here or click to upload</p>
                </>
              )}
            </div>

            {/* Custom Uploaded Background */}
            {customBackgroundUrl && (
              <div className="relative">
                <Button
                  variant={selectedBackground === 'custom' ? "default" : "outline"}
                  onClick={() => setSelectedBackground('custom')}
                  className={`w-full h-20 overflow-hidden relative ${
                    selectedBackground === 'custom' ? "border-2 border-amber-500" : "border-amber-600/30"
                  }`}
                >
                  <img src={customBackgroundUrl} alt="Custom" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <span className="text-xs relative z-10 text-white font-semibold drop-shadow">Custom Background</span>
                </Button>
                <button
                  onClick={() => {
                    setCustomBackgroundUrl('');
                    if (selectedBackground === 'custom') setSelectedBackground('none');
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {backgrounds.map((bg) => (
                <Button
                  key={bg.id}
                  variant={selectedBackground === bg.id ? "default" : "outline"}
                  onClick={() => setSelectedBackground(bg.id)}
                  className={`h-20 flex flex-col gap-1 overflow-hidden relative ${
                    selectedBackground === bg.id
                      ? "border-2 border-amber-500"
                      : "border-amber-600/30 hover:bg-amber-800/20"
                  }`}
                >
                  {bg.url ? (
                    <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : (
                    <span className="text-2xl">{bg.preview}</span>
                  )}
                  <span className="text-xs relative z-10 text-white font-semibold drop-shadow">{bg.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={() => {
              setMirrorEnabled(true);
              setSelectedFilter('none');
              setSelectedBackground('none');
              setBrightness(100);
              setContrast(100);
              setSaturation(100);
              setZoom(0.5);
            }}
            className="w-full border-amber-600/30 text-amber-300 hover:bg-amber-800/20"
          >
            Reset to Default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}