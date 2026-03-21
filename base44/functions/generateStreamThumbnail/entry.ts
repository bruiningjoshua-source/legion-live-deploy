import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Generate Stream Thumbnail Auto-Generation
 * Creates a thumbnail using AI image generation or fallback
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, streamTitle, category } = await req.json();
    if (!streamId || !streamTitle) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    console.log(`[generateStreamThumbnail] Generating for stream: ${streamTitle}`);

    // Use AI image generation
    const prompt = `Professional Twitch/streaming thumbnail. Bold, eye-catching design. Title: "${streamTitle}". Category: ${category || 'Gaming'}. Vibrant colors, engaging composition, modern style. No text overlays.`;

    try {
      const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt
      });

      if (imageResult?.url) {
        console.log(`[generateStreamThumbnail] Generated thumbnail: ${imageResult.url}`);
        return Response.json({ success: true, thumbnailUrl: imageResult.url });
      }
    } catch (err) {
      console.warn('[generateStreamThumbnail] AI generation failed:', err.message);
    }

    // Fallback: simple color-based thumbnail (gradient + text)
    const colors = {
      gaming: ['#FF6B6B', '#4ECDC4'],
      music: ['#667eea', '#764ba2'],
      talk_show: ['#f093fb', '#f5576c'],
      cooking: ['#FA8072', '#FF6347'],
      fitness: ['#00C851', '#7CB342'],
      default: ['#667eea', '#764ba2']
    };

    const [color1, color2] = colors[category] || colors.default;
    const svg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#grad)"/>
        <text x="640" y="360" font-size="72" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">
          ${streamTitle.substring(0, 30)}
        </text>
        <text x="640" y="450" font-size="36" fill="white" text-anchor="middle" font-family="Arial" opacity="0.8">
          ${category || 'Live'}
        </text>
      </svg>
    `;

    const base64Svg = btoa(svg);
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    console.log(`[generateStreamThumbnail] Using fallback SVG thumbnail`);
    return Response.json({ success: true, thumbnailUrl: dataUrl });

  } catch (error) {
    console.error('[generateStreamThumbnail] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});