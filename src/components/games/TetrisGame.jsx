import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';
import { TETRIS_CHALLENGES } from './GameLevelData';

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;
const CANVAS_W = COLS * BLOCK;
const CANVAS_H = ROWS * BLOCK;

const COLORS = ['','#FF4444','#FF8C00','#FFD700','#00E676','#40C4FF','#7C4DFF','#FF4081'];
const SHAPES = [
  null,
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
];

const THEME_COLORS = {
  classic: ['#080810','rgba(80,60,180,0.3)'],
  blue: ['#080c20','rgba(40,80,200,0.4)'],
  purple: ['#10080c','rgba(120,40,160,0.4)'],
  red: ['#120808','rgba(180,40,40,0.4)'],
  green: ['#081208','rgba(40,160,80,0.4)'],
  neon: ['#050510','rgba(0,255,180,0.3)'],
  gold: ['#100c00','rgba(200,160,0,0.4)'],
  storm: ['#060810','rgba(60,100,200,0.4)'],
  fire: ['#120400','rgba(220,80,0,0.4)'],
  omega: ['#020208','rgba(200,0,200,0.4)'],
};

function createBoard() { return Array.from({length:ROWS}, ()=>Array(COLS).fill(0)); }
function randomPiece() {
  const type = Math.floor(Math.random()*7)+1;
  const shape = SHAPES[type].map(r=>[...r]);
  return { type, shape, x: Math.floor(COLS/2)-Math.floor(shape[0].length/2), y:0 };
}
function rotate(shape) {
  const R=shape.length, C=shape[0].length;
  return Array.from({length:C},(_,c)=>Array.from({length:R},(_,r)=>shape[R-1-r][c]));
}
function isValid(board, piece, dx=0, dy=0, shape=null) {
  const s=shape||piece.shape;
  return s.every((row,r)=>row.every((v,c)=>{
    if(!v) return true;
    const nx=piece.x+c+dx, ny=piece.y+r+dy;
    return nx>=0&&nx<COLS&&ny<ROWS&&(ny<0||!board[ny][nx]);
  }));
}
function placePiece(board, piece) {
  const b=board.map(r=>[...r]);
  piece.shape.forEach((row,r)=>row.forEach((v,c)=>{
    if(v){const y=piece.y+r,x=piece.x+c;if(y>=0&&y<ROWS)b[y][x]=piece.type;}
  }));
  return b;
}
function clearLines(board) {
  const nb=board.filter(row=>row.some(v=>!v));
  const cleared=ROWS-nb.length;
  const empty=Array.from({length:cleared},()=>Array(COLS).fill(0));
  return {board:[...empty,...nb], cleared};
}
function generateGarbage(lines) {
  return Array.from({length:lines},()=>{
    const row=Array.from({length:COLS},(_,i)=>i===Math.floor(Math.random()*COLS)?0:Math.floor(Math.random()*7)+1);
    return row;
  });
}

const SCORE_TABLE=[0,100,300,500,800];

export default function TetrisGame() {
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const lastDropRef = useRef(0);
  const lastKeyRef = useRef({});
  const [currentLevel, setCurrentLevel] = useState(0);
  const [ui, setUi] = useState({score:0,lines:0,level:1,gameOver:false,levelComplete:false,quests:[]});
  const [showLevelCard, setShowLevelCard] = useState(true);

  function initState(lvlIdx, carryScore) {
    const challenge = TETRIS_CHALLENGES[lvlIdx];
    const current = randomPiece();
    const next = randomPiece();
    let board = createBoard();
    // Pre-fill garbage lines
    if (challenge.garbageLines > 0) {
      const garbage = generateGarbage(Math.min(challenge.garbageLines, 6));
      for (let i=0; i<garbage.length; i++) {
        board[ROWS-1-i] = garbage[i];
      }
    }
    stateRef.current = {
      board, current, next,
      score: carryScore || 0,
      totalScore: carryScore || 0,
      lines: 0, level: lvlIdx+1,
      gameOver: false,
      levelComplete: false,
      dropInterval: challenge.dropInterval,
      linesGoal: challenge.linesGoal,
      quests: JSON.parse(JSON.stringify(challenge.quests)),
      comboCount: 0,
      maxCombo: 0,
      tetrises: 0,
      theme: challenge.theme,
    };
  }

  const loadLevel = useCallback((lvlIdx, carryScore) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    initState(lvlIdx, carryScore);
    setCurrentLevel(lvlIdx);
    setShowLevelCard(true);
    const s = stateRef.current;
    setUi({score:s.score,lines:0,level:lvlIdx+1,gameOver:false,levelComplete:false,quests:s.quests});
    setTimeout(()=>setShowLevelCard(false), 2500);
  }, []);

  const resetGame = useCallback(()=>{ loadLevel(0, 0); }, [loadLevel]);

  useEffect(()=>{ loadLevel(0, 0); }, []);

  useEffect(()=>{
    const down=(e)=>{
      keysRef.current[e.code]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    };
    const up=(e)=>{keysRef.current[e.code]=false;lastKeyRef.current[e.code]=false;};
    window.addEventListener('keydown',down); window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const nextCanvas=nextCanvasRef.current;
    if(!canvas||!nextCanvas) return;
    const ctx=canvas.getContext('2d');
    const nctx=nextCanvas.getContext('2d');

    function drawBlock(context, x, y, color, size=BLOCK) {
      const px=x*size, py=y*size;
      context.fillStyle=color; context.fillRect(px+1,py+1,size-2,size-2);
      context.fillStyle='rgba(255,255,255,0.45)';
      context.fillRect(px+1,py+1,size-2,4); context.fillRect(px+1,py+1,4,size-2);
      context.fillStyle='rgba(0,0,0,0.4)';
      context.fillRect(px+1,py+size-5,size-2,4); context.fillRect(px+size-5,py+1,4,size-2);
      context.fillStyle='rgba(255,255,255,0.12)'; context.fillRect(px+5,py+5,size-10,size-10);
      context.strokeStyle='rgba(0,0,0,0.5)'; context.lineWidth=1;
      context.strokeRect(px+0.5,py+0.5,size-1,size-1);
    }

    function drawGhost(s) {
      let ghostY=s.current.y;
      while(isValid(s.board,s.current,0,ghostY-s.current.y+1)) ghostY++;
      if(ghostY===s.current.y) return;
      s.current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v){
          const gx=s.current.x+c, gy=ghostY+r;
          if(gy>=0&&gy<ROWS){ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(gx*BLOCK+1,gy*BLOCK+1,BLOCK-2,BLOCK-2);}
        }
      }));
    }

    function render() {
      const s=stateRef.current;
      if(!s) return;
      const [bgCol, glowCol] = THEME_COLORS[s.theme] || THEME_COLORS.classic;
      ctx.fillStyle=bgCol; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

      const lg=ctx.createLinearGradient(0,0,20,0);
      lg.addColorStop(0,glowCol); lg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=lg; ctx.fillRect(0,0,20,CANVAS_H);
      const rg=ctx.createLinearGradient(CANVAS_W,0,CANVAS_W-20,0);
      rg.addColorStop(0,glowCol); rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rg; ctx.fillRect(CANVAS_W-20,0,20,CANVAS_H);

      ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
      for(let r=0;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*BLOCK);ctx.lineTo(CANVAS_W,r*BLOCK);ctx.stroke();}
      for(let c=0;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*BLOCK,0);ctx.lineTo(c*BLOCK,CANVAS_H);ctx.stroke();}

      s.board.forEach((row,r)=>row.forEach((v,c)=>{if(v)drawBlock(ctx,c,r,COLORS[v]);}));
      drawGhost(s);
      s.current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v) drawBlock(ctx,s.current.x+c,s.current.y+r,COLORS[s.current.type]);
      }));

      // Progress bar for level goal
      const prog = Math.min(s.lines / s.linesGoal, 1);
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(0,CANVAS_H-8,CANVAS_W,8);
      const barColor = prog < 0.5 ? '#40C4FF' : prog < 0.8 ? '#FFD700' : '#00E676';
      ctx.fillStyle=barColor; ctx.fillRect(0,CANVAS_H-8,CANVAS_W*prog,8);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='bold 9px monospace';
      ctx.textAlign='center'; ctx.fillText(`${s.lines}/${s.linesGoal} LINES`,CANVAS_W/2,CANVAS_H-1);
      ctx.textAlign='left';

      if(s.gameOver){
        ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#ff4444'; ctx.font='bold 28px monospace'; ctx.textAlign='center';
        ctx.fillText('GAME OVER',CANVAS_W/2,CANVAS_H/2-20);
        ctx.fillStyle='#fff'; ctx.font='16px monospace';
        ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+14);
        ctx.textAlign='left';
      }
      if(s.levelComplete){
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#ffd700'; ctx.font='bold 26px monospace'; ctx.textAlign='center';
        ctx.fillText(`LEVEL ${currentLevel+1} CLEAR!`,CANVAS_W/2,CANVAS_H/2-40);
        ctx.fillStyle='#00e676'; ctx.font='14px monospace';
        const doneQ=s.quests.filter(q=>q.done).length;
        ctx.fillText(`Quests: ${doneQ}/${s.quests.length}`,CANVAS_W/2,CANVAS_H/2-10);
        ctx.fillStyle='#fff'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+16);
        ctx.textAlign='left';
      }

      // Next preview
      nctx.fillStyle='#111116'; nctx.fillRect(0,0,120,120);
      const ns=24;
      const ox=(120-s.next.shape[0].length*ns)/2;
      const oy=(120-s.next.shape.length*ns)/2;
      s.next.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v){
          nctx.fillStyle=COLORS[s.next.type]; nctx.fillRect(ox+c*ns+1,oy+r*ns+1,ns-2,ns-2);
          nctx.fillStyle='rgba(255,255,255,0.3)'; nctx.fillRect(ox+c*ns+2,oy+r*ns+2,ns*0.4,ns*0.15);
        }
      }));
    }

    function update(timestamp) {
      const s=stateRef.current;
      if(!s||s.gameOver||s.levelComplete){render();rafRef.current=requestAnimationFrame(update);return;}
      const keys=keysRef.current;
      function pressedOnce(code, repeatMs=120){
        const now=Date.now();
        if(keys[code]){if(!lastKeyRef.current[code]||now-lastKeyRef.current[code]>repeatMs){lastKeyRef.current[code]=now;return true;}}
        return false;
      }
      if(pressedOnce('ArrowLeft',110)){if(isValid(s.board,s.current,-1))s.current.x--;}
      if(pressedOnce('ArrowRight',110)){if(isValid(s.board,s.current,1))s.current.x++;}
      if(pressedOnce('ArrowDown',55)){
        if(isValid(s.board,s.current,0,1))s.current.y++;
        else{landPiece(s);render();rafRef.current=requestAnimationFrame(update);return;}
      }
      if(pressedOnce('ArrowUp',200)){
        const rot=rotate(s.current.shape);
        if(isValid(s.board,s.current,0,0,rot))s.current.shape=rot;
        else if(isValid(s.board,s.current,1,0,rot)){s.current.x++;s.current.shape=rot;}
        else if(isValid(s.board,s.current,-1,0,rot)){s.current.x--;s.current.shape=rot;}
      }
      if(pressedOnce('Space',300)){
        while(isValid(s.board,s.current,0,1))s.current.y++;
        landPiece(s);render();rafRef.current=requestAnimationFrame(update);return;
      }
      const elapsed=timestamp-lastDropRef.current;
      if(elapsed>s.dropInterval){
        lastDropRef.current=timestamp;
        if(isValid(s.board,s.current,0,1))s.current.y++;
        else landPiece(s);
      }
      render();
      rafRef.current=requestAnimationFrame(update);
    }

    function landPiece(s) {
      s.board=placePiece(s.board,s.current);
      const {board:nb,cleared}=clearLines(s.board);
      s.board=nb;
      if(cleared>0){
        s.lines+=cleared;
        s.score+=SCORE_TABLE[Math.min(cleared,4)]*s.level;
        s.comboCount++;
        if(s.comboCount>1) s.score+=(s.comboCount-1)*50*s.level;
        if(s.comboCount>s.maxCombo) s.maxCombo=s.comboCount;
        if(cleared===4){ s.tetrises++; GameAudio.lineClear(4);
          const tq=s.quests.find(q=>q.id==='tetris');
          if(tq&&!tq.done){tq.progress++;if(tq.progress>=tq.target)tq.done=true;}
        } else { GameAudio.lineClear(cleared); }
        const lq=s.quests.find(q=>q.id==='lines');
        if(lq&&!lq.done){lq.progress=s.lines;if(lq.progress>=lq.target)lq.done=true;}
        const sq=s.quests.find(q=>q.id==='score');
        if(sq&&!sq.done){sq.progress=s.score;if(sq.progress>=sq.target)sq.done=true;}
        const cq=s.quests.find(q=>q.id==='combo');
        if(cq&&!cq.done){cq.progress=Math.max(cq.progress,s.comboCount);if(cq.progress>=cq.target)cq.done=true;}
        s.dropInterval=Math.max(80,TETRIS_CHALLENGES[currentLevel].dropInterval-(s.level-1)*20);
        if(s.lines>=s.linesGoal){
          s.levelComplete=true; GameAudio.win();
          setUi({score:s.score,lines:s.lines,level:s.level,gameOver:false,levelComplete:true,quests:[...s.quests]});
          return;
        }
      } else {
        s.comboCount=0;
        GameAudio.land();
      }
      s.current=s.next; s.next=randomPiece();
      if(!isValid(s.board,s.current)){
        s.gameOver=true; GameAudio.gameOver();
        setUi({score:s.score,lines:s.lines,level:s.level,gameOver:true,levelComplete:false,quests:[...s.quests]});
        return;
      }
      setUi({score:s.score,lines:s.lines,level:s.level,gameOver:false,levelComplete:false,quests:[...s.quests]});
    }

    rafRef.current=requestAnimationFrame(update);
    return()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);};
  },[currentLevel]);

  const handleNextLevel = useCallback(()=>{
    const s=stateRef.current;
    const nextIdx=currentLevel+1;
    if(nextIdx>=TETRIS_CHALLENGES.length){ loadLevel(0,0); }
    else { loadLevel(nextIdx, s?.score||0); }
  },[currentLevel, loadLevel]);

  const challenge = TETRIS_CHALLENGES[currentLevel];

  return (
    <div className="bg-[#0a0a0e] flex flex-col items-center">
      {showLevelCard && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
          <div className="text-center p-6">
            <div className="text-yellow-400 font-bold text-3xl mb-2" style={{fontFamily:'monospace'}}>LEVEL {currentLevel+1}</div>
            <div className="text-purple-300 text-lg mb-1" style={{fontFamily:'monospace'}}>{challenge.theme.toUpperCase()} MODE</div>
            <div className="text-white/60 text-sm mb-4" style={{fontFamily:'monospace'}}>Clear {challenge.linesGoal} lines to advance</div>
            <div className="text-white/70 text-xs space-y-1" style={{fontFamily:'monospace'}}>
              {challenge.quests.map((q,i)=>(<div key={i}>◆ {q.label}</div>))}
            </div>
          </div>
        </div>
      )}
      <div className="hidden sm:flex items-start justify-center gap-6 p-4">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block rounded-lg border border-white/10" tabIndex={0}/>
        <div className="flex flex-col gap-3 min-w-[140px]">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-white/40 text-xs mb-1">LEVEL</p>
            <p className="text-yellow-400 font-bold text-xl">{currentLevel+1}</p>
            <p className="text-white/30 text-xs">{challenge?.theme?.toUpperCase()}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-white/40 text-xs mb-1">SCORE</p>
            <p className="text-white font-bold text-xl tabular-nums">{ui.score.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-white/40 text-xs mb-1">LINES</p>
            <p className="text-white font-bold text-xl">{ui.lines} / {challenge?.linesGoal}</p>
            <div className="mt-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{width:`${Math.min((ui.lines/(challenge?.linesGoal||1))*100,100)}%`}}/>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-white/40 text-xs mb-2">NEXT</p>
            <canvas ref={nextCanvasRef} width={120} height={120} className="block rounded"/>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-white/40 text-xs mb-1">QUESTS</p>
            {ui.quests.map((q,i)=>(
              <div key={i} className={`text-xs flex items-center gap-1 ${q.done?'text-green-400':'text-white/50'}`}>
                <span>{q.done?'✓':'○'}</span><span className="truncate">{q.label}</span>
              </div>
            ))}
          </div>
          {ui.levelComplete && <button onClick={handleNextLevel} className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-sm">{currentLevel+1>=TETRIS_CHALLENGES.length?'Restart':'Next Level →'}</button>}
          {ui.gameOver && <button onClick={resetGame} className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-sm">Restart</button>}
        </div>
      </div>
      <div className="sm:hidden w-full">
        <div className="flex justify-around py-1.5 px-3 bg-black/70 text-xs text-white/60 font-mono">
          <span>LVL <span className="text-yellow-400 font-bold">{currentLevel+1}</span></span>
          <span>SCORE <span className="text-white font-bold">{ui.score.toLocaleString()}</span></span>
          <span>LINES <span className="text-white font-bold">{ui.lines}/{challenge?.linesGoal}</span></span>
        </div>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full block" style={{aspectRatio:`${CANVAS_W}/${CANVAS_H}`}} tabIndex={0}/>
        <canvas ref={nextCanvasRef} width={120} height={120} className="hidden"/>
        <div className="bg-black/80 border-t border-white/10">
          <GameMobileControls keysRef={keysRef} variant="tetris"/>
        </div>
        {(ui.gameOver||ui.levelComplete) && (
          <div className="p-3 flex justify-center gap-3">
            {ui.levelComplete && <button onClick={handleNextLevel} className="px-6 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-sm">{currentLevel+1>=TETRIS_CHALLENGES.length?'Restart':'Next Level →'}</button>}
            {ui.gameOver && <button onClick={resetGame} className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-sm">Restart</button>}
          </div>
        )}
      </div>
    </div>
  );
}