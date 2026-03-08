import React, { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;
const CANVAS_W = COLS * BLOCK;
const CANVAS_H = ROWS * BLOCK;

const COLORS = ['', '#FF4444', '#FF8C00', '#FFD700', '#00E676', '#40C4FF', '#7C4DFF', '#FF4081'];
const SHAPES = [
  null,
  [[1,1,1,1]],                    // I
  [[1,1],[1,1]],                  // O
  [[0,1,0],[1,1,1]],              // T
  [[0,1,1],[1,1,0]],              // S
  [[1,1,0],[0,1,1]],              // Z
  [[1,0,0],[1,1,1]],              // J
  [[0,0,1],[1,1,1]],              // L
];

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = SHAPES[type].map(r => [...r]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function rotate(shape) {
  const R = shape.length, C = shape[0].length;
  return Array.from({ length: C }, (_, c) => Array.from({ length: R }, (_, r) => shape[R - 1 - r][c]));
}

function isValid(board, piece, dx = 0, dy = 0, shape = null) {
  const s = shape || piece.shape;
  return s.every((row, r) =>
    row.every((v, c) => {
      if (!v) return true;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || !board[ny][nx]);
    })
  );
}

function placePiece(board, piece) {
  const b = board.map(r => [...r]);
  piece.shape.forEach((row, r) => row.forEach((v, c) => {
    if (v) { const y = piece.y + r, x = piece.x + c; if (y >= 0 && y < ROWS) b[y][x] = piece.type; }
  }));
  return b;
}

function clearLines(board) {
  const newBoard = board.filter(row => row.some(v => !v));
  const cleared = ROWS - newBoard.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...empty, ...newBoard], cleared };
}

const SCORE_TABLE = [0, 100, 300, 500, 800];

export default function TetrisGame() {
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const lastDropRef = useRef(0);
  const lastKeyRef = useRef({});

  const [ui, setUi] = useState({ score: 0, lines: 0, level: 1, gameOver: false });

  function initState() {
    const current = randomPiece();
    const next = randomPiece();
    stateRef.current = { board: createBoard(), current, next, score: 0, lines: 0, level: 1, gameOver: false, dropInterval: 600 };
  }

  const resetGame = useCallback(() => {
    initState();
    setUi({ score: 0, lines: 0, level: 1, gameOver: false });
  }, []);

  useEffect(() => { initState(); }, []);

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      // Prevent page scroll on arrow keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.code] = false; lastKeyRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx = canvas.getContext('2d');
    const nctx = nextCanvas.getContext('2d');

    function drawBlock(context, x, y, color, size = BLOCK) {
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.3)';
      context.fillRect(x * size + 2, y * size + 2, size * 0.4, size * 0.15);
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(x * size + size * 0.6, y * size + size * 0.6, size * 0.35, size * 0.35);
    }

    function drawGhost(s) {
      let ghostY = s.current.y;
      while (isValid(s.board, s.current, 0, ghostY - s.current.y + 1)) ghostY++;
      if (ghostY === s.current.y) return;
      s.current.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) {
          const gx = s.current.x + c, gy = ghostY + r;
          if (gy >= 0 && gy < ROWS) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(gx * BLOCK + 1, gy * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          }
        }
      }));
    }

    function render() {
      const s = stateRef.current;
      if (!s) return;

      // Board background
      ctx.fillStyle = '#0a0a0e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(CANVAS_W, r * BLOCK); ctx.stroke(); }
      for (let c = 0; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, CANVAS_H); ctx.stroke(); }

      // Board cells
      s.board.forEach((row, r) => row.forEach((v, c) => { if (v) drawBlock(ctx, c, r, COLORS[v]); }));

      // Ghost
      drawGhost(s);

      // Current piece
      s.current.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) drawBlock(ctx, s.current.x + c, s.current.y + r, COLORS[s.current.type]);
      }));

      // Game Over overlay
      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 14);
        ctx.textAlign = 'left';
      }

      // Next piece preview
      nctx.fillStyle = '#111116';
      nctx.fillRect(0, 0, 120, 120);
      const ns = 24;
      const ox = (120 - s.next.shape[0].length * ns) / 2;
      const oy = (120 - s.next.shape.length * ns) / 2;
      s.next.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) {
          nctx.fillStyle = COLORS[s.next.type];
          nctx.fillRect(ox + c * ns + 1, oy + r * ns + 1, ns - 2, ns - 2);
          nctx.fillStyle = 'rgba(255,255,255,0.3)';
          nctx.fillRect(ox + c * ns + 2, oy + r * ns + 2, ns * 0.4, ns * 0.15);
        }
      }));
    }

    function update(timestamp) {
      const s = stateRef.current;
      if (!s || s.gameOver) { render(); rafRef.current = requestAnimationFrame(update); return; }

      const keys = keysRef.current;

      // Key repeat helper
      function pressedOnce(code, repeatMs = 120) {
        const now = Date.now();
        if (keys[code]) {
          if (!lastKeyRef.current[code] || now - lastKeyRef.current[code] > repeatMs) {
            lastKeyRef.current[code] = now;
            return true;
          }
        }
        return false;
      }

      if (pressedOnce('ArrowLeft', 110)) {
        if (isValid(s.board, s.current, -1)) s.current.x--;
      }
      if (pressedOnce('ArrowRight', 110)) {
        if (isValid(s.board, s.current, 1)) s.current.x++;
      }
      if (pressedOnce('ArrowDown', 55)) {
        if (isValid(s.board, s.current, 0, 1)) s.current.y++;
        else { landPiece(s); render(); rafRef.current = requestAnimationFrame(update); return; }
      }
      if (pressedOnce('ArrowUp', 200)) {
        const rotated = rotate(s.current.shape);
        if (isValid(s.board, s.current, 0, 0, rotated)) s.current.shape = rotated;
        else if (isValid(s.board, s.current, 1, 0, rotated)) { s.current.x++; s.current.shape = rotated; }
        else if (isValid(s.board, s.current, -1, 0, rotated)) { s.current.x--; s.current.shape = rotated; }
      }
      if (pressedOnce('Space', 300)) {
        while (isValid(s.board, s.current, 0, 1)) s.current.y++;
        landPiece(s); render(); rafRef.current = requestAnimationFrame(update); return;
      }

      // Auto-drop
      const elapsed = timestamp - lastDropRef.current;
      if (elapsed > s.dropInterval) {
        lastDropRef.current = timestamp;
        if (isValid(s.board, s.current, 0, 1)) {
          s.current.y++;
        } else {
          landPiece(s);
        }
      }

      render();
      rafRef.current = requestAnimationFrame(update);
    }

    function landPiece(s) {
      s.board = placePiece(s.board, s.current);
      const { board: nb, cleared } = clearLines(s.board);
      s.board = nb;
      if (cleared > 0) {
        s.lines += cleared;
        s.score += SCORE_TABLE[cleared] * s.level;
        s.level = Math.floor(s.lines / 10) + 1;
        s.dropInterval = Math.max(80, 600 - (s.level - 1) * 55);
      }
      s.current = s.next;
      s.next = randomPiece();
      if (!isValid(s.board, s.current)) {
        s.gameOver = true;
        setUi({ score: s.score, lines: s.lines, level: s.level, gameOver: true });
        return;
      }
      setUi({ score: s.score, lines: s.lines, level: s.level, gameOver: false });
    }

    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="bg-[#0a0a0e] flex items-start justify-center gap-6 p-4 min-h-[680px]">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block rounded-lg border border-white/10" tabIndex={0} />
      <div className="flex flex-col gap-4 min-w-[120px]">
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <p className="text-white/40 text-xs mb-1">SCORE</p>
          <p className="text-white font-bold text-xl tabular-nums">{ui.score.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <p className="text-white/40 text-xs mb-1">LEVEL</p>
          <p className="text-white font-bold text-xl">{ui.level}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <p className="text-white/40 text-xs mb-1">LINES</p>
          <p className="text-white font-bold text-xl">{ui.lines}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <p className="text-white/40 text-xs mb-2">NEXT</p>
          <canvas ref={nextCanvasRef} width={120} height={120} className="block rounded" />
        </div>
        {ui.gameOver && (
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Restart
          </button>
        )}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
          <p className="text-white/40 text-xs font-medium mb-2">CONTROLS</p>
          {[['← →','Move'],['↑','Rotate'],['↓','Soft Drop'],['Space','Hard Drop']].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 text-xs font-mono">{k}</span>
              <span className="text-white/30 text-xs">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}