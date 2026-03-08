import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Save a user's custom theme to the database.
 * Stores preset selection OR custom background URL, along with color choices.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      theme_name,
      background_preset_id,
      custom_background_url,
      primary_color,
      secondary_color,
      accent_color
    } = await req.json();

    if (!theme_name || !theme_name.trim()) {
      return Response.json({ error: 'Theme name required' }, { status: 400 });
    }

    const themeData = {
      user_email: user.email,
      theme_name: theme_name.trim().substring(0, 100),
      background_preset_id: background_preset_id || null,
      custom_background_url: custom_background_url || null,
      primary_color: primary_color || '#D97706',
      secondary_color: secondary_color || '#8B0000',
      accent_color: accent_color || '#FEF3C7',
      is_preset: false,
      is_active: true
    };

    const theme = await base44.asServiceRole.entities.AppTheme.create(themeData);

    console.log('[saveUserTheme]', user.email, '→', theme_name);

    return Response.json({
      id: theme.id,
      theme_name: theme.theme_name,
      primary_color: theme.primary_color,
      secondary_color: theme.secondary_color,
      accent_color: theme.accent_color
    });

  } catch (error) {
    console.error('[saveUserTheme] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});