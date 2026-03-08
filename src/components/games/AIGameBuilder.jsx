import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Play, Loader2, ChevronRight, Sparkles, Code2, RefreshCw } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'A space shooter where you dodge asteroids and shoot aliens',
  'A breakout clone with power-ups and multiple levels',
  'A snake game where the snake gets faster each level',
  'A flappy bird clone with neon visuals',
  'A simple racing game where you dodge traffic',
];

const SYSTEM_PROMPT = `You are a world-class HTML5 Canvas game developer. Your task is to generate a COMPLETE, WORKING, self-contained JavaScript game.

STRICT OUTPUT FORMAT:
- Return a JSON object with exactly one key: "code"
- The value must be a string containing ONLY valid JavaScript — no markdown, no explanation, no fences.
- Example: {"code": "(function(){ ... })();"}

GAME CODE REQUIREMENTS:
- Must be a self-contained IIFE: (function(){ ... })();
- The canvas element already exists in the DOM with id="ai-game-canvas" and size 640x360px.
- Use requestAnimationFrame for the game loop.
- Keyboard input via window.addEventListener (keydown/keyup only — clean up on game over).
- Draw EVERYTHING using the 2D canvas API. No images, no DOM, no SVG, no external libraries.
- Implement a proper game loop: update logic then render.
- Include: scoring HUD, lives/health, level indicator, collision detection, win screen, game-over screen.
- Add a RESTART mechanism: press R key or click/tap the canvas to restart.
- Code must be syntactically correct JavaScript (ES6). No TypeScript, no imports, no require().
- The game must be immediately fun and playable.
- Keep code under 400 lines for reliability.`;

export default function AIGameBuilder() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [gameCode, setGameCode] = useState(null);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  const runGame = useCallback((code) => {
    // Cleanup previous game
    if (cleanupRef.current) { try { cleanupRef.current(); } catch (_) {} cleanupRef.current = null; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const fn = new Function('canvas', `
        "use strict";
        const ctx = canvas.getContext('2d');
        let _rafId = null;
        const _origRAF = window.requestAnimationFrame.bind(window);
        const _rafIds = [];
        window._gameRAF = (cb) => { const id = _origRAF(cb); _rafIds.push(id); return id; };
        ${code.replace(/requestAnimationFrame/g, 'window._gameRAF')}
        return function cleanup() {
          _rafIds.forEach(id => cancelAnimationFrame(id));
          _rafIds.length = 0;
        };
      `);
      const cleanup = fn(canvas);
      cleanupRef.current = typeof cleanup === 'function' ? cleanup : null;
      setIsRunning(true);
    } catch (err) {
      setError(`Runtime error: ${err.message}`);
      setIsRunning(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setGameCode(null);
    setIsRunning(false);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nGame request: "${prompt.trim()}"\n\nGenerate the complete JavaScript game code now. Output ONLY the raw JavaScript code, nothing else.`,
        model: 'claude_sonnet_4_6',
      });

      const code = typeof result === 'string' ? result : result?.text || result?.content || String(result);
      // Strip any accidental markdown fences
      const cleaned = code.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/^```\n?/gm, '').trim();
      setGameCode(cleaned);
    } catch (err) {
      setError(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating]);

  useEffect(() => {
    if (gameCode && canvasRef.current) {
      runGame(gameCode);
    }
  }, [gameCode, runGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (cleanupRef.current) { try { cleanupRef.current(); } catch (_) {} } };
  }, []);

  return (
    <div className="space-y-6">
      {/* Builder Header */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">AI Game Builder</h2>
            <p className="text-white/40 text-sm">Describe any game and watch it come to life</p>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            placeholder="Describe your game idea... (e.g. 'A space shooter where you dodge asteroids')"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 outline-none focus:border-amber-500/50 resize-none h-24 leading-relaxed"
            disabled={generating}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-white/20 text-xs">{prompt.length}/300</span>
          </div>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Building your game...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate Game</>
          )}
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 text-xs mt-1 hover:text-red-400">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Canvas */}
      <AnimatePresence>
        {(gameCode || generating) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-white/60 text-sm font-medium">
                  {generating ? 'Generating...' : isRunning ? 'Game Running' : 'Ready'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {gameCode && (
                  <button
                    onClick={() => runGame(gameCode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Restart
                  </button>
                )}
              </div>
            </div>

            <div className="bg-black flex items-center justify-center p-4 min-h-[380px] relative">
              {generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
                  <p className="text-white/60 text-sm">AI is writing your game...</p>
                  <p className="text-white/30 text-xs mt-2">This takes 15-30 seconds</p>
                </div>
              )}
              <canvas
                id="ai-game-canvas"
                ref={canvasRef}
                width={640}
                height={360}
                className="block rounded-lg border border-white/10 max-w-full"
                style={{ aspectRatio: '640/360', imageRendering: 'pixelated' }}
                tabIndex={0}
              />
            </div>

            {/* Code toggle */}
            {gameCode && (
              <details className="border-t border-white/[0.06]">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-white/40 hover:text-white/60 text-xs select-none">
                  <Code2 className="w-3.5 h-3.5" /> View Generated Code
                  <ChevronRight className="w-3.5 h-3.5 ml-auto details-open:rotate-90 transition-transform" />
                </summary>
                <div className="bg-black/60 p-4 max-h-72 overflow-auto">
                  <pre className="text-green-400/80 text-xs font-mono whitespace-pre-wrap leading-relaxed">{gameCode}</pre>
                </div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      {!gameCode && !generating && (
        <div className="text-center py-12 text-white/20">
          <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Describe a game above and click Generate</p>
          <p className="text-xs mt-1 opacity-60">AI will build a fully playable game in seconds</p>
        </div>
      )}
    </div>
  );
}