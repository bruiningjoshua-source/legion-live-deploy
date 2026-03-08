// Shared level data generators for all games
// Each level targets ~10 min of gameplay

export const MARIO_LEVELS = Array.from({ length: 10 }, (_, i) => {
  const lvl = i + 1;
  const worldW = 2400 + lvl * 600;
  const gY = 340;
  const speed = 1 + lvl * 0.3;
  const coinCount = 8 + lvl * 4;
  const isBossLevel = lvl % 5 === 0;

  // Generate platforms procedurally scaled to level
  const platforms = [{ x: 0, y: gY, w: worldW, h: 60 }];
  const gaps = []; // track pit positions
  let cursor = 300;
  while (cursor < worldW - 400) {
    const w = 60 + Math.floor(Math.random() * 80);
    const h = gY - 60 - Math.floor(Math.random() * (lvl * 12));
    platforms.push({ x: cursor, y: h, w, h: 16 });
    cursor += w + 80 + Math.floor(Math.random() * 80);
    // Occasionally break ground (pit)
    if (lvl > 2 && Math.random() < 0.18 + lvl * 0.02) {
      gaps.push({ x: cursor, w: 60 + lvl * 8 });
      cursor += 60 + lvl * 8;
      platforms.push({ x: cursor, y: gY, w: 200, h: 60 });
      cursor += 210;
    } else {
      platforms.push({ x: cursor, y: gY, w: 200, h: 60 });
      cursor += 210;
    }
  }

  // Enemies
  const enemies = [];
  const enemyCount = 5 + lvl * 3;
  for (let e = 0; e < enemyCount; e++) {
    const ex = 350 + e * Math.floor((worldW - 600) / enemyCount);
    const isKoopa = e % (Math.max(1, 4 - Math.floor(lvl / 3))) === 0;
    enemies.push({
      x: ex, y: gY - (isKoopa ? 34 : 30), w: isKoopa ? 34 : 30, h: isKoopa ? 34 : 30,
      vx: -(speed + Math.random() * 0.5), alive: true,
      type: isKoopa ? 'koopa' : 'goomba',
    });
  }
  // Boss at level 5 and 10
  if (isBossLevel) {
    enemies.push({
      x: worldW - 500, y: gY - 50, w: 50, h: 50,
      vx: -(speed * 1.5), alive: true, type: 'bowser',
      hp: 5 + lvl, maxHp: 5 + lvl, isBoss: true,
      fireTimer: 0,
    });
  }

  // Coins
  const coins_obj = [];
  for (let c = 0; c < coinCount; c++) {
    coins_obj.push({ x: 300 + c * Math.floor((worldW - 600) / coinCount), y: gY - 100 - Math.random() * 80, collected: false });
  }

  // Quests per level
  const quests = [
    { id: 'coins', label: `Collect ${Math.floor(coinCount * 0.6)} coins`, target: Math.floor(coinCount * 0.6), progress: 0, done: false },
    { id: 'enemies', label: `Defeat ${Math.floor(enemyCount * 0.5)} enemies`, target: Math.floor(enemyCount * 0.5), progress: 0, done: false },
    { id: 'reach', label: 'Reach the flag', target: 1, progress: 0, done: false },
  ];
  if (isBossLevel) quests.push({ id: 'boss', label: 'Defeat the BOSS!', target: 1, progress: 0, done: false });

  return { lvl, worldW, platforms, enemies, coins_obj, flagX: worldW - 150, quests, isBossLevel, bgTheme: lvl <= 3 ? 'plains' : lvl <= 6 ? 'cave' : 'castle' };
});

export const ZELDA_LEVELS = Array.from({ length: 10 }, (_, i) => {
  const lvl = i + 1;
  const enemyCount = 3 + lvl * 2;
  const rupeeCount = 4 + lvl * 2;
  const isBossLevel = lvl % 5 === 0;
  const bossHp = isBossLevel ? 8 + lvl * 2 : 0;
  const speed = 0.8 + lvl * 0.15;

  const enemies = [];
  const positions = [
    [280,80],[480,200],[640,100],[360,280],[560,240],[700,150],[200,250],[500,300],[150,180],[650,280],
    [400,120],[300,320],[550,160],[180,320],[700,80],[250,140],[620,340],[100,200],[750,280],[450,80],
  ];
  for (let e = 0; e < Math.min(enemyCount, positions.length); e++) {
    const [ex, ey] = positions[e % positions.length];
    const isBoss2 = isBossLevel && e === enemyCount - 1;
    enemies.push({
      x: ex + (e > positions.length ? 50 : 0), y: ey, w: isBoss2 ? 36 : 26, h: isBoss2 ? 36 : 26,
      hp: isBoss2 ? bossHp : 1 + Math.floor(lvl / 3),
      maxHp: isBoss2 ? bossHp : 1 + Math.floor(lvl / 3),
      vx: (Math.random() - 0.5) * speed * 2, vy: (Math.random() - 0.5) * speed * 2,
      alive: true, type: isBoss2 ? 'boss' : (e % 3 === 0 ? 'blue' : 'red'),
      moveTimer: 0, frame: 0,
    });
  }

  const rupees = [];
  const rPositions = [[180,130],[440,90],[320,230],[600,260],[720,180],[160,300],[500,180],[280,160],[660,320],[120,140]];
  for (let r = 0; r < rupeeCount; r++) {
    const [rx, ry] = rPositions[r % rPositions.length];
    rupees.push({ x: rx, y: ry, collected: false });
  }

  const quests = [
    { id: 'rupees', label: `Collect ${rupeeCount} rupees`, target: rupeeCount, progress: 0, done: false },
    { id: 'enemies', label: `Defeat all ${enemyCount} enemies`, target: enemyCount, progress: 0, done: false },
  ];
  if (isBossLevel) quests.push({ id: 'boss', label: 'Slay the Dungeon Boss!', target: 1, progress: 0, done: false });

  const dungeonThemes = ['forest','water','fire','shadow','ice','desert','sky','lava','dark','final'];

  return { lvl, enemies, rupees, quests, isBossLevel, bossHp, theme: dungeonThemes[i] };
});

export const METALSLUG_LEVELS = Array.from({ length: 10 }, (_, i) => {
  const lvl = i + 1;
  const isBossLevel = lvl % 5 === 0;
  const worldW = 3000 + lvl * 500;
  const gY = 340;
  const speed = 0.8 + lvl * 0.1;

  const enemies = [];
  const soldierCount = 4 + lvl * 2;
  const tankCount = Math.floor(lvl / 2);
  for (let e = 0; e < soldierCount; e++) {
    enemies.push({
      x: 300 + e * Math.floor((worldW - 800) / soldierCount),
      y: gY - 32, w: 30, h: 32, hp: 1 + Math.floor(lvl / 4), alive: true,
      shootTimer: Math.max(40, 90 - lvl * 5), facing: -1, type: 'soldier',
    });
  }
  for (let t = 0; t < tankCount; t++) {
    enemies.push({
      x: 900 + t * Math.floor((worldW - 1200) / Math.max(1, tankCount)),
      y: gY - 44, w: 44, h: 44, hp: 4 + lvl, alive: true,
      shootTimer: Math.max(30, 55 - lvl * 3), facing: -1, type: 'tank',
    });
  }
  if (isBossLevel) {
    enemies.push({
      x: worldW - 500, y: gY - 60, w: 70, h: 60,
      hp: 15 + lvl * 3, alive: true,
      shootTimer: Math.max(20, 35 - lvl * 2), facing: -1, type: 'boss',
    });
  }

  const platforms = [
    { x: 0, y: gY, w: worldW, h: 60 },
    ...Array.from({ length: 6 + lvl }, (_, p) => ({
      x: 400 + p * Math.floor((worldW - 800) / (6 + lvl)),
      y: gY - 70 - Math.random() * 60, w: 80 + lvl * 5, h: 14,
    })),
  ];

  const quests = [
    { id: 'soldiers', label: `Kill ${soldierCount} soldiers`, target: soldierCount, progress: 0, done: false },
    { id: 'advance', label: 'Reach the end', target: 1, progress: 0, done: false },
  ];
  if (tankCount > 0) quests.push({ id: 'tanks', label: `Destroy ${tankCount} tanks`, target: tankCount, progress: 0, done: false });
  if (isBossLevel) quests.push({ id: 'boss', label: 'DESTROY THE BOSS MECH!', target: 1, progress: 0, done: false });

  const bgThemes = ['desert','jungle','snow','factory','city','ruins','volcano','ocean','space','final'];
  return { lvl, worldW, enemies, platforms, quests, isBossLevel, bgTheme: bgThemes[i] };
});

export const DOUBLEDRAGON_LEVELS = Array.from({ length: 10 }, (_, i) => {
  const lvl = i + 1;
  const isBossLevel = lvl % 5 === 0;
  const worldW = 2400 + lvl * 400;
  const gY = 340;
  const speed = 1.5 + lvl * 0.15;

  const enemies = [];
  const gruntCount = 4 + lvl * 2;
  const heavyCount = Math.floor(lvl / 2);
  for (let e = 0; e < gruntCount; e++) {
    enemies.push({
      x: 300 + e * Math.floor((worldW - 700) / gruntCount),
      y: gY - 44, w: 30, h: 44, hp: 2 + Math.floor(lvl / 4), alive: true,
      state: 'idle', stateTimer: 50 + Math.random() * 50, facing: -1, frame: 0, type: 'grunt',
    });
  }
  for (let h = 0; h < heavyCount; h++) {
    enemies.push({
      x: 600 + h * Math.floor((worldW - 900) / Math.max(1, heavyCount)),
      y: gY - 50, w: 36, h: 50, hp: 5 + lvl, alive: true,
      state: 'idle', stateTimer: 40, facing: -1, frame: 0, type: 'heavy',
    });
  }
  if (isBossLevel) {
    enemies.push({
      x: worldW - 450, y: gY - 55, w: 55, h: 55,
      hp: 18 + lvl * 3, alive: true,
      state: 'idle', stateTimer: 30, facing: -1, frame: 0, type: 'boss',
    });
  }

  const quests = [
    { id: 'grunts', label: `Beat up ${gruntCount} thugs`, target: gruntCount, progress: 0, done: false },
    { id: 'advance', label: 'Clear the street', target: 1, progress: 0, done: false },
  ];
  if (heavyCount > 0) quests.push({ id: 'heavies', label: `Defeat ${heavyCount} heavies`, target: heavyCount, progress: 0, done: false });
  if (isBossLevel) quests.push({ id: 'boss', label: 'TAKE DOWN THE BOSS!', target: 1, progress: 0, done: false });

  const bgThemes = ['alley','warehouse','park','docks','rooftop','subway','factory','slums','casino','lair'];
  return { lvl, worldW, enemies, quests, isBossLevel, bgTheme: bgThemes[i] };
});

export const TETRIS_CHALLENGES = Array.from({ length: 10 }, (_, i) => {
  const lvl = i + 1;
  const linesGoal = 8 + lvl * 4; // lines needed to complete level
  const timeLimit = 0; // no time limit (0 = unlimited)
  const dropInterval = Math.max(80, 600 - (lvl - 1) * 55);
  const garbageLines = Math.max(0, lvl - 4); // pre-filled garbage lines at bottom for higher levels

  const quests = [
    { id: 'lines', label: `Clear ${linesGoal} lines`, target: linesGoal, progress: 0, done: false },
    { id: 'score', label: `Score ${lvl * 500}+ pts`, target: lvl * 500, progress: 0, done: false },
  ];
  if (lvl % 5 === 0) quests.push({ id: 'tetris', label: 'Get a TETRIS (4-line clear)!', target: 1, progress: 0, done: false });
  if (lvl >= 7) quests.push({ id: 'combo', label: 'Clear 3 lines in a row', target: 3, progress: 0, done: false });

  const themes = ['classic','blue','purple','red','green','neon','gold','storm','fire','omega'];
  return { lvl, linesGoal, dropInterval, garbageLines, quests, theme: themes[i] };
});