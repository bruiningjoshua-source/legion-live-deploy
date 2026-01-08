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

    // Verified popular music playlists - diversified genres
    const playlists = [
      { id: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf', name: 'Electronic', genre: 'Electronic' },
      { id: 'PLkT5CtfNnJPcqKNu6iBsv3FV-oKqb5jKD', name: 'Hip Hop', genre: 'Hip Hop' },
      { id: 'PLQOlJFGpCIa5EQD4t_huwYFjZgf0xVc_5', name: 'Ambient', genre: 'Ambient' },
      { id: 'PLfO6FMJfGwN4_JK8-0H0hpMFxDHCcPh8l', name: 'Synthwave', genre: 'Synthwave' },
      { id: 'PLJicmE8fK0EiFnH7XZsB-Vj_sWfJW7kF7', name: 'Lo-Fi', genre: 'Lo-Fi' },
      { id: 'PLfO6FMJfGwN60XW4E0gj-x_r2t_v7YBOa', name: 'House', genre: 'House' },
      { id: 'PLDfpqPDXLbJp_T32B1Hn7xSvKB-L6tpVm', name: 'Techno', genre: 'Techno' },
      { id: 'PLKsLSN99rnSMoTVxuKNORAy8q_XrM3nqv', name: 'Indie', genre: 'Indie' },
      { id: 'PLJicmE8fK0EgV8qZQ8Ng1l0uEq3pBjlDj', name: 'Trap', genre: 'Trap' },
      { id: 'PLDXs5sMBuMOBvH9c6zXDdjxiLtqNRKwvk', name: 'Chill', genre: 'Chill' }
    ];

    console.log(`Starting to fetch ${playlists.length} playlists...`);
    let successCount = 0;
    
    for (const playlist of playlists) {
      try {
        const playlistVideos = await fetchPlaylistVideos(
          playlist.id,
          youtubeApiKey,
          playlist.name,
          playlist.genre,
          200 // Fetch 200 videos per playlist to total ~2k
        );
        if (playlistVideos.length > 0) {
          allVideos.push(...playlistVideos);
          successCount++;
          console.log(`Fetched ${playlistVideos.length} videos from ${playlist.name}`);
        }
      } catch (error) {
        console.error(`Error fetching ${playlist.name}:`, error.message);
      }
    }
    
    console.log(`Successfully fetched from ${successCount}/${playlists.length} playlists`);

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