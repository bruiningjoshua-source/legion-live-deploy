import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

const POPULAR_PLAYLISTS = [
  { q: 'top hits 2024 playlist', genre: 'pop' },
  { q: 'hip hop rap playlist best', genre: 'hip_hop' },
  { q: 'rock music hits playlist', genre: 'rock' },
  { q: 'indie pop playlist', genre: 'indie' },
  { q: 'r&b best songs playlist', genre: 'r_and_b' },
  { q: 'electronic dance music playlist', genre: 'electronic' },
  { q: 'jazz standards playlist', genre: 'jazz' },
  { q: 'classical music playlist', genre: 'classical' },
  { q: 'ambient chill music playlist', genre: 'ambient' },
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

    for (const { q, genre } of POPULAR_SEARCHES) {
      try {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', q);
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('maxResults', '15');
        searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
        searchUrl.searchParams.set('order', 'relevance');

        const searchRes = await fetch(searchUrl.toString());
        if (!searchRes.ok) throw new Error(`YouTube search failed: ${searchRes.statusText}`);

        const searchData = await searchRes.json();
        const items = searchData.items || [];

        for (const item of items) {
          try {
            const videoId = item.id.videoId;
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
              description: `Imported from YouTube - ${title}`,
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
            errors.push(`Item error: ${err.message}`);
          }
        }
      } catch (err) {
        errors.push(`Search "${q}" failed: ${err.message}`);
      }

      // Rate limiting
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