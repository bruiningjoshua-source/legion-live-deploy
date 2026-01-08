import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeApiKey) {
      return Response.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    const allVideos = [];

    // Genre playlists - each fetches ~100 videos to total ~10,000
    const playlists = [
      { id: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf', name: 'Electronic Music', genre: 'Electronic' },
      { id: 'PLkT5CtfNnJPcqKNu6iBsv3FV-oKqb5jKD', name: 'Hip Hop Beats', genre: 'Hip Hop' },
      { id: 'PLQOlJFGpCIa5EQD4t_huwYFjZgf0xVc_5', name: 'Ambient Music', genre: 'Ambient' },
      { id: 'PLfO6FMJfGwN4_JK8-0H0hpMFxDHCcPh8l', name: 'Synthwave', genre: 'Synthwave' },
      { id: 'PLJicmE8fK0EiFnH7XZsB-Vj_sWfJW7kF7', name: 'Lo-Fi Hip Hop', genre: 'Lo-Fi' },
      { id: 'PLK-Y0D6YELNOr6Bk5L-zZLm5HuNKRY3_v', name: 'Chill Vibes', genre: 'Chill' },
      { id: 'PLfO6FMJfGwN60XW4E0gj-x_r2t_v7YBOa', name: 'Deep House', genre: 'Deep House' },
      { id: 'PLDfpqPDXLbJp_T32B1Hn7xSvKB-L6tpVm', name: 'Techno', genre: 'Techno' },
      { id: 'PLKsLSN99rnSMoTVxuKNORAy8q_XrM3nqv', name: 'Indie Electronic', genre: 'Indie' },
      { id: 'PLJicmE8fK0EgV8qZQ8Ng1l0uEq3pBjlDj', name: 'Trap Beats', genre: 'Trap' },
      { id: 'PLDXs5sMBuMOBvH9c6zXDdjxiLtqNRKwvk', name: 'Chill Trap', genre: 'Trap' },
      { id: 'PLLpJ0ESwBYHnq5HX0T1a-9HEaJC5p5TM5', name: 'Future Bass', genre: 'Future Bass' },
      { id: 'PLpXVgLuBWuLQQ5FJwwdViqZTrU1BzDgCl', name: 'Vaporwave', genre: 'Vaporwave' },
      { id: 'PLKsLSN99rnSNLRj-CJvLCfgaKMXF0iKaI', name: 'Chillhop', genre: 'Chillhop' },
      { id: 'PLq6xZ87nf-M_KnvSPjpNnw1_XDIvJlFLB', name: 'Downtempo', genre: 'Downtempo' },
      { id: 'PLLpJ0ESwBYHmmhAXHnkGt4vz6E5gCEOF8', name: 'Drum and Bass', genre: 'Drum and Bass' },
      { id: 'PLDXs5sMBuMOD8LB-Z8L5h0DGTvvbSGG3j', name: 'Dubstep', genre: 'Dubstep' },
      { id: 'PLKsLSN99rnSPZPqhc5LYX6mM1_5JXJ4hV', name: 'Glitch Hop', genre: 'Glitch Hop' },
      { id: 'PLJicmE8fK0EjyWrVZsvV2E0AhCkARTMk4', name: 'Future Funk', genre: 'Funk' },
      { id: 'PLpXVgLuBWuLQfJl7bUQEqvCfZVxFlZVJi', name: 'Synthpop', genre: 'Synthpop' },
      { id: 'PLq6xZ87nf-M_D5bPh9ylXj1-Ku7m1RNLQ', name: 'Retrowave', genre: 'Retrowave' },
      { id: 'PLDXs5sMBuMOCDqKjxLKSe7pDNxzqL8GYP', name: 'Industrial', genre: 'Industrial' },
      { id: 'PLKsLSN99rnSLTOVhVg9Xv1Azcf9RBYP0x', name: 'Experimental', genre: 'Experimental' },
      { id: 'PLJicmE8fK0Ei7g6qYqxFSg1JSaF2Vxc5r', name: 'Liquid Funk', genre: 'Liquid Funk' },
      { id: 'PLpXVgLuBWuLS-ahnJKPlKLa1MjL-e-cG7', name: 'Neurofunk', genre: 'Neurofunk' },
      { id: 'PLq6xZ87nf-M_ZX9h8e9hJZv6Wh6kC1SZV', name: 'Witch House', genre: 'Witch House' },
      { id: 'PLDXs5sMBuMOA-b9aV8eJBjfKJK7K7Ls0F', name: 'Dark Ambient', genre: 'Dark Ambient' },
      { id: 'PLKsLSN99rnSKrHgLFqWFDlJODp0DhqB5g', name: 'Phonk', genre: 'Phonk' },
      { id: 'PLJicmE8fK0EhRp8JJxO7T-G9vXzHMK-VB', name: 'Cloud Rap', genre: 'Cloud Rap' },
      { id: 'PLpXVgLuBWuLRJ6Y2Xs9vhMmn_6YKWNb3u', name: 'Vaporwave Beats', genre: 'Vaporwave' },
      { id: 'PLq6xZ87nf-M_cVtH_8PYnK-2Z5cOvEJdP', name: 'Cyberpunk', genre: 'Cyberpunk' },
      { id: 'PLDXs5sMBuMOC8pSHU8k9GFfWlbGf5vXZK', name: 'Darkwave', genre: 'Darkwave' },
      { id: 'PLKsLSN99rnSOBDL2CgFOSQC7wSjqCCKVT', name: 'Deathstep', genre: 'Deathstep' },
      { id: 'PLJicmE8fK0EhLKM5SdvJI-DzGCp-6eLjf', name: 'Future Garage', genre: 'Future Garage' },
      { id: 'PLpXVgLuBWuLT3sYCQzTX9G8HWmqZN1JuR', name: 'Bass Music', genre: 'Bass' },
      { id: 'PLq6xZ87nf-M_aF_L7bPRsGWqvJvM4GJBt', name: 'Trip Hop', genre: 'Trip Hop' },
      { id: 'PLDXs5sMBuMOC9jXK7fKzJf7YDy1rXaJFq', name: 'Shoegaze', genre: 'Shoegaze' },
      { id: 'PLKsLSN99rnSPBkSPQ4jlhJkQEPqsKpk4d', name: 'Post Rock', genre: 'Post Rock' },
      { id: 'PLJicmE8fK0EgJpX9uZoKG2dqJV9JwChvO', name: 'Math Rock', genre: 'Math Rock' },
      { id: 'PLpXVgLuBWuLSmAZSqBMQwR61Y_H1C_u4S', name: 'Progressive House', genre: 'Progressive House' }
    ];

    console.log(`Starting to fetch ${playlists.length} playlists...`);
    
    for (const playlist of playlists) {
      try {
        const playlistVideos = await fetchPlaylistVideos(
          playlist.id,
          youtubeApiKey,
          playlist.name,
          playlist.genre,
          100 // Fetch 100 videos per playlist to reach ~10k total
        );
        allVideos.push(...playlistVideos);
        console.log(`Fetched ${playlistVideos.length} videos from ${playlist.name}`);
      } catch (error) {
        console.error(`Error fetching ${playlist.name}:`, error.message);
      }
    }

    // Add to Music entity
    console.log(`Adding ${allVideos.length} videos to Music library...`);
    const musicsToCreate = allVideos.map(v => ({
      title: v.title,
      artist: v.artist,
      video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnail_url: v.thumbnail,
      duration_seconds: 0,
      genre: v.genre || 'Synthwave',
      mood: 'chill',
      is_published: true
    }));

    if (musicsToCreate.length > 0) {
      await base44.asServiceRole.entities.Music.bulkCreate(musicsToCreate);
      console.log(`Successfully added ${musicsToCreate.length} videos`);
    }

    return Response.json({
      success: true,
      videosAdded: allVideos.length,
      videos: allVideos.map(v => ({ title: v.title, artist: v.artist }))
    });
  } catch (error) {
    console.error('Error importing YouTube content:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchChannelVideos(channelId, apiKey, channelName) {
  const videos = [];
  let pageToken = null;
  
  try {
    for (let page = 0; page < 3; page++) {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('channelId', channelId);
      url.searchParams.append('type', 'video');
      url.searchParams.append('maxResults', '50');
      url.searchParams.append('key', apiKey);
      if (pageToken) url.searchParams.append('pageToken', pageToken);

      const response = await fetch(url).then(r => r.json());
      
      if (!response.items) break;

      response.items.forEach(item => {
        videos.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          artist: channelName,
          thumbnail: item.snippet.thumbnails.medium.url,
          genre: 'Synthwave'
        });
      });

      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
  } catch (error) {
    console.error(`Error fetching channel ${channelId}:`, error);
  }

  return videos;
}

async function fetchPlaylistVideos(playlistId, apiKey, playlistName, genre = 'Electronic', maxVideos = 100) {
  const videos = [];
  let pageToken = null;
  const maxPages = Math.ceil(maxVideos / 50);

  try {
    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('playlistId', playlistId);
      url.searchParams.append('maxResults', '50');
      url.searchParams.append('key', apiKey);
      if (pageToken) url.searchParams.append('pageToken', pageToken);

      const response = await fetch(url).then(r => r.json());

      if (!response.items) break;

      response.items.forEach(item => {
        if (videos.length < maxVideos) {
          videos.push({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            artist: playlistName,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            genre: genre
          });
        }
      });

      if (videos.length >= maxVideos) break;
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
  }

  return videos;
}