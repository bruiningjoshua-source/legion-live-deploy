/**
 * SeededGameLibrary — 80 games across all categories with full metadata.
 */

export const GAME_CATEGORIES = [
  { id:'all', label:'All Games', emoji:'🎮' },
  { id:'action', label:'Action', emoji:'⚡' },
  { id:'rpg', label:'RPG', emoji:'🐉' },
  { id:'fps', label:'FPS', emoji:'🔫' },
  { id:'sports', label:'Sports', emoji:'⚽' },
  { id:'racing', label:'Racing', emoji:'🏎️' },
  { id:'strategy', label:'Strategy', emoji:'♟️' },
  { id:'sandbox', label:'Sandbox', emoji:'🏗️' },
  { id:'horror', label:'Horror', emoji:'👻' },
  { id:'fighting', label:'Fighting', emoji:'👊' },
  { id:'puzzle', label:'Puzzle', emoji:'🧩' },
  { id:'platformer', label:'Platform', emoji:'🍄' },
  { id:'moba', label:'MOBA', emoji:'🏆' },
  { id:'battle_royale', label:'Battle Royale', emoji:'🎯' },
  { id:'simulation', label:'Sim', emoji:'🌍' },
  { id:'indie', label:'Indie', emoji:'🎨' },
];

export const SEEDED_GAMES = [
  // ACTION
  { id:'gta6', title:'GTA VI', category:'action', platform:'PS5/PC', emoji:'🚗', rating:9.8, streams:12400, viewers:890000, tags:['open-world','crime'], trending:true, featured:true, bg:'from-orange-900 to-red-950', publisher:'Rockstar Games', releaseYear:2025, players:'1-32' },
  { id:'rdr2', title:'Red Dead Redemption 2', category:'action', platform:'Multi', emoji:'🤠', rating:9.7, streams:8200, viewers:420000, tags:['western','open-world'], trending:false, featured:true, bg:'from-amber-900 to-red-950', publisher:'Rockstar Games', releaseYear:2018, players:'1-32' },
  { id:'elden_ring', title:'Elden Ring', category:'action', platform:'Multi', emoji:'⚔️', rating:9.6, streams:15600, viewers:650000, tags:['soulslike','rpg'], trending:true, featured:true, bg:'from-yellow-900 to-slate-950', publisher:'FromSoftware', releaseYear:2022, players:'1-4' },
  { id:'spider_man2', title:"Marvel's Spider-Man 2", category:'action', platform:'PS5', emoji:'🕷️', rating:9.4, streams:9100, viewers:520000, tags:['superhero','open-world'], trending:false, featured:true, bg:'from-red-900 to-blue-950', publisher:'Insomniac', releaseYear:2023, players:'1' },
  { id:'dmc5', title:'Devil May Cry 5', category:'action', platform:'Multi', emoji:'🔱', rating:9.2, streams:3800, viewers:140000, tags:['hack-slash','stylish'], trending:false, featured:false, bg:'from-slate-900 to-red-950', publisher:'Capcom', releaseYear:2019, players:'1-3' },
  { id:'sekiro', title:'Sekiro', category:'action', platform:'Multi', emoji:'⛩️', rating:9.5, streams:5600, viewers:280000, tags:['soulslike','ninja'], trending:false, featured:false, bg:'from-stone-900 to-red-950', publisher:'FromSoftware', releaseYear:2019, players:'1' },

  // RPG
  { id:'baldurs_gate3', title:"Baldur's Gate 3", category:'rpg', platform:'Multi', emoji:'🐉', rating:9.9, streams:28000, viewers:1500000, tags:['crpg','dnd'], trending:true, featured:true, bg:'from-purple-900 to-slate-950', publisher:'Larian Studios', releaseYear:2023, players:'1-4' },
  { id:'cyberpunk2077', title:'Cyberpunk 2077', category:'rpg', platform:'Multi', emoji:'🤖', rating:9.0, streams:11200, viewers:620000, tags:['open-world','sci-fi'], trending:true, featured:true, bg:'from-cyan-900 to-slate-950', publisher:'CD Projekt Red', releaseYear:2020, players:'1' },
  { id:'witcher3', title:'The Witcher 3', category:'rpg', platform:'Multi', emoji:'🗡️', rating:9.8, streams:7600, viewers:380000, tags:['fantasy','open-world'], trending:false, featured:false, bg:'from-emerald-900 to-slate-950', publisher:'CD Projekt Red', releaseYear:2015, players:'1' },
  { id:'ff7_rebirth', title:'Final Fantasy VII Rebirth', category:'rpg', platform:'PS5', emoji:'⚡', rating:9.3, streams:14200, viewers:720000, tags:['jrpg','classic'], trending:true, featured:true, bg:'from-blue-900 to-slate-950', publisher:'Square Enix', releaseYear:2024, players:'1' },
  { id:'persona5', title:'Persona 5 Royal', category:'rpg', platform:'Multi', emoji:'🃏', rating:9.5, streams:5800, viewers:290000, tags:['jrpg','anime'], trending:false, featured:false, bg:'from-red-900 to-black', publisher:'Atlus', releaseYear:2020, players:'1' },
  { id:'starfield', title:'Starfield', category:'rpg', platform:'PC/Xbox', emoji:'🚀', rating:7.8, streams:16800, viewers:840000, tags:['sci-fi','open-world'], trending:false, featured:false, bg:'from-slate-900 to-indigo-950', publisher:'Bethesda', releaseYear:2023, players:'1' },
  { id:'dragon_dogma2', title:"Dragon's Dogma 2", category:'rpg', platform:'Multi', emoji:'🔥', rating:8.8, streams:6200, viewers:320000, tags:['fantasy','action-rpg'], trending:true, featured:false, bg:'from-orange-900 to-purple-950', publisher:'Capcom', releaseYear:2024, players:'1' },

  // FPS
  { id:'cod_warzone', title:'Call of Duty: Warzone', category:'fps', platform:'Multi', emoji:'🎯', rating:8.2, streams:22000, viewers:1200000, tags:['battle-royale','fps'], trending:true, featured:true, bg:'from-slate-800 to-green-950', publisher:'Activision', releaseYear:2020, players:'1-150' },
  { id:'apex_legends', title:'Apex Legends', category:'fps', platform:'Multi', emoji:'🔫', rating:8.5, streams:18500, viewers:980000, tags:['battle-royale','fps'], trending:true, featured:false, bg:'from-red-900 to-slate-950', publisher:'EA Respawn', releaseYear:2019, players:'1-60' },
  { id:'valorant', title:'VALORANT', category:'fps', platform:'PC', emoji:'🎮', rating:8.7, streams:31000, viewers:1600000, tags:['tactical','esports'], trending:true, featured:true, bg:'from-pink-900 to-slate-950', publisher:'Riot Games', releaseYear:2020, players:'10' },
  { id:'cs2', title:'Counter-Strike 2', category:'fps', platform:'PC', emoji:'💣', rating:8.4, streams:26000, viewers:1400000, tags:['tactical','esports'], trending:true, featured:true, bg:'from-slate-800 to-yellow-950', publisher:'Valve', releaseYear:2023, players:'10' },
  { id:'doom_eternal', title:'DOOM Eternal', category:'fps', platform:'Multi', emoji:'😈', rating:9.1, streams:4200, viewers:180000, tags:['fps','fast-paced'], trending:false, featured:false, bg:'from-red-950 to-orange-950', publisher:'id Software', releaseYear:2020, players:'1' },
  { id:'halo_infinite', title:'Halo Infinite', category:'fps', platform:'PC/Xbox', emoji:'🪖', rating:8.1, streams:8400, viewers:420000, tags:['fps','sci-fi'], trending:false, featured:false, bg:'from-blue-900 to-slate-950', publisher:'343 Industries', releaseYear:2021, players:'1-24' },

  // SPORTS
  { id:'fc25', title:'EA FC 25', category:'sports', platform:'Multi', emoji:'⚽', rating:7.9, streams:31000, viewers:1800000, tags:['football','soccer'], trending:true, featured:true, bg:'from-green-900 to-slate-950', publisher:'EA Sports', releaseYear:2024, players:'1-22' },
  { id:'nba2k25', title:'NBA 2K25', category:'sports', platform:'Multi', emoji:'🏀', rating:7.5, streams:18000, viewers:950000, tags:['basketball','sports'], trending:true, featured:true, bg:'from-orange-900 to-slate-950', publisher:'2K Sports', releaseYear:2024, players:'1-10' },
  { id:'madden25', title:'Madden NFL 25', category:'sports', platform:'Multi', emoji:'🏈', rating:7.2, streams:12500, viewers:680000, tags:['football','american'], trending:false, featured:false, bg:'from-amber-900 to-slate-950', publisher:'EA Sports', releaseYear:2024, players:'1-4' },
  { id:'wwe2k24', title:'WWE 2K24', category:'sports', platform:'Multi', emoji:'🤼', rating:7.8, streams:8200, viewers:420000, tags:['wrestling','sports'], trending:false, featured:false, bg:'from-yellow-900 to-red-950', publisher:'2K Sports', releaseYear:2024, players:'1-4' },
  { id:'ufc5', title:'UFC 5', category:'sports', platform:'Multi', emoji:'🥊', rating:7.9, streams:7400, viewers:380000, tags:['mma','fighting'], trending:false, featured:false, bg:'from-slate-800 to-red-950', publisher:'EA Sports', releaseYear:2023, players:'1-2' },
  { id:'mlb_24', title:'MLB The Show 24', category:'sports', platform:'Multi', emoji:'⚾', rating:8.2, streams:5200, viewers:260000, tags:['baseball','simulation'], trending:false, featured:false, bg:'from-blue-900 to-red-950', publisher:'Sony San Diego', releaseYear:2024, players:'1-2' },

  // RACING
  { id:'f1_24', title:'F1 24', category:'racing', platform:'Multi', emoji:'🏎️', rating:8.1, streams:6800, viewers:320000, tags:['racing','simulation'], trending:false, featured:false, bg:'from-red-900 to-slate-950', publisher:'EA Codemasters', releaseYear:2024, players:'1-20' },
  { id:'forza_horizon5', title:'Forza Horizon 5', category:'racing', platform:'PC/Xbox', emoji:'🚗', rating:9.1, streams:9200, viewers:460000, tags:['racing','open-world'], trending:false, featured:true, bg:'from-amber-900 to-green-950', publisher:'Playground Games', releaseYear:2021, players:'1-12' },
  { id:'gran_turismo7', title:'Gran Turismo 7', category:'racing', platform:'PS5', emoji:'🏁', rating:8.8, streams:4600, viewers:230000, tags:['racing','simulation'], trending:false, featured:false, bg:'from-blue-900 to-slate-950', publisher:'Polyphony Digital', releaseYear:2022, players:'1-24' },
  { id:'nfs_unbound', title:'Need for Speed Unbound', category:'racing', platform:'Multi', emoji:'🔥', rating:7.6, streams:3800, viewers:190000, tags:['racing','street'], trending:false, featured:false, bg:'from-orange-900 to-black', publisher:'EA Criterion', releaseYear:2022, players:'1-8' },

  // STRATEGY
  { id:'civ7', title:'Civilization VII', category:'strategy', platform:'Multi', emoji:'🏛️', rating:8.8, streams:9200, viewers:380000, tags:['turn-based','4x'], trending:true, featured:true, bg:'from-amber-900 to-slate-950', publisher:'Firaxis', releaseYear:2025, players:'1-12' },
  { id:'starcraft2', title:'StarCraft II', category:'strategy', platform:'PC', emoji:'🌟', rating:9.0, streams:4800, viewers:210000, tags:['rts','esports'], trending:false, featured:false, bg:'from-blue-900 to-slate-950', publisher:'Blizzard', releaseYear:2010, players:'1-8' },
  { id:'aoe4', title:'Age of Empires IV', category:'strategy', platform:'PC', emoji:'⚔️', rating:8.4, streams:3200, viewers:140000, tags:['rts','historical'], trending:false, featured:false, bg:'from-amber-900 to-stone-950', publisher:'World\'s Edge', releaseYear:2021, players:'1-8' },
  { id:'total_war_wh3', title:'Total War: Warhammer III', category:'strategy', platform:'PC', emoji:'🐺', rating:8.6, streams:2800, viewers:120000, tags:['rts','fantasy'], trending:false, featured:false, bg:'from-slate-800 to-purple-950', publisher:'Creative Assembly', releaseYear:2022, players:'1-8' },

  // SANDBOX / SURVIVAL
  { id:'minecraft', title:'Minecraft', category:'sandbox', platform:'Multi', emoji:'⛏️', rating:9.5, streams:45000, viewers:2400000, tags:['sandbox','creative'], trending:true, featured:true, bg:'from-green-800 to-blue-950', publisher:'Mojang/Microsoft', releaseYear:2011, players:'1-unlimited' },
  { id:'fortnite', title:'Fortnite', category:'battle_royale', platform:'Multi', emoji:'🏝️', rating:8.0, streams:52000, viewers:2800000, tags:['battle-royale','building'], trending:true, featured:true, bg:'from-purple-900 to-blue-950', publisher:'Epic Games', releaseYear:2017, players:'1-100' },
  { id:'palworld', title:'Palworld', category:'sandbox', platform:'Multi', emoji:'🐾', rating:8.5, streams:38000, viewers:1900000, tags:['survival','monsters'], trending:true, featured:true, bg:'from-green-900 to-slate-950', publisher:'Pocketpair', releaseYear:2024, players:'1-32' },
  { id:'valheim', title:'Valheim', category:'sandbox', platform:'PC', emoji:'🪓', rating:9.2, streams:12000, viewers:580000, tags:['survival','viking'], trending:false, featured:false, bg:'from-stone-900 to-blue-950', publisher:'Iron Gate', releaseYear:2021, players:'1-10' },
  { id:'terraria', title:'Terraria', category:'sandbox', platform:'Multi', emoji:'🌎', rating:9.4, streams:8600, viewers:420000, tags:['sandbox','adventure'], trending:false, featured:false, bg:'from-green-900 to-slate-950', publisher:'Re-Logic', releaseYear:2011, players:'1-8' },
  { id:'rust', title:'Rust', category:'sandbox', platform:'Multi', emoji:'🔧', rating:8.1, streams:14000, viewers:680000, tags:['survival','multiplayer'], trending:true, featured:false, bg:'from-orange-900 to-slate-950', publisher:'Facepunch Studios', releaseYear:2018, players:'1-500' },

  // HORROR
  { id:'resident_evil4', title:'Resident Evil 4 Remake', category:'horror', platform:'Multi', emoji:'🧟', rating:9.5, streams:11200, viewers:560000, tags:['horror','action'], trending:false, featured:true, bg:'from-green-950 to-slate-950', publisher:'Capcom', releaseYear:2023, players:'1' },
  { id:'alan_wake2', title:'Alan Wake 2', category:'horror', platform:'Multi', emoji:'💡', rating:9.1, streams:7200, viewers:360000, tags:['horror','thriller'], trending:false, featured:false, bg:'from-slate-900 to-indigo-950', publisher:'Remedy Entertainment', releaseYear:2023, players:'1' },
  { id:'dead_space_remake', title:'Dead Space Remake', category:'horror', platform:'Multi', emoji:'👾', rating:9.0, streams:5400, viewers:270000, tags:['horror','sci-fi'], trending:false, featured:false, bg:'from-slate-950 to-purple-950', publisher:'EA Motive', releaseYear:2023, players:'1' },
  { id:'phasmophobia', title:'Phasmophobia', category:'horror', platform:'PC', emoji:'👻', rating:8.8, streams:16000, viewers:800000, tags:['horror','co-op'], trending:true, featured:true, bg:'from-slate-900 to-slate-950', publisher:'Kinetic Games', releaseYear:2020, players:'1-4' },

  // FIGHTING
  { id:'street_fighter6', title:'Street Fighter 6', category:'fighting', platform:'Multi', emoji:'👊', rating:9.2, streams:12800, viewers:640000, tags:['fighting','esports'], trending:true, featured:true, bg:'from-red-900 to-orange-950', publisher:'Capcom', releaseYear:2023, players:'1-2' },
  { id:'mortal_kombat1', title:'Mortal Kombat 1', category:'fighting', platform:'Multi', emoji:'💀', rating:8.4, streams:9600, viewers:480000, tags:['fighting','gore'], trending:false, featured:false, bg:'from-slate-900 to-red-950', publisher:'NetherRealm', releaseYear:2023, players:'1-2' },
  { id:'tekken8', title:'Tekken 8', category:'fighting', platform:'Multi', emoji:'🥋', rating:9.0, streams:10400, viewers:520000, tags:['fighting','3d'], trending:true, featured:true, bg:'from-blue-900 to-slate-950', publisher:'Bandai Namco', releaseYear:2024, players:'1-2' },

  // MOBA
  { id:'league_of_legends', title:'League of Legends', category:'moba', platform:'PC', emoji:'⚔️', rating:8.3, streams:68000, viewers:3500000, tags:['moba','esports'], trending:true, featured:true, bg:'from-blue-900 to-gold-950', publisher:'Riot Games', releaseYear:2009, players:'10' },
  { id:'dota2', title:'Dota 2', category:'moba', platform:'PC', emoji:'🌀', rating:9.0, streams:28000, viewers:1400000, tags:['moba','esports'], trending:true, featured:true, bg:'from-red-900 to-slate-950', publisher:'Valve', releaseYear:2013, players:'10' },
  { id:'mobile_legends', title:'Mobile Legends: Bang Bang', category:'moba', platform:'Mobile', emoji:'📱', rating:7.8, streams:22000, viewers:1100000, tags:['moba','mobile'], trending:true, featured:false, bg:'from-orange-900 to-red-950', publisher:'Moonton', releaseYear:2016, players:'10' },

  // SIMULATION
  { id:'sims4', title:'The Sims 4', category:'simulation', platform:'Multi', emoji:'🏠', rating:7.5, streams:14000, viewers:700000, tags:['simulation','life'], trending:false, featured:false, bg:'from-green-900 to-yellow-950', publisher:'EA Maxis', releaseYear:2014, players:'1' },
  { id:'stardew_valley', title:'Stardew Valley', category:'simulation', platform:'Multi', emoji:'🌾', rating:9.6, streams:18000, viewers:900000, tags:['farming','indie'], trending:true, featured:true, bg:'from-green-800 to-amber-950', publisher:'ConcernedApe', releaseYear:2016, players:'1-4' },
  { id:'cities_skylines2', title:'Cities: Skylines 2', category:'simulation', platform:'Multi', emoji:'🏙️', rating:7.2, streams:6000, viewers:300000, tags:['city-builder','simulation'], trending:false, featured:false, bg:'from-slate-800 to-blue-950', publisher:'Paradox', releaseYear:2023, players:'1' },

  // PLATFORMER
  { id:'hollow_knight_silksong', title:'Hollow Knight: Silksong', category:'platformer', platform:'Multi', emoji:'🦋', rating:9.7, streams:21000, viewers:1050000, tags:['metroidvania','indie'], trending:true, featured:true, bg:'from-slate-900 to-purple-950', publisher:'Team Cherry', releaseYear:2025, players:'1' },
  { id:'astro_bot', title:'Astro Bot', category:'platformer', platform:'PS5', emoji:'🤖', rating:9.8, streams:8800, viewers:440000, tags:['platformer','family'], trending:true, featured:true, bg:'from-blue-800 to-cyan-950', publisher:'Team Asobi', releaseYear:2024, players:'1' },
  { id:'mario_wonder', title:'Super Mario Bros. Wonder', category:'platformer', platform:'Switch', emoji:'🍄', rating:9.6, streams:24000, viewers:1200000, tags:['platformer','mario'], trending:true, featured:true, bg:'from-red-800 to-yellow-950', publisher:'Nintendo', releaseYear:2023, players:'1-4' },

  // INDIE
  { id:'hades2', title:'Hades II', category:'indie', platform:'Multi', emoji:'🔱', rating:9.4, streams:19000, viewers:950000, tags:['roguelite','indie'], trending:true, featured:true, bg:'from-purple-900 to-red-950', publisher:'Supergiant Games', releaseYear:2024, players:'1' },
  { id:'dave_the_diver', title:'Dave the Diver', category:'indie', platform:'Multi', emoji:'🤿', rating:8.9, streams:7200, viewers:360000, tags:['indie','adventure'], trending:false, featured:false, bg:'from-blue-900 to-teal-950', publisher:'MINTROCKET', releaseYear:2023, players:'1' },
  { id:'animal_well', title:'Animal Well', category:'indie', platform:'Multi', emoji:'🐸', rating:9.1, streams:5800, viewers:290000, tags:['metroidvania','mystery'], trending:false, featured:false, bg:'from-green-950 to-slate-950', publisher:'Shared Memory', releaseYear:2024, players:'1' },

  // BATTLE ROYALE
  { id:'pubg', title:'PUBG: Battlegrounds', category:'battle_royale', platform:'Multi', emoji:'🪖', rating:7.8, streams:15000, viewers:750000, tags:['battle-royale','realistic'], trending:false, featured:false, bg:'from-amber-900 to-green-950', publisher:'Krafton', releaseYear:2017, players:'1-100' },
  { id:'naraka', title:'Naraka: Bladepoint', category:'battle_royale', platform:'Multi', emoji:'⚔️', rating:8.3, streams:9400, viewers:470000, tags:['battle-royale','melee'], trending:true, featured:false, bg:'from-red-900 to-amber-950', publisher:'NetEase', releaseYear:2021, players:'1-60' },

  // PUZZLE
  { id:'portal2', title:'Portal 2', category:'puzzle', platform:'Multi', emoji:'🌀', rating:9.9, streams:3200, viewers:160000, tags:['puzzle','co-op'], trending:false, featured:false, bg:'from-slate-800 to-orange-950', publisher:'Valve', releaseYear:2011, players:'1-2' },
  { id:'it_takes_two', title:'It Takes Two', category:'puzzle', platform:'Multi', emoji:'🎭', rating:9.7, streams:8400, viewers:420000, tags:['co-op','adventure'], trending:false, featured:false, bg:'from-pink-900 to-purple-950', publisher:'Hazelight', releaseYear:2021, players:'2' },
];

export function getGamesByCategory(category) {
  if (!category || category === 'all') return SEEDED_GAMES;
  return SEEDED_GAMES.filter(g => g.category === category);
}

export function getTrendingGames(limit=12) {
  return SEEDED_GAMES.filter(g => g.trending).slice(0, limit);
}

export function getFeaturedGames(limit=8) {
  return SEEDED_GAMES.filter(g => g.featured).slice(0, limit);
}

export function searchGames(query) {
  const q = query.toLowerCase();
  return SEEDED_GAMES.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.tags.some(t => t.includes(q)) ||
    g.category.includes(q) ||
    g.publisher?.toLowerCase().includes(q)
  );
}

export function getTopViewerGames(limit=10) {
  return [...SEEDED_GAMES].sort((a,b) => b.viewers - a.viewers).slice(0, limit);
}
