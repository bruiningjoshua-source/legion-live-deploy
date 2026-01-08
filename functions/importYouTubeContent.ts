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

    // Fetch from Trash Gang channel
    console.log('Fetching Trash Gang channel...');
    const trashGangChannels = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=trash-gang&type=channel&key=${youtubeApiKey}`
    ).then(r => r.json());
    
    if (trashGangChannels.items?.[0]?.id?.channelId) {
      const trashGangVideos = await fetchChannelVideos(
        trashGangChannels.items[0].id.channelId,
        youtubeApiKey,
        'Trash Gang'
      );
      allVideos.push(...trashGangVideos);
      console.log(`Fetched ${trashGangVideos.length} videos from Trash Gang`);
    }

    // Fetch from New Retro Wave channel
    console.log('Fetching New Retro Wave channel...');
    const nrwChannels = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=newretrowave&type=channel&key=${youtubeApiKey}`
    ).then(r => r.json());
    
    if (nrwChannels.items?.[0]?.id?.channelId) {
      const nrwVideos = await fetchChannelVideos(
        nrwChannels.items[0].id.channelId,
        youtubeApiKey,
        'New Retro Wave'
      );
      allVideos.push(...nrwVideos);
      console.log(`Fetched ${nrwVideos.length} videos from New Retro Wave`);
    }

    // Fetch from specific playlist
    console.log('Fetching specific playlist...');
    const playlistVideos = await fetchPlaylistVideos(
      'PLyIFQr1wryPLAXu2GHL1BgmEzL0Y6iLdU',
      youtubeApiKey,
      'Synthwave Vibes'
    );
    allVideos.push(...playlistVideos);
    console.log(`Fetched ${playlistVideos.length} videos from playlist`);

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

async function fetchPlaylistVideos(playlistId, apiKey, playlistName) {
  const videos = [];
  let pageToken = null;

  try {
    for (let page = 0; page < 3; page++) {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('playlistId', playlistId);
      url.searchParams.append('maxResults', '50');
      url.searchParams.append('key', apiKey);
      if (pageToken) url.searchParams.append('pageToken', pageToken);

      const response = await fetch(url).then(r => r.json());

      if (!response.items) break;

      response.items.forEach(item => {
        videos.push({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          artist: playlistName,
          thumbnail: item.snippet.thumbnails.medium.url,
          genre: 'Synthwave'
        });
      });

      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
  }

  return videos;
}