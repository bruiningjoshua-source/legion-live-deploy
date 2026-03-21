import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PLAYLIST_TEMPLATES = [
  {
    title: 'Synthwave Nights',
    description: 'Neon-soaked synthwave and retro electronic vibes',
    genre: 'electronic',
    mood: 'chill',
    tags: ['synthwave', 'retro', 'neon', 'electronic']
  },
  {
    title: 'Lo-Fi Study Beats',
    description: 'Focus and relaxation lo-fi hip hop beats',
    genre: 'hip-hop',
    mood: 'focus',
    tags: ['lofi', 'study', 'focus', 'chill']
  },
  {
    title: 'Vaporwave Dreams',
    description: 'Aesthetic vaporwave and ambient textures',
    genre: 'electronic',
    mood: 'relax',
    tags: ['vaporwave', 'ambient', 'aesthetic', 'surreal']
  },
  {
    title: 'Dark Ambient Soundscapes',
    description: 'Cyberpunk and dark ambient atmospheres',
    genre: 'electronic',
    mood: 'relax',
    tags: ['ambient', 'cyberpunk', 'dark', 'atmospheric']
  },
  {
    title: 'House Party Hits',
    description: 'Deep house and electronic dance music',
    genre: 'electronic',
    mood: 'party',
    tags: ['house', 'edm', 'dance', 'party']
  },
  {
    title: 'Chiptune Nostalgia',
    description: 'Retro 8-bit chiptune gaming music',
    genre: 'electronic',
    mood: 'gaming',
    tags: ['chiptune', 'retro', '8bit', 'gaming', 'nostalgic']
  },
  {
    title: 'Hip Hop Essentials',
    description: 'Classic and modern hip hop beats',
    genre: 'hip-hop',
    mood: 'energetic',
    tags: ['hiphop', 'beats', 'urban', 'rap']
  },
  {
    title: 'Indie Vibes',
    description: 'Indie rock and alternative classics',
    genre: 'indie',
    mood: 'chill',
    tags: ['indie', 'alternative', 'folk', 'acoustic']
  },
  {
    title: 'Pop Energy',
    description: 'Upbeat pop hits and feel-good music',
    genre: 'pop',
    mood: 'energetic',
    tags: ['pop', 'upbeat', 'feelgood', 'party']
  },
  {
    title: 'Rock Anthems',
    description: 'Classic and modern rock music',
    genre: 'rock',
    mood: 'energetic',
    tags: ['rock', 'metal', 'anthem', 'classic']
  },
  {
    title: 'Jazz Smooth Sessions',
    description: 'Smooth jazz and instrumental classics',
    genre: 'jazz',
    mood: 'relax',
    tags: ['jazz', 'smooth', 'instrumental', 'relaxing']
  },
  {
    title: 'Soul Deep Grooves',
    description: 'Soul, R&B, and smooth grooves',
    genre: 'r-b',
    mood: 'chill',
    tags: ['soul', 'rnb', 'smooth', 'groove']
  },
  {
    title: 'Classical Masterpieces',
    description: 'Timeless orchestral and classical compositions',
    genre: 'classical',
    mood: 'relax',
    tags: ['classical', 'orchestral', 'piano', 'violin']
  },
  {
    title: 'Latin Rhythms',
    description: 'Latin, reggae, and world music vibes',
    genre: 'pop',
    mood: 'energetic',
    tags: ['latin', 'reggae', 'world', 'rhythm']
  },
  {
    title: 'Ambient Meditation',
    description: 'Peaceful ambient and meditation soundscapes',
    genre: 'electronic',
    mood: 'relax',
    tags: ['ambient', 'meditation', 'peaceful', 'zen']
  },
  {
    title: 'Trap & Future Bass',
    description: 'Modern trap beats and future bass production',
    genre: 'hip-hop',
    mood: 'energetic',
    tags: ['trap', 'futurebass', 'modern', 'production']
  },
  {
    title: 'Workout Pump',
    description: 'High-energy tracks for fitness and workouts',
    genre: 'electronic',
    mood: 'workout',
    tags: ['workout', 'fitness', 'energetic', 'pump']
  },
  {
    title: 'Chill Gaming Sessions',
    description: 'Relaxed music for gaming and streaming',
    genre: 'electronic',
    mood: 'gaming',
    tags: ['gaming', 'stream', 'chill', 'background']
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if playlists already exist
    const existingPlaylists = await base44.asServiceRole.entities.Playlist.list('-created_date', 1);
    
    if (existingPlaylists.length > 10) {
      return Response.json({ message: 'Playlists already seeded', count: existingPlaylists.length });
    }

    // Get all published music tracks
    const musicTracks = await base44.asServiceRole.entities.Music.filter({ is_published: true }, 'category', 500);

    if (musicTracks.length === 0) {
      return Response.json({ error: 'No music tracks found. Seed music library first.' }, { status: 400 });
    }

    const createdPlaylists = [];

    // Create playlists from templates
    for (const template of PLAYLIST_TEMPLATES) {
      // Create playlist
      const playlist = await base44.asServiceRole.entities.Playlist.create({
        title: template.title,
        description: template.description,
        creator_id: 'system_library',
        thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop',
        genre: template.genre,
        mood: template.mood,
        is_featured: true,
        is_public: true,
        track_count: 0,
        total_duration_seconds: 0,
        tags: template.tags
      });

      // Filter tracks by genre/category
      const playlistTracks = musicTracks.filter(track => {
        const trackCategory = track.category?.toLowerCase() || '';
        const playlistGenre = template.genre?.toLowerCase() || '';
        return trackCategory.includes(playlistGenre) || 
               template.tags.some(tag => track.tags?.includes(tag));
      }).slice(0, 20); // Limit to 20 tracks per playlist

      // Add tracks to playlist
      let position = 1;
      let totalDuration = 0;

      for (const track of playlistTracks) {
        await base44.asServiceRole.entities.PlaylistTrack.create({
          playlist_id: playlist.id,
          music_id: track.id,
          position: position,
          added_by: 'system_library',
          duration_seconds: track.duration_seconds || 0
        });

        totalDuration += track.duration_seconds || 0;
        position++;
      }

      // Update playlist with track info
      await base44.asServiceRole.entities.Playlist.update(playlist.id, {
        track_count: playlistTracks.length,
        total_duration_seconds: totalDuration
      });

      createdPlaylists.push({
        title: playlist.title,
        tracks: playlistTracks.length,
        duration: Math.floor(totalDuration / 60)
      });
    }

    console.log(`✅ Seeded ${createdPlaylists.length} playlists with ${musicTracks.length} tracks`);

    return Response.json({
      success: true,
      message: 'Playlist library seeded successfully',
      playlistsCreated: createdPlaylists.length,
      totalTracks: musicTracks.length,
      playlists: createdPlaylists
    });
  } catch (error) {
    console.error('Seed playlist library error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});