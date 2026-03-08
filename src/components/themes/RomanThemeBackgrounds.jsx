/**
 * 10 Roman & War Aesthetic Background Presets
 * Used for menu pages, stream overlays, and customizable theme system
 */

export const THEME_PRESETS = [
  {
    id: 'colosseum',
    name: 'Colosseum Arena',
    description: 'Ancient amphitheater with crowd and glory',
    backgroundUrl: 'https://images.unsplash.com/photo-1552681528-7e1c00ffa23f?w=1920&h=1080&fit=crop',
    primaryColor: '#D97706',
    secondaryColor: '#8B0000',
    accentColor: '#FEF3C7',
    overlayOpacity: 0.5
  },
  {
    id: 'forum',
    name: 'Roman Forum',
    description: 'Senate district with classical columns',
    backgroundUrl: 'https://images.unsplash.com/photo-1579743840301-9a5e86e25c5d?w=1920&h=1080&fit=crop',
    primaryColor: '#92400E',
    secondaryColor: '#7C2D12',
    accentColor: '#FDE047',
    overlayOpacity: 0.45
  },
  {
    id: 'pantheon',
    name: 'Pantheon Interior',
    description: 'Dome of eternal light and marble',
    backgroundUrl: 'https://images.unsplash.com/photo-1543936752-b06dc90b4abf?w=1920&h=1080&fit=crop',
    primaryColor: '#F59E0B',
    secondaryColor: '#6B4423',
    accentColor: '#FFFBEB',
    overlayOpacity: 0.4
  },
  {
    id: 'military_camp',
    name: 'Military Camp',
    description: 'Roman legion encampment at twilight',
    backgroundUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1920&h=1080&fit=crop',
    primaryColor: '#DC2626',
    secondaryColor: '#1F2937',
    accentColor: '#FBBF24',
    overlayOpacity: 0.6
  },
  {
    id: 'siege_wall',
    name: 'Siege Fortification',
    description: 'Battle-hardened stone walls and ramparts',
    backgroundUrl: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1920&h=1080&fit=crop',
    primaryColor: '#7C3AED',
    secondaryColor: '#4B0082',
    accentColor: '#C4B5FD',
    overlayOpacity: 0.55
  },
  {
    id: 'senate_hall',
    name: 'Senate Chamber',
    description: 'Marble halls of political power',
    backgroundUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    primaryColor: '#1F2937',
    secondaryColor: '#6B4423',
    accentColor: '#F3E8FF',
    overlayOpacity: 0.5
  },
  {
    id: 'gladiator_arena',
    name: 'Gladiator Pit',
    description: 'Sand and bloodlust, victory or death',
    backgroundUrl: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b3?w=1920&h=1080&fit=crop',
    primaryColor: '#991B1B',
    secondaryColor: '#7F1D1D',
    accentColor: '#FCA5A5',
    overlayOpacity: 0.65
  },
  {
    id: 'fortress_gates',
    name: 'Iron Gates',
    description: 'Monumental gates to an empire',
    backgroundUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920&h=1080&fit=crop',
    primaryColor: '#374151',
    secondaryColor: '#1F2937',
    accentColor: '#FBBF24',
    overlayOpacity: 0.6
  },
  {
    id: 'battle_formation',
    name: 'Legion Formation',
    description: 'Ranked soldiers ready for conquest',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&h=1080&fit=crop',
    primaryColor: '#AF2737',
    secondaryColor: '#590E0E',
    accentColor: '#FCE7F3',
    overlayOpacity: 0.55
  },
  {
    id: 'imperial_palace',
    name: 'Imperial Palace',
    description: 'Seat of absolute power and luxury',
    backgroundUrl: 'https://images.unsplash.com/photo-1566502031773-8f3723ef338f?w=1920&h=1080&fit=crop',
    primaryColor: '#EAB308',
    secondaryColor: '#92400E',
    accentColor: '#FFFBEB',
    overlayOpacity: 0.4
  }
];

// Helper to get a preset by ID
export function getThemePreset(presetId) {
  return THEME_PRESETS.find(p => p.id === presetId);
}

// Helper to apply theme CSS variables
export function applyThemePreset(preset) {
  if (!preset) return;
  
  const root = document.documentElement;
  root.style.setProperty('--color-primary', preset.primaryColor);
  root.style.setProperty('--color-secondary', preset.secondaryColor);
  root.style.setProperty('--color-accent', preset.accentColor);
  root.style.setProperty('--background-image', `url('${preset.backgroundUrl}')`);
  root.style.setProperty('--overlay-opacity', preset.overlayOpacity.toString());
}