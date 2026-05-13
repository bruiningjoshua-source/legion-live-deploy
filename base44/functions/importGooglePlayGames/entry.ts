import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Curated catalog of real Google Play games with actual metadata
const GOOGLE_PLAY_CATALOG = {
  action: [
    { title: 'PUBG Mobile', developer: 'Tencent Games', rating: 4.2, source_id: 'com.tencent.ig', icon_url: 'https://play-lh.googleusercontent.com/JRd05pyBH41qjgsJuWduRJpDeZG0Hnb_yy8VPhmMDwTGVuSrnkNJ5B7El0Eg5Lg3Rg', installs: 100000000 },
    { title: 'Call of Duty: Mobile', developer: 'Activision', rating: 4.4, source_id: 'com.activision.callofduty.shooter', icon_url: 'https://play-lh.googleusercontent.com/8wdMFl8v3xMWYuHrM3enWfJVRp5XFqHjQGMbPwmRp4tWFcxUxIoifLyxloCV1aHM8Q', installs: 100000000 },
    { title: 'Free Fire', developer: 'Garena', rating: 4.3, source_id: 'com.dts.freefireth', icon_url: 'https://play-lh.googleusercontent.com/WWcssdzFWMhnMEn7JA5RGkMGqaENqo2GQHCN0JyEfPlrOG3MBEsVOYlAP65xBMf18w', installs: 500000000 },
    { title: 'Fortnite', developer: 'Epic Games', rating: 4.1, source_id: 'com.epicgames.fortnite', icon_url: 'https://play-lh.googleusercontent.com/Gi9MU8F3PmH2C7FKLehqdbkLKa_5sOmkuBSF6hQKVEW7IKxro4ZsLyLfNoMblb6EKA', installs: 50000000 },
    { title: 'Brawl Stars', developer: 'Supercell', rating: 4.3, source_id: 'com.supercell.brawlstars', icon_url: 'https://play-lh.googleusercontent.com/Go_eYaj2b4RpN0DRE6CVKEV_RKXq-oi_Gne4j_EjSX9K-_am5PDNA2Njrzg4F1BYQCST', installs: 100000000 },
    { title: 'Subway Surfers', developer: 'SYBO Games', rating: 4.6, source_id: 'com.kiloo.subwaysurf', icon_url: 'https://play-lh.googleusercontent.com/vAcj29IJ-Y4m_yD7ACsKT0wQrpDq23cEYkiXGcm12f_LxGqES0baTCN7Jy56DPtxtA', installs: 1000000000 },
    { title: 'Temple Run 2', developer: 'Imangi Studios', rating: 4.5, source_id: 'com.imangi.templerun2', icon_url: 'https://play-lh.googleusercontent.com/MzjjQNV82CeUTl-TjVHMnsnL6elZfVLMR5w-BO6ORHHMCAH23DjlDJJvpePWzrOWcKQ', installs: 500000000 },
    { title: 'Shadow Fight 3', developer: 'Nekki', rating: 4.3, source_id: 'com.nekki.shadowfight3', icon_url: 'https://play-lh.googleusercontent.com/kzG4Af_2N3EEHI4n1Qi2XezsPZDr5fLIIILz3gawHrYjh8Z3Vln0IOJ1eDqSLRw_pg', installs: 100000000 },
  ],
  strategy: [
    { title: 'Clash of Clans', developer: 'Supercell', rating: 4.5, source_id: 'com.supercell.clashofclans', icon_url: 'https://play-lh.googleusercontent.com/LByrur1mTmPeNr0ljI-uAUcct1rzmTve5Esau1SwoAzjilS-_v27IURX1k2SEj_lLyg', installs: 500000000 },
    { title: 'Clash Royale', developer: 'Supercell', rating: 4.4, source_id: 'com.supercell.clashroyale', icon_url: 'https://play-lh.googleusercontent.com/rLyMkCItkVXC5Nh58ky-GSfOKpEqRq8akMjHNoMa3g4S0PQ5VJCiOaOsMq6s3p9PJHU', installs: 500000000 },
    { title: 'Rise of Kingdoms', developer: 'Lilith Games', rating: 4.4, source_id: 'com.lilithgame.roc.gp', icon_url: 'https://play-lh.googleusercontent.com/e4Gsc7aYSJa04A4d8m4a3MfiPrFepJw8m2C7kPKABQRV0ggP6u78vAvJ88Lb6i-x7fo', installs: 50000000 },
    { title: 'Mobile Legends: Bang Bang', developer: 'Moonton', rating: 4.3, source_id: 'com.mobile.legends', icon_url: 'https://play-lh.googleusercontent.com/FRhMDj0YVfGVsrzSR4YJ3NeV1p0e0FRxFd8Ed33MqHXjJb6xlncJrGqjHj3RKxr5iA', installs: 100000000 },
    { title: 'Plants vs. Zombies 2', developer: 'PopCap Games', rating: 4.3, source_id: 'com.ea.game.pvzfree_row', icon_url: 'https://play-lh.googleusercontent.com/7jU8GZJ8aNULMW7wWA4koRBx-S-QMJXFukcq7sHd0Es3iMfO7UNdT4rR9v3Zy2S1Ug', installs: 100000000 },
  ],
  puzzle: [
    { title: 'Candy Crush Saga', developer: 'King', rating: 4.5, source_id: 'com.king.candycrushsaga', icon_url: 'https://play-lh.googleusercontent.com/JL8P5w0Nh2lKb6-WpJYaDLV0Y0E2dNwVJqACF0J08TA-sCfIc0a0LTj8MzXbf0DjlA', installs: 1000000000 },
    { title: 'Among Us', developer: 'Innersloth', rating: 4.3, source_id: 'com.innersloth.spacemafia', icon_url: 'https://play-lh.googleusercontent.com/8ddL1kuoNUB5vUvgDVjYY3_6HwQcrg1K2fd_R8soD-e2QYj8fT9cfhfh3G0hnSruLKI', installs: 100000000 },
    { title: '2048', developer: 'Androbaby', rating: 4.5, source_id: 'com.androbaby.game2048', icon_url: 'https://play-lh.googleusercontent.com/kp5DnuJZtkT6CWYWYPDg2k5OLXnpMOLGpDgLJFOxdWPzGtYvG9DPjYnXpk5RMWbT1g', installs: 100000000 },
    { title: 'Cut the Rope', developer: 'ZeptoLab', rating: 4.5, source_id: 'com.zeptolab.ctr.ads', icon_url: 'https://play-lh.googleusercontent.com/vIpk1GaNHzp1DCXP5LnVq_VjJcXAHLePVLn8n9qJfXrEKnE5sPDXKLIaf-7RJA2zxw', installs: 100000000 },
  ],
  casual: [
    { title: 'Minecraft', developer: 'Mojang', rating: 4.5, source_id: 'com.mojang.minecraftpe', icon_url: 'https://play-lh.googleusercontent.com/VSwHQjcAttxsLE47RuS4PqpC4LT7lCoSjE7Hx5AW_yCxtDvcnsHHvm5CTuL5BPN-uRTP', installs: 50000000 },
    { title: 'Roblox', developer: 'Roblox Corp', rating: 4.4, source_id: 'com.roblox.client', icon_url: 'https://play-lh.googleusercontent.com/WNWbnMCMnZi4SnXYmzuoEjm_K09OGRG6VIIFwPJBBLKRJxWYrReMtaYBP6LDM4GKNQ', installs: 500000000 },
    { title: 'Stumble Guys', developer: 'Kitka Games', rating: 4.2, source_id: 'com.kitkagames.fallbuddies', icon_url: 'https://play-lh.googleusercontent.com/RiWDkE4JwgF9BPC8bZJ4rbPSMIVpRIbSH2_fmY7JJqt9IICDzlLhHAfjBL__BbJXrHQ', installs: 100000000 },
    { title: 'Crossy Road', developer: 'Hipster Whale', rating: 4.5, source_id: 'com.yodo1.crossyroad', icon_url: 'https://play-lh.googleusercontent.com/bvVcaGN-p3wUG9hB9vwXYlBOkW_V1H1uVGKI1RQ_1dEGp4m2i0jXOhGJSP5nfXCl4Qo', installs: 100000000 },
  ],
  sports: [
    { title: 'FIFA Mobile', developer: 'EA Sports', rating: 4.2, source_id: 'com.ea.gp.fifamobile', icon_url: 'https://play-lh.googleusercontent.com/EMXc7VJw9f94gNLMJ4fGHYQ8JgC-5asYuVi7MfbBki6H7DFY5MZO7BJ2EOfkfrGUmA', installs: 100000000 },
    { title: 'Real Racing 3', developer: 'EA', rating: 4.4, source_id: 'com.ea.games.r3_row', icon_url: 'https://play-lh.googleusercontent.com/TZF7SOB-FN-A1z6P9B7x7r6RRjEbI31qAFoLkMMvxfE7NhH-cKt5L8uSTOIz2OKkCw', installs: 100000000 },
    { title: 'NBA 2K Mobile', developer: '2K', rating: 4.1, source_id: 'com.t2ksports.nba2kmobile', icon_url: 'https://play-lh.googleusercontent.com/FQcmzp5EeGPFiydcGHDJC--qpDyijRIX3qcM5A3kIUeQpuL2k0JBU8q16aNt1ibbdQ', installs: 10000000 },
  ],
  arcade: [
    { title: 'Pac-Man', developer: 'Bandai Namco', rating: 4.3, source_id: 'com.bandainamcoent.pacman', icon_url: 'https://play-lh.googleusercontent.com/jEoMi7pMIlPf-B8b4Cn-D9Np1dLPZgV5z7hVEXsFJdLWLYdL_B42RBpat9-aT_n8W20', installs: 100000000 },
    { title: 'Fruit Ninja', developer: 'Halfbrick', rating: 4.5, source_id: 'com.halfbrick.fruitninjafree', icon_url: 'https://play-lh.googleusercontent.com/1rNMbj6F3sn1PUMQ9olFhsmLRDEz-bJX3uC5sT9C3LOQ_v2Bh-VMbvg_EZHQ6gYM6g', installs: 100000000 },
    { title: 'Jetpack Joyride', developer: 'Halfbrick', rating: 4.5, source_id: 'com.halfbrick.jetpackjoyride', icon_url: 'https://play-lh.googleusercontent.com/eVJL0j-E5lLmvVJk_uHvH7Q3Jmq7Z3oWzgBLyDr_b8ZXb9GpN7O7V5Hx8W1dRPmXUM', installs: 100000000 },
  ],
  rpg: [
    { title: 'Genshin Impact', developer: 'miHoYo', rating: 4.3, source_id: 'com.miHoYo.GenshinImpact', icon_url: 'https://play-lh.googleusercontent.com/jXpKtJKitUV8WO5txBIyOGbVRzDNhWEQFhwXzLBP2FhvTPoegxLHtUHSlhvKOOF-SA', installs: 50000000 },
    { title: 'Honkai: Star Rail', developer: 'miHoYo', rating: 4.5, source_id: 'com.HoYoverse.hkrpgoversea', icon_url: 'https://play-lh.googleusercontent.com/b0PE4BpUm6VnC6p-s0Qzm3LHx9t6qBi9GYt6BK-MiZ-eRvv4r7g3LOBCjL-V3RrkWA', installs: 10000000 },
    { title: 'Diablo Immortal', developer: 'Blizzard', rating: 4.0, source_id: 'com.blizzard.diablo.immortal', icon_url: 'https://play-lh.googleusercontent.com/GQjP4eGafVRPyZlJYpWdC2J7t-0C4ncW2BF9gqMxJGfLaJCRUqPQ8v5PLpMfSSNJ1A', installs: 10000000 },
    { title: 'AFK Arena', developer: 'Lilith Games', rating: 4.5, source_id: 'com.lilithgame.hgame.gp', icon_url: 'https://play-lh.googleusercontent.com/8gfFv0LjV4Cq6bMmS3vIhcvdJzFkMvT7A3BPJwbWzlM6QqMnJAfiCtd8GwdvJf7f_g', installs: 50000000 },
  ],
  simulation: [
    { title: 'The Sims Mobile', developer: 'EA', rating: 4.2, source_id: 'com.ea.gp.simsmobile', icon_url: 'https://play-lh.googleusercontent.com/VAE3UYOewqTbN6SQ4bFhJfV6KmQE-iKfRdEYw_IB-HXBmVQ6q-pu3bRJM_mCf0lHqg', installs: 100000000 },
    { title: 'Farming Simulator', developer: 'GIANTS Software', rating: 4.3, source_id: 'com.giantssoftware.fs14', icon_url: 'https://play-lh.googleusercontent.com/r9Rn3-0j3IZ_UKzw8-FaHXKU4wS3uiAu5Q3xXhxI6F5FTiINlQeVv3DvBIe8dLlDRA', installs: 10000000 },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { genre = 'all', count = 100 } = payload;

    // Gather games from requested genre(s)
    let gamesToImport = [];
    if (genre === 'all') {
      for (const games of Object.values(GOOGLE_PLAY_CATALOG)) {
        gamesToImport.push(...games);
      }
    } else {
      gamesToImport = GOOGLE_PLAY_CATALOG[genre] || [];
    }

    if (gamesToImport.length === 0) {
      return Response.json({ success: true, imported: 0, skipped: 0, total: 0, message: 'No games found for genre' });
    }

    // Get existing to deduplicate
    const existing = await base44.asServiceRole.entities.GameLibrary.filter(
      { source: 'google_play' }, null, 500
    ).catch(() => []);

    const existingIds = new Set(existing.map(g => g.source_id).filter(Boolean));

    const newGames = gamesToImport
      .filter(g => !existingIds.has(g.source_id))
      .slice(0, count)
      .map(g => ({
        title: g.title,
        description: `${g.title} by ${g.developer} — popular on Google Play`,
        genre: genre === 'all' ? detectGenre(g.source_id) : genre,
        icon_url: g.icon_url,
        source: 'google_play',
        source_id: g.source_id,
        play_store_url: `https://play.google.com/store/apps/details?id=${g.source_id}`,
        developer: g.developer,
        rating: g.rating,
        install_count: g.installs,
        is_streamable: true,
        requires_screen_share: true,
        is_featured: g.installs >= 100000000,
        is_active: true,
      }));

    console.log(`[GameImport] Importing ${newGames.length} new games (${gamesToImport.length - newGames.length} duplicates skipped)`);

    if (newGames.length > 0) {
      // Bulk create in batches of 25
      for (let i = 0; i < newGames.length; i += 25) {
        const batch = newGames.slice(i, i + 25);
        await base44.asServiceRole.entities.GameLibrary.bulkCreate(batch);
      }
    }

    return Response.json({
      success: true,
      imported: newGames.length,
      skipped: gamesToImport.length - newGames.length,
      total: gamesToImport.length,
    });
  } catch (error) {
    console.error('[GameImport] Failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Detect genre from source_id based on our catalog
function detectGenre(sourceId) {
  for (const [genre, games] of Object.entries(GOOGLE_PLAY_CATALOG)) {
    if (games.some(g => g.source_id === sourceId)) return genre;
  }
  return 'action';
}