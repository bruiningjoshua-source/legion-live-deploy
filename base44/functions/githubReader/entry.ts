import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const body = await req.json().catch(() => ({}));
    const { action, owner, repo, path = '', ref = 'main' } = body;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // List all repos for the authenticated user
    if (action === 'list_repos') {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', { headers });
      const data = await res.json();
      return Response.json({ repos: data.map(r => ({ name: r.name, full_name: r.full_name, private: r.private, default_branch: r.default_branch })) });
    }

    // List files/folders at a path
    if (action === 'list_files') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`, { headers });
      const data = await res.json();
      return Response.json({ files: data });
    }

    // Read a file's content
    if (action === 'read_file') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`, { headers });
      const data = await res.json();
      if (data.encoding === 'base64') {
        const content = atob(data.content.replace(/\n/g, ''));
        return Response.json({ content, sha: data.sha, size: data.size });
      }
      return Response.json(data);
    }

    return Response.json({ error: 'Unknown action. Use list_repos, list_files, or read_file.' }, { status: 400 });
  } catch (error) {
    console.error('[githubReader]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});