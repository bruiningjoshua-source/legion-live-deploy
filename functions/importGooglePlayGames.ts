import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const GOOGLE_PLAY_API_KEY = Deno.env.get('YOUTUBE_API_KEY'); // Reuse or set dedicated key
const GAMING_GENRES = ['action', 'puzzle', 'strategy', 'casual', 'sports', 'arcade', 'simulation'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { genre = 'action', count = 50 } = payload;

    // This is a simplified import — in production, you'd integrate with:
    // 1. Google Play Scraper API (third-party)
    // 2. AppStore/Play Store official APIs
    // 3. Or use libraries like 'google-play-scraper'

    const mockGames = generateMockGames(genre, count);

    // Deduplicate and check existing
    const existingIds = new Set();
    const existing = await base44.asServiceRole.entities.GameLibrary.filter(
      { source: 'google_play' },
      null,
      1000
    ).catch(() => []);

    existing.forEach(g => {
      if (g.source_id) existingIds.add(g.source_id);
    });

    const newGames = mockGames.filter(g => !existingIds.has(g.source_id));

    console.log(`Importing ${newGames.length} new games from Google Play...`);

    // Bulk create
    if (newGames.length > 0) {
      await base44.asServiceRole.entities.GameLibrary.bulkCreate(newGames);
    }

    return Response.json({
      success: true,
      imported: newGames.length,
      skipped: mockGames.length - newGames.length,
      total: mockGames.length,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateMockGames(genre, count) {
  const actionGames = [
    { title: 'Temple Run', developer: 'Imangi Studios', rating: 4.5 },
    { title: 'Subway Surfers', developer: 'Kiloo', rating: 4.6 },
    { title: 'PUBG Mobile', developer: 'Tencent Games', rating: 4.2 },
    { title: 'Free Fire', developer: 'Garena', rating: 4.3 },
    { title: 'Call of Duty Mobile', developer: 'Activision', rating: 4.4 },
  ];

  const puzzleGames = [
    { title: 'Candy Crush Saga', developer: 'King', rating: 4.5 },
    { title: 'Tetris®', developer: 'N3TWORK', rating: 4.6 },
    { title: 'The Room', developer: 'Fireproof Games', rating: 4.7 },
    { title: 'Two Dots', developer: 'Dots & Co', rating: 4.4 },
  ];

  const strategyGames = [
    { title: 'Clash of Clans', developer: 'Supercell', rating: 4.5 },
    { title: 'Clash Royale', developer: 'Supercell', rating: 4.4 },
    { title: 'Plants vs. Zombies 2', developer: 'PopCap Games', rating: 4.3 },
  ];

  const gamesByGenre = {
    action: actionGames,
    puzzle: puzzleGames,
    strategy: strategyGames,
  };

  const games = gamesByGenre[genre] || actionGames;
  const result = [];

  for (let i = 0; i < count; i++) {
    const game = games[i % games.length];
    result.push({
      title: game.title,
      description: `Popular ${genre} game on Google Play Store`,
      genre: genre,
      icon_url: `https://via.placeholder.com/200x200?text=${encodeURIComponent(game.title)}`,
      source: 'google_play',
      source_id: `com.example.game${i}`,
      play_store_url: `https://play.google.com/store/apps/details?id=com.example.game${i}`,
      developer: game.developer,
      rating: game.rating,
      install_count: Math.floor(Math.random() * 10000000) + 100000,
      is_streamable: true,
      requires_screen_share: true,
      is_featured: i < 5,
      is_active: true,
    });
  }

  return result;
}