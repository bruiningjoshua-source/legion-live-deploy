#!/usr/bin/env node
/**
 * Emits the SuperSplat viewer as a self-contained static page into public/splat/
 * so it can be loaded in an iframe (isolating its heavy WebGPU rendering from the
 * React app). The viewer takes the splat file via ?content=<url>.
 *
 * Run before build (wired into npm scripts).
 */
import { html, css, js } from '@playcanvas/supersplat-viewer';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const outDir = join('public', 'splat');
mkdirSync(outDir, { recursive: true });

// The viewer HTML references ./index.css and ./index.js — write all three.
writeFileSync(join(outDir, 'index.html'), html);
writeFileSync(join(outDir, 'index.css'), css);
writeFileSync(join(outDir, 'index.js'), js);

console.log('✓ SuperSplat viewer emitted to public/splat/');
