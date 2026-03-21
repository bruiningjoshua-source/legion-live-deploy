import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

const POPULAR_PLAYLISTS = [
  // Rock & Metal
  { q: 'classic rock 1960s 1970s 1980s playlist', genre: 'rock' },
  { q: 'rock hits 1990s 2000s playlist', genre: 'rock' },
  { q: 'best rock music 2010s 2020s playlist', genre: 'rock' },
  { q: 'heavy metal greatest hits playlist', genre: 'rock' },
  { q: 'metal masterpiece playlist 1980s 1990s', genre: 'rock' },
  
  // Pop & Synthwave
  { q: 'pop music 1960s 1970s 1980s hits playlist', genre: 'pop' },
  { q: 'pop hits 1990s 2000s playlist', genre: 'pop' },
  { q: 'best pop music 2010s 2020s playlist', genre: 'pop' },
  { q: 'synthwave retro 80s 90s playlist', genre: 'pop' },
  { q: 'synthpop greatest hits playlist', genre: 'pop' },
  
  // Hip-Hop & Rap
  { q: 'hip hop rap classics 1990s 2000s playlist', genre: 'hip_hop' },
  { q: 'hip hop hits 2010s 2020s playlist', genre: 'hip_hop' },
  { q: 'best rap music of all time playlist', genre: 'hip_hop' },
  { q: 'trap hip hop 2015 2026 playlist', genre: 'hip_hop' },
  
  // Disco & Funk
  { q: 'disco classics 1970s 1980s playlist', genre: 'other' },
  { q: 'best disco music ever playlist', genre: 'other' },
  { q: 'funk soul disco hits playlist', genre: 'other' },
  
  // Electronic & Dance Music
  { q: 'trance music greatest hits playlist', genre: 'electronic' },
  { q: 'dance music 1990s 2000s 2010s playlist', genre: 'electronic' },
  { q: 'house music classics playlist', genre: 'electronic' },
  { q: 'edm electronic dance music best playlist', genre: 'electronic' },
  { q: 'electro house minimal techno playlist', genre: 'electronic' },
  { q: 'edm festival hits 2015 2026 playlist', genre: 'electronic' },
  
  // Country
  { q: 'country music classics 1960s 1970s 1980s playlist', genre: 'other' },
  { q: 'country hits 1990s 2000s 2010s playlist', genre: 'other' },
  { q: 'best country music 2020s playlist', genre: 'other' },
  { q: 'modern country pop playlist', genre: 'other' },
];

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com.*v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let imported = 0;
    const errors = [];

    for (const { q, genre } of POPULAR_PLAYLISTS) {
      try {
        // Search for playlists
        const playlistSearchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        playlistSearchUrl.searchParams.set('part', 'snippet');
        playlistSearchUrl.searchParams.set('q', q);
        playlistSearchUrl.searchParams.set('type', 'playlist');
        playlistSearchUrl.searchParams.set('maxResults', '5');
        playlistSearchUrl.searchParams.set('key', YOUTUBE_API_KEY);
        playlistSearchUrl.searchParams.set('order', 'relevance');

        const playlistRes = await fetch(playlistSearchUrl.toString());
        if (!playlistRes.ok) throw new Error(`Playlist search failed: ${playlistRes.statusText}`);

        const playlistData = await playlistRes.json();
        const playlists = playlistData.items || [];

        for (const playlist of playlists) {
          const playlistId = playlist.id.playlistId;
          
          try {
            // Get videos from this playlist
            const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            itemsUrl.searchParams.set('part', 'snippet,contentDetails');
            itemsUrl.searchParams.set('playlistId', playlistId);
            itemsUrl.searchParams.set('maxResults', '50');
            itemsUrl.searchParams.set('key', YOUTUBE_API_KEY);

            const itemsRes = await fetch(itemsUrl.toString());
            const itemsData = await itemsRes.json();
            const playlistItems = itemsData.items || [];

            for (const item of playlistItems) {
              try {
                const videoId = item.contentDetails?.videoId;
                if (!videoId) continue;

                const title = item.snippet.title;
                const thumbnail = item.snippet.thumbnails?.high?.url;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                // Get video details (duration)
                const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
                detailUrl.searchParams.set('part', 'contentDetails');
                detailUrl.searchParams.set('id', videoId);
                detailUrl.searchParams.set('key', YOUTUBE_API_KEY);

                const detailRes = await fetch(detailUrl.toString());
                const detailData = await detailRes.json();
                const durationStr = detailData.items?.[0]?.contentDetails?.duration || 'PT0S';

                // Parse ISO 8601 duration
                const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                const hours = parseInt(match?.[1] || 0);
                const minutes = parseInt(match?.[2] || 0);
                const seconds = parseInt(match?.[3] || 0);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;

                // Check if already exists
                const existing = await base44.entities.Music.filter(
                  { audio_url: videoUrl },
                  null,
                  1
                ).catch(() => []);

                if (existing.length > 0) continue;

                // Create music record
                await base44.entities.Music.create({
                  creator_id: user.email,
                  title: title.substring(0, 200),
                  artist: 'YouTube',
                  description: `Imported from YouTube playlist - ${title}`,
                  audio_url: videoUrl,
                  cover_url: thumbnail || getThumbnailUrl(videoId),
                  duration_seconds: totalSeconds,
                  genre: genre,
                  is_published: true,
                  is_music_video: true,
                  video_url: videoUrl,
                  play_count: 0,
                  like_count: 0,
                  tags: [genre, 'imported', 'youtube', 'playlist']
                });

                imported++;
              } catch (err) {
                errors.push(`Item error: ${err.message}`);
              }

              // Rate limiting between video imports
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (err) {
            errors.push(`Playlist import failed: ${err.message}`);
          }

          // Rate limiting between playlists
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        errors.push(`Playlist search "${q}" failed: ${err.message}`);
      }

      // Rate limiting between searches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({
      success: true,
      imported,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('[importYouTubeMusicLibrary]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});