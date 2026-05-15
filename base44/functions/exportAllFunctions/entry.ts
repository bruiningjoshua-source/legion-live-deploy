import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Use the GitHub OAuth connector to read the repo
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Step 1: Find the repo — list user repos and find the one synced with this app
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers });
    const repos = await reposRes.json();
    
    // Look for the Legion Live repo (or any repo with functions folder)
    // Try to find it by checking for a functions directory
    let targetOwner = null;
    let targetRepo = null;

    for (const r of repos) {
      const checkRes = await fetch(`https://api.github.com/repos/${r.full_name}/contents/src/functions`, { headers });
      if (checkRes.ok) {
        targetOwner = r.owner.login;
        targetRepo = r.name;
        break;
      }
      // Also check root-level functions/
      const checkRes2 = await fetch(`https://api.github.com/repos/${r.full_name}/contents/functions`, { headers });
      if (checkRes2.ok) {
        targetOwner = r.owner.login;
        targetRepo = r.name;
        break;
      }
    }

    if (!targetOwner || !targetRepo) {
      return Response.json({ error: 'Could not find a repo with functions/ folder' }, { status: 404 });
    }

    console.log(`Found repo: ${targetOwner}/${targetRepo}`);

    // Step 2: List all files in the functions directory
    let functionsPath = 'src/functions';
    let listRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${functionsPath}`, { headers });
    
    if (!listRes.ok) {
      functionsPath = 'functions';
      listRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${functionsPath}`, { headers });
    }

    if (!listRes.ok) {
      return Response.json({ error: 'Could not list functions directory' }, { status: 404 });
    }

    const files = await listRes.json();
    const jsFiles = files.filter(f => f.type === 'file' && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.md')));

    console.log(`Found ${jsFiles.length} function files`);

    // Step 3: Read each file's content
    let output = '';
    output += `// ═══════════════════════════════════════════════════════════════\n`;
    output += `// LEGION LIVE — COMPLETE EDGE FUNCTIONS EXPORT\n`;
    output += `// Generated: ${new Date().toISOString()}\n`;
    output += `// Total files: ${jsFiles.length}\n`;
    output += `// ═══════════════════════════════════════════════════════════════\n\n`;

    for (const file of jsFiles) {
      try {
        const fileRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${functionsPath}/${file.name}`, { headers });
        const fileData = await fileRes.json();
        
        let content = '';
        if (fileData.encoding === 'base64') {
          content = atob(fileData.content.replace(/\n/g, ''));
        } else {
          content = fileData.content || '// Could not decode';
        }

        output += `// ═══════════════════════════════════════════════════════════════\n`;
        output += `// FILE: ${file.name}\n`;
        output += `// SIZE: ${fileData.size} bytes\n`;
        output += `// ═══════════════════════════════════════════════════════════════\n\n`;
        output += content;
        output += `\n\n`;

        console.log(`Read: ${file.name} (${fileData.size} bytes)`);
      } catch (err) {
        output += `// ERROR reading ${file.name}: ${err.message}\n\n`;
        console.error(`Failed to read ${file.name}:`, err.message);
      }
    }

    // Return as downloadable text file
    return new Response(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="legion-live-edge-functions.txt"',
      },
    });
  } catch (error) {
    console.error('[exportAllFunctions]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});