import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Use the GITHUB_TOKEN secret directly
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      return Response.json({ error: 'GITHUB_TOKEN not set' }, { status: 500 });
    }
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Step 1: List repos and log their names + check common paths
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers });
    const repos = await reposRes.json();
    
    if (!Array.isArray(repos)) {
      console.error('GitHub API response:', JSON.stringify(repos));
      return Response.json({ error: 'GitHub API error', details: repos }, { status: 500 });
    }

    console.log(`Found ${repos.length} repos:`);
    repos.forEach(r => console.log(`  - ${r.full_name}`));

    let targetOwner = null;
    let targetRepo = null;
    let functionsPathFound = null;

    // Check multiple possible paths for each repo
    const pathsToCheck = ['base44/functions', 'base44/edge-functions', 'src/functions', 'functions', 'supabase/functions', 'edge-functions'];
    
    for (const r of repos) {
      for (const p of pathsToCheck) {
        const checkRes = await fetch(`https://api.github.com/repos/${r.full_name}/contents/${p}`, { headers });
        if (checkRes.ok) {
          const contents = await checkRes.json();
          if (Array.isArray(contents) && contents.length > 0) {
            targetOwner = r.owner.login;
            targetRepo = r.name;
            functionsPathFound = p;
            console.log(`Found functions at: ${r.full_name}/${p}`);
            break;
          }
        }
      }
      if (targetOwner) break;
    }

    if (!targetOwner || !targetRepo) {
      // Debug: list root contents of first repo
      const debugRepo = repos[0];
      if (debugRepo) {
        const rootRes = await fetch(`https://api.github.com/repos/${debugRepo.full_name}/contents/`, { headers });
        const rootContents = await rootRes.json();
        const listing = Array.isArray(rootContents) ? rootContents.map(f => `${f.type}: ${f.name}`) : rootContents;
        return Response.json({ 
          error: 'Could not find functions folder', 
          repo: debugRepo.full_name,
          root_contents: listing
        }, { status: 404 });
      }
      return Response.json({ error: 'No repos found' }, { status: 404 });
    }

    console.log(`Target repo: ${targetOwner}/${targetRepo}, path: ${functionsPathFound}`);

    // Step 2: List all files in the functions directory
    const functionsPath = functionsPathFound;
    const listRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${functionsPath}`, { headers });

    if (!listRes.ok) {
      return Response.json({ error: 'Could not list functions directory' }, { status: 404 });
    }

    const files = await listRes.json();
    console.log(`Raw files in ${functionsPath}:`, JSON.stringify(files.map(f => ({ name: f.name, type: f.type })).slice(0, 20)));
    
    // Include all files and directories — Base44 may store each function as a folder with index.js
    const jsFiles = files.filter(f => f.type === 'file');
    const dirs = files.filter(f => f.type === 'dir');

    console.log(`Found ${jsFiles.length} direct files, ${dirs.length} directories`);

    // Step 3: Read each file + each directory's index file
    let output = '';
    let totalCount = 0;

    // Helper to read and append a file
    async function readAndAppend(filePath, label) {
      const fileRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`, { headers });
      const fileData = await fileRes.json();
      let content = '';
      if (fileData.encoding === 'base64') {
        content = atob(fileData.content.replace(/\n/g, ''));
      } else {
        content = fileData.content || '// Could not decode';
      }
      output += `// ═══════════════════════════════════════════════════════════════\n`;
      output += `// FILE: ${label}\n`;
      output += `// SIZE: ${fileData.size} bytes\n`;
      output += `// ═══════════════════════════════════════════════════════════════\n\n`;
      output += content;
      output += `\n\n`;
      totalCount++;
      console.log(`Read: ${label} (${fileData.size} bytes)`);
    }

    // Read direct files
    for (const file of jsFiles) {
      try {
        await readAndAppend(`${functionsPath}/${file.name}`, file.name);
      } catch (err) {
        output += `// ERROR reading ${file.name}: ${err.message}\n\n`;
      }
    }

    // Read directories (each is a function folder — look for index.js/index.ts or any .js/.ts inside)
    for (const dir of dirs) {
      try {
        const dirRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${functionsPath}/${dir.name}`, { headers });
        const dirContents = await dirRes.json();
        if (!Array.isArray(dirContents)) continue;
        
        // Read all code files in the directory
        const codeFiles = dirContents.filter(f => f.type === 'file' && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.md')));
        for (const cf of codeFiles) {
          try {
            await readAndAppend(`${functionsPath}/${dir.name}/${cf.name}`, `${dir.name}/${cf.name}`);
          } catch (err) {
            output += `// ERROR reading ${dir.name}/${cf.name}: ${err.message}\n\n`;
          }
        }
      } catch (err) {
        output += `// ERROR reading directory ${dir.name}: ${err.message}\n\n`;
      }
    }

    // Prepend header
    const header = `// ═══════════════════════════════════════════════════════════════\n// LEGION LIVE — COMPLETE EDGE FUNCTIONS EXPORT\n// Generated: ${new Date().toISOString()}\n// Total files: ${totalCount}\n// ═══════════════════════════════════════════════════════════════\n\n`;
    output = header + output;

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