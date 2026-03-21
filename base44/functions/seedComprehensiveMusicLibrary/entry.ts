import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Comprehensive music library inspired by Synthwave, Retro, and Electronic music
const COMPREHENSIVE_MUSIC_LIBRARY = [
  // Synthwave & Retro (Trash Gang / New Retro Wave vibes)
  { title: "Neon Nights", artist: "Synthwave Masters", genre: "electronic", duration: 245, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Chrome Dreams", artist: "Retro Synth", genre: "electronic", duration: 268, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Electric Horizon", artist: "Pixel Wave", genre: "electronic", duration: 235, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Neon Visions", artist: "Cyber Pulse", genre: "electronic", duration: 252, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Digital Mirage", artist: "Synth Nights", genre: "electronic", duration: 240, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Retro Future", artist: "Wave Riders", genre: "electronic", duration: 258, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Neon Rain", artist: "Electric Dreams", genre: "electronic", duration: 244, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Cyber City", artist: "Synth Wave Collective", genre: "electronic", duration: 265, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Midnight Drive", artist: "Retro Circuit", genre: "electronic", duration: 238, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "synthwave" },
  { title: "Laser Grid", artist: "Digital Echo", genre: "electronic", duration: 255, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "synthwave" },

  // Lo-Fi & Chill
  { title: "Study Vibes", artist: "Lo-Fi Beats", genre: "electronic", duration: 180, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "lofi" },
  { title: "Chill Moments", artist: "Beat Cafe", genre: "electronic", duration: 195, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "lofi" },
  { title: "Ambient Sunrise", artist: "Lofi Everyday", genre: "electronic", duration: 240, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "lofi" },
  { title: "Rainy Day", artist: "Cozy Beats", genre: "electronic", duration: 210, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "lofi" },
  { title: "Night Coffee", artist: "Lo-Fi Jazz", genre: "jazz", duration: 225, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "lofi" },

  // Vaporwave
  { title: "Mall Dreams", artist: "Vaporwave Collective", genre: "electronic", duration: 280, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "vaporwave" },
  { title: "Aesthetic Vibes", artist: "Vapor Echo", genre: "electronic", duration: 265, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "vaporwave" },
  { title: "Corporate Dreams", artist: "Digital Mist", genre: "electronic", duration: 290, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "vaporwave" },
  { title: "Virtual Reality", artist: "Vape Wave", genre: "electronic", duration: 275, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "vaporwave" },

  // Dark Ambient & Cyberpunk
  { title: "Dark City", artist: "Cyberpunk Sounds", genre: "electronic", duration: 310, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "ambient" },
  { title: "Dystopia", artist: "Dark Ambient Master", genre: "electronic", duration: 320, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "ambient" },
  { title: "Industrial Echo", artist: "Cyber Void", genre: "electronic", duration: 295, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "ambient" },

  // House & Electronic Dance
  { title: "Deep House Groove", artist: "House Masters", genre: "electronic", duration: 240, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "house" },
  { title: "Techno Beat", artist: "Electronic Pulse", genre: "electronic", duration: 255, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "house" },
  { title: "Dance Floor Energy", artist: "EDM Kings", genre: "electronic", duration: 245, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "house" },

  // Chiptune & Retro Gaming
  { title: "8-Bit Adventure", artist: "Chiptune Master", genre: "electronic", duration: 180, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "chiptune" },
  { title: "Pixel Quest", artist: "Retro Arcade", genre: "electronic", duration: 165, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "chiptune" },
  { title: "Digital Dungeon", artist: "8-Bit Heroes", genre: "electronic", duration: 190, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "chiptune" },

  // Hip-Hop & Beats
  { title: "Urban Rhythm", artist: "Hip Hop Beats", genre: "hip-hop", duration: 220, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "hiphop" },
  { title: "Street Vibes", artist: "Beat Producer", genre: "hip-hop", duration: 215, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "hiphop" },
  { title: "Boom Bap Classic", artist: "Classic Beats", genre: "hip-hop", duration: 225, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "hiphop" },

  // Indie & Alternative
  { title: "Indie Dream", artist: "Indie Folk", genre: "indie", duration: 215, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "indie" },
  { title: "Alternative Vibes", artist: "Alt Rock Band", genre: "rock", duration: 240, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "indie" },
  { title: "Acoustic Dreams", artist: "Singer Songwriter", genre: "folk", duration: 235, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "indie" },

  // Pop & Upbeat
  { title: "Pop Energy", artist: "Pop Sensation", genre: "pop", duration: 210, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "pop" },
  { title: "Upbeat Groove", artist: "Feel Good Music", genre: "pop", duration: 225, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "pop" },
  { title: "Dance Party", artist: "Party Crew", genre: "pop", duration: 240, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "pop" },

  // Rock & Metal
  { title: "Rock Anthem", artist: "Rock Kings", genre: "rock", duration: 250, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "rock" },
  { title: "Heavy Metal", artist: "Metal Storm", genre: "metal", duration: 280, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "rock" },
  { title: "Classic Rock", artist: "Rock Legends", genre: "rock", duration: 240, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "rock" },

  // Jazz & Soul
  { title: "Jazz Vibes", artist: "Jazz Masters", genre: "jazz", duration: 300, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "jazz" },
  { title: "Smooth Soul", artist: "Soul Train", genre: "r-b", duration: 250, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "soul" },
  { title: "Midnight Groove", artist: "Smooth Jazz", genre: "jazz", duration: 270, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "jazz" },

  // Classical & Orchestral
  { title: "Symphony No. 1", artist: "Orchestra Ensemble", genre: "classical", duration: 420, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "classical" },
  { title: "Piano Sonata", artist: "Piano Master", genre: "classical", duration: 360, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "classical" },
  { title: "Violin Concerto", artist: "Chamber Orchestra", genre: "classical", duration: 400, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "classical" },

  // Latin & World Music
  { title: "Latin Groove", artist: "Latin Ensemble", genre: "pop", duration: 240, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "latin" },
  { title: "Reggae Vibes", artist: "Reggae Masters", genre: "reggae", duration: 260, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "reggae" },
  { title: "African Drums", artist: "World Percussion", genre: "pop", duration: 280, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop", category: "world" },

  // Ambient & Meditation
  { title: "Calm Waters", artist: "Ambient Meditation", genre: "electronic", duration: 600, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop", category: "ambient" },
  { title: "Peaceful Mind", artist: "Relaxation Sounds", genre: "electronic", duration: 480, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", category: "ambient" },
  { title: "Nature Sounds", artist: "Meditation Master", genre: "electronic", duration: 540, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop", category: "ambient" },

  // Trap & Modern
  { title: "Trap Beat", artist: "Trap King", genre: "hip-hop", duration: 200, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop", category: "trap" },
  { title: "Future Bass", artist: "Modern Producer", genre: "electronic", duration: 220, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop", category: "trap" },
  { title: "Lo-Fi Trap", artist: "Beat Wizard", genre: "hip-hop", duration: 210, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop", category: "trap" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can seed
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if library already seeded
    const existing = await base44.asServiceRole.entities.Music.filter({ is_published: true }, null, 1);
    
    if (existing.length > 50) {
      return Response.json({ message: 'Music library already comprehensive', count: existing.length });
    }

    // Seed comprehensive music library
    const musicData = COMPREHENSIVE_MUSIC_LIBRARY.map((track, idx) => ({
      creator_id: 'system_library',
      title: track.title,
      description: `${track.artist} - ${track.genre} music | Free to use royalty-free content`,
      video_url: `https://www.youtube.com/embed/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`,
      thumbnail_url: track.thumbnail,
      duration_seconds: track.duration,
      video_type: 'long_form',
      category: track.category,
      view_count: Math.floor(Math.random() * 500000) + 5000,
      like_count: Math.floor(Math.random() * 50000) + 500,
      is_published: true,
      tags: [track.genre, track.category, 'royalty-free', 'library', 'music-video', 'free-to-use']
    }));

    const createdTracks = await base44.asServiceRole.entities.Music.bulkCreate(musicData);

    console.log(`✅ Seeded ${createdTracks.length} comprehensive music tracks`);

    return Response.json({
      success: true,
      message: 'Comprehensive music library seeded successfully',
      count: createdTracks.length,
      categories: ['synthwave', 'lofi', 'vaporwave', 'ambient', 'house', 'chiptune', 'hiphop', 'indie', 'pop', 'rock', 'jazz', 'soul', 'classical', 'latin', 'reggae', 'world', 'trap'],
      sampleTracks: createdTracks.slice(0, 5).map(t => ({ title: t.title, artist: t.description?.split(' - ')[0] }))
    });
  } catch (error) {
    console.error('Seed music library error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});