import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const CHANNEL_ID = "UCkQ62tvPlVVb2WLppjRfPdQ"; // TRASH 新 ドラゴン

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all uploads from the channel
        // First, get the uploads playlist ID
        const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
        );
        const channelData = await channelResponse.json();
        
        if (!channelData.items || channelData.items.length === 0) {
            return Response.json({ error: 'Channel not found' }, { status: 404 });
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        
        // Fetch all videos from uploads playlist
        let allVideos = [];
        let nextPageToken = null;
        
        do {
            const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            
            const playlistResponse = await fetch(playlistUrl);
            const playlistData = await playlistResponse.json();
            
            if (playlistData.items) {
                allVideos = allVideos.concat(playlistData.items);
            }
            
            nextPageToken = playlistData.nextPageToken;
        } while (nextPageToken);

        // Get video details (duration, etc.) in batches of 50
        const videoIds = allVideos.map(v => v.contentDetails.videoId);
        const videoDetails = {};
        
        for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50);
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`;
            
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            if (detailsData.items) {
                detailsData.items.forEach(item => {
                    videoDetails[item.id] = item;
                });
            }
        }

        // Convert to Music entities
        const musicRecords = allVideos.map(video => {
            const videoId = video.contentDetails.videoId;
            const snippet = video.snippet;
            const details = videoDetails[videoId];
            
            // Parse duration from ISO 8601 format (PT4M13S)
            let durationSeconds = 180;
            if (details?.contentDetails?.duration) {
                const match = details.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                    const hours = parseInt(match[1] || 0);
                    const minutes = parseInt(match[2] || 0);
                    const seconds = parseInt(match[3] || 0);
                    durationSeconds = hours * 3600 + minutes * 60 + seconds;
                }
            }

            // Extract artist from title (usually "ARTIST - TITLE" format)
            let artist = "TRASH GANG";
            let title = snippet.title;
            
            if (snippet.title.includes(" - ")) {
                const parts = snippet.title.split(" - ");
                artist = parts[0].trim();
                title = parts.slice(1).join(" - ").trim();
            } else if (snippet.title.includes(" – ")) {
                const parts = snippet.title.split(" – ");
                artist = parts[0].trim();
                title = parts.slice(1).join(" – ").trim();
            }

            // Determine genre based on common tags
            let genre = "hip_hop";
            const lowerTitle = snippet.title.toLowerCase();
            const lowerDesc = (snippet.description || "").toLowerCase();
            
            if (lowerTitle.includes("phonk") || lowerDesc.includes("phonk")) {
                genre = "electronic";
            } else if (lowerTitle.includes("lofi") || lowerDesc.includes("lofi")) {
                genre = "hip_hop";
            }

            return {
                creator_id: "trash-gang",
                title: title.substring(0, 200),
                artist: artist.substring(0, 100),
                description: (snippet.description || "").substring(0, 500),
                audio_url: `https://www.youtube.com/watch?v=${videoId}`,
                video_url: `https://www.youtube.com/watch?v=${videoId}`,
                cover_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
                duration_seconds: durationSeconds,
                genre: genre,
                is_music_video: true,
                play_count: parseInt(details?.statistics?.viewCount || 0),
                like_count: parseInt(details?.statistics?.likeCount || 0),
                is_published: true,
                tags: ["trash gang", "phonk", "dark trap", "memphis"]
            };
        });

        // Insert in batches
        let created = 0;
        const batchSize = 25;
        
        for (let i = 0; i < musicRecords.length; i += batchSize) {
            const batch = musicRecords.slice(i, i + batchSize);
            try {
                await base44.asServiceRole.entities.Music.bulkCreate(batch);
                created += batch.length;
            } catch (err) {
                console.error(`Error creating batch ${i}:`, err.message);
            }
        }

        return Response.json({ 
            success: true, 
            total_videos: allVideos.length,
            created: created,
            message: `Imported ${created} music videos from TRASH gang channel`
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});