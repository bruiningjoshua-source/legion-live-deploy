import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

const POPULAR_PLAYLISTS = [
  // Rock & Metal
  { id: 'PLny3IEbsr-rPmd0goOF5eQ_qJjcP-4wdT', genre: 'rock', name: 'Top 100 Rock Songs Of The 2010s' },
  { id: 'PLny3IEbsr-rNORq2hCLEe7nDNH9QJ8ROb', genre: 'rock', name: 'Top 30 Metal Songs Of The 2000s' },
  
  // Pop & Synthwave
  { id: 'PLBccjB8tUhRTGSCGQ_SH30apIiJxc04t5', genre: 'pop', name: 'Best Synthwave Music Playlist' },
  
  // Hip-Hop & Rap (using search as fallback for non-playlist videos)
  
  // Disco & Funk
  { id: 'PLqZ3rWFEe-iCpjKstxUAh2D_10WuKRhdQ', genre: 'other', name: 'Old Funk Music 70s 80s' },
  { id: 'PLHUPapYSc2W21L4XQWQSYpftuDV5Wefis', genre: 'other', name: 'Classic 70s & 80s Funk/Disco/Soul' },
  { id: 'PLVSmhKCk2xOcQ9sKSYKCOPY5tlOk8jjcP', genre: 'other', name: 'DISCO FUNK 70s & 80s' },
  
  // Electronic & Dance Music
  { id: 'PLVw4XTfVCYQxopGUNtoLqFTF_xlgUStbd', genre: 'electronic', name: 'Best EDM & House Music Mix' },
  
  // Country
  { id: 'PL-EmT37PV82NpnVhlFLXpe-nGR3acmeHw', genre: 'other', name: 'Top 100 Classic Country Songs 60s 70s 80s 90s' },
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

    for (const { id: playlistId, genre, name } of POPULAR_PLAYLISTS) {
      try {
        // Get videos from this playlist
        const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        itemsUrl.searchParams.set('part', 'snippet,contentDetails');
        itemsUrl.searchParams.set('playlistId', playlistId);
        itemsUrl.searchParams.set('maxResults', '50');
        itemsUrl.searchParams.set('key', YOUTUBE_API_KEY);

        const itemsRes = await fetch(itemsUrl.toString());
        if (!itemsRes.ok) throw new Error(`Failed to fetch playlist items: ${itemsRes.statusText}`);

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
              description: `Imported from ${name}`,
              audio_url: videoUrl,
              cover_url: thumbnail || getThumbnailUrl(videoId),
              duration_seconds: totalSeconds,
              genre: genre,
              is_published: true,
              is_music_video: true,
              video_url: videoUrl,
              play_count: 0,
              like_count: 0,
              tags: [genre, 'imported', 'youtube']
            });

            imported++;
          } catch (err) {
            errors.push(`Item error in ${name}: ${err.message}`);
          }

          // Rate limiting between video imports
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        errors.push(`Playlist "${name}" import failed: ${err.message}`);
      }

      // Rate limiting between playlists
      await new Promise(resolve => setTimeout(resolve, 300));
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