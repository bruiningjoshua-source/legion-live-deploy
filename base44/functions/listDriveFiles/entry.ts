import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    console.log('Token obtained, length:', accessToken?.length);
    const body = await req.json().catch(() => ({}));
    const folderId = body.folderId;
    const searchName = body.searchName;

    let url;
    if (searchName) {
      const query = `name contains '${searchName}' and trashed = false`;
      url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,parents)&pageSize=50&orderBy=name`;
    } else if (folderId) {
      const query = `'${folderId}' in parents and trashed = false`;
      url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&pageSize=100&orderBy=name`;
    } else {
      // List root or recent
      url = `https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,parents)&pageSize=50&orderBy=modifiedTime desc`;
    }
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    
    if (!res.ok) {
      console.error('Drive API error:', data);
      return Response.json({ error: data.error?.message || 'API error' }, { status: 500 });
    }

    return Response.json({ files: data.files || [] });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});