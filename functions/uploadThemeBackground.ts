import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Upload a custom theme background image.
 * Returns the uploaded file URL for use in theme configuration.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File must be smaller than 5MB' }, { status: 400 });
    }

    // Upload to Base44 integration
    const response = await base44.asServiceRole.integrations.Core.UploadFile({
      file: file
    });

    console.log('[uploadThemeBackground]', user.email, '→', file.name);

    return Response.json({
      file_url: response.file_url,
      file_name: file.name
    });

  } catch (error) {
    console.error('[uploadThemeBackground] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});