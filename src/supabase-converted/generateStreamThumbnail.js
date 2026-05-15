/* eslint-disable no-undef */
// ═══ CONVERTED: generateStreamThumbnail ═══
// NOTE: Replaces base44 GenerateImage with OpenAI DALL-E or fallback SVG.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, streamTitle, category } = await req.json();
    if (!streamId || !streamTitle) return Response.json({ error: 'Missing fields' }, { status: 400 });

    // Try OpenAI DALL-E if key available
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: 'dall-e-3', prompt: `Professional streaming thumbnail. Title: "${streamTitle}". Category: ${category||'Gaming'}. Vibrant, eye-catching, modern.`, n: 1, size: '1024x1024' })
        });
        const data = await res.json();
        if (data.data?.[0]?.url) return Response.json({ success: true, thumbnailUrl: data.data[0].url });
      } catch (e) { console.warn('DALL-E failed:', e.message); }
    }

    // Fallback SVG
    const colors = { gaming: ['#FF6B6B','#4ECDC4'], music: ['#667eea','#764ba2'], default: ['#667eea','#764ba2'] };
    const [c1, c2] = colors[category] || colors.default;
    const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="640" y="360" font-size="72" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">${streamTitle.substring(0,30)}</text></svg>`;
    return Response.json({ success: true, thumbnailUrl: `data:image/svg+xml;base64,${btoa(svg)}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});