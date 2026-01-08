import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Comprehensive royalty-free music library
const MUSIC_LIBRARY = [
  // Electronic & Ambient
  { title: "Neon Dreams", artist: "Synth Wave", genre: "electronic", duration: 245, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Cyber Pulse", artist: "Digital Echo", genre: "electronic", duration: 198, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop" },
  { title: "Ambient Flux", artist: "Space Sounds", genre: "electronic", duration: 320, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop" },
  { title: "Digital Horizon", artist: "Pixel Lab", genre: "electronic", duration: 210, thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=600&fit=crop" },
  { title: "Chrome Skies", artist: "Future Sound", genre: "electronic", duration: 265, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop" },
  
  // Hip-Hop & Beats
  { title: "Urban Vibes", artist: "Beat Genius", genre: "hip-hop", duration: 220, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop" },
  { title: "Street Dreams", artist: "Hip Hop Kings", genre: "hip-hop", duration: 195, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop" },
  { title: "Boom Bap", artist: "Classic Beats", genre: "hip-hop", duration: 240, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Flow State", artist: "Lyric Master", genre: "hip-hop", duration: 215, thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop" },
  
  // Rock & Metal
  { title: "Rock Anthem", artist: "Thunder Road", genre: "rock", duration: 245, thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop" },
  { title: "Metal Storm", artist: "Heavy Metal", genre: "metal", duration: 280, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop" },
  { title: "Rock Rebellion", artist: "Stone Roses", genre: "rock", duration: 235, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  
  // Pop & Upbeat
  { title: "Pop Sensation", artist: "Pop Stars", genre: "pop", duration: 210, thumbnail: "https://images.unsplash.com/photo-1516316895a79df9b4a9e0d99a5a5a0?w=400&h=600&fit=crop" },
  { title: "Upbeat Energy", artist: "Feel Good", genre: "pop", duration: 195, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Dance Floor", artist: "Party Crew", genre: "pop", duration: 225, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop" },
  
  // R&B & Soul
  { title: "Soul Deep", artist: "Soul Train", genre: "r-b", duration: 250, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Smooth Ride", artist: "R&B Vibes", genre: "r-b", duration: 240, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop" },
  { title: "Midnight Groove", artist: "Late Night", genre: "r-b", duration: 260, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop" },
  
  // Indie & Folk
  { title: "Indie Spirit", artist: "Indie Folk", genre: "indie", duration: 215, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Acoustic Waves", artist: "Folk Tales", genre: "folk", duration: 240, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop" },
  { title: "Desert Song", artist: "Desert Rose", genre: "indie", duration: 235, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=600&fit=crop" },
  
  // Jazz & Classical
  { title: "Jazz Session", artist: "Jazz Masters", genre: "jazz", duration: 300, thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop" },
  { title: "Classical Symphony", artist: "Orchestra", genre: "classical", duration: 420, thumbnail: "https://images.unsplash.com/photo-1514500494657-c52fc2e80c77?w=400&h=600&fit=crop" },
  { title: "Piano Elegance", artist: "Piano Virtuoso", genre: "classical", duration: 240, thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop" },
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
    
    if (existing.length > 0) {
      return Response.json({ message: 'Music library already seeded', count: existing.length });
    }

    // Seed music library with proper creator
    const musicData = MUSIC_LIBRARY.map((track, idx) => ({
      creator_id: 'system_library', // System creator ID
      title: track.title,
      description: `${track.artist} - ${track.genre} music`,
      video_url: `https://www.youtube.com/embed/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`,
      thumbnail_url: track.thumbnail,
      duration_seconds: track.duration,
      video_type: 'long_form',
      category: track.genre,
      view_count: Math.floor(Math.random() * 100000) + 1000,
      like_count: Math.floor(Math.random() * 10000) + 100,
      is_published: true,
      tags: [track.genre, 'royalty-free', 'library', 'music-video']
    }));

    const createdTracks = await base44.asServiceRole.entities.Music.bulkCreate(musicData);

    console.log(`Seeded ${createdTracks.length} music tracks`);

    return Response.json({
      success: true,
      message: 'Music library seeded successfully',
      count: createdTracks.length,
      tracks: createdTracks.slice(0, 5)
    });
  } catch (error) {
    console.error('Seed music library error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});