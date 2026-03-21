import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Ozzy Osbourne Library
    const ozzyTracks = [
      { title: "Crazy Train", artist: "Ozzy Osbourne", album: "Blizzard of Ozz", genre: "rock", duration_seconds: 292, year: 1980 },
      { title: "Mr. Crowley", artist: "Ozzy Osbourne", album: "Blizzard of Ozz", genre: "rock", duration_seconds: 300, year: 1980 },
      { title: "Bark at the Moon", artist: "Ozzy Osbourne", album: "Bark at the Moon", genre: "rock", duration_seconds: 257, year: 1983 },
      { title: "Shot in the Dark", artist: "Ozzy Osbourne", album: "The Ultimate Sin", genre: "rock", duration_seconds: 252, year: 1986 },
      { title: "No More Tears", artist: "Ozzy Osbourne", album: "No More Tears", genre: "rock", duration_seconds: 445, year: 1991 },
      { title: "Mama, I'm Coming Home", artist: "Ozzy Osbourne", album: "No More Tears", genre: "rock", duration_seconds: 245, year: 1991 },
      { title: "Perry Mason", artist: "Ozzy Osbourne", album: "Ozzmosis", genre: "rock", duration_seconds: 315, year: 1995 },
      { title: "I Don't Wanna Stop", artist: "Ozzy Osbourne", album: "Black Rain", genre: "rock", duration_seconds: 240, year: 2007 },
      { title: "Straight to Hell", artist: "Ozzy Osbourne", album: "Ordinary Man", genre: "rock", duration_seconds: 237, year: 2020 },
      { title: "Ordinary Man", artist: "Ozzy Osbourne", album: "Ordinary Man", genre: "rock", duration_seconds: 263, year: 2020 },
      { title: "Dreamer", artist: "Ozzy Osbourne", album: "Down to Earth", genre: "rock", duration_seconds: 295, year: 2001 },
      { title: "Gets Me Through", artist: "Ozzy Osbourne", album: "Down to Earth", genre: "rock", duration_seconds: 275, year: 2001 },
    ];

    // Rob Zombie Library
    const robZombieTracks = [
      { title: "Dragula", artist: "Rob Zombie", album: "Hellbilly Deluxe", genre: "rock", duration_seconds: 240, year: 1998 },
      { title: "Living Dead Girl", artist: "Rob Zombie", album: "Hellbilly Deluxe", genre: "rock", duration_seconds: 202, year: 1998 },
      { title: "Superbeast", artist: "Rob Zombie", album: "Hellbilly Deluxe", genre: "rock", duration_seconds: 233, year: 1998 },
      { title: "Never Gonna Stop", artist: "Rob Zombie", album: "The Sinister Urge", genre: "rock", duration_seconds: 226, year: 2001 },
      { title: "Feel So Numb", artist: "Rob Zombie", album: "The Sinister Urge", genre: "rock", duration_seconds: 239, year: 2001 },
      { title: "Scum of the Earth", artist: "Rob Zombie", album: "The Sinister Urge", genre: "rock", duration_seconds: 216, year: 2001 },
      { title: "Foxy Foxy", artist: "Rob Zombie", album: "Educated Horses", genre: "rock", duration_seconds: 203, year: 2006 },
      { title: "American Witch", artist: "Rob Zombie", album: "Educated Horses", genre: "rock", duration_seconds: 234, year: 2006 },
      { title: "Lords of Salem", artist: "Rob Zombie", album: "Educated Horses", genre: "rock", duration_seconds: 183, year: 2006 },
      { title: "Mars Needs Women", artist: "Rob Zombie", album: "Hellbilly Deluxe 2", genre: "rock", duration_seconds: 201, year: 2010 },
      { title: "Sick Bubblegum", artist: "Rob Zombie", album: "Hellbilly Deluxe 2", genre: "rock", duration_seconds: 233, year: 2010 },
      { title: "Dead City Radio", artist: "Rob Zombie", album: "Venomous Rat Regeneration Vendor", genre: "rock", duration_seconds: 252, year: 2013 },
      { title: "Well, Everybody's Fucking in a U.F.O.", artist: "Rob Zombie", album: "The Electric Warlock Acid Witch Satanic Orgy Celebration Dispenser", genre: "rock", duration_seconds: 205, year: 2016 },
      { title: "The Triumph of King Freak", artist: "Rob Zombie", album: "The Lunar Injection Kool Aid Eclipse Conspiracy", genre: "rock", duration_seconds: 217, year: 2021 },
      { title: "The Eternal Struggles of the Howling Man", artist: "Rob Zombie", album: "The Lunar Injection Kool Aid Eclipse Conspiracy", genre: "rock", duration_seconds: 211, year: 2021 },
    ];

    // White Zombie classics
    const whiteZombieTracks = [
      { title: "Thunder Kiss '65", artist: "White Zombie", album: "La Sexorcisto", genre: "rock", duration_seconds: 268, year: 1992 },
      { title: "Black Sunshine", artist: "White Zombie", album: "La Sexorcisto", genre: "rock", duration_seconds: 305, year: 1992 },
      { title: "More Human Than Human", artist: "White Zombie", album: "Astro-Creep: 2000", genre: "rock", duration_seconds: 287, year: 1995 },
      { title: "Electric Head Pt. 2", artist: "White Zombie", album: "Astro-Creep: 2000", genre: "rock", duration_seconds: 234, year: 1995 },
    ];

    const allTracks = [...ozzyTracks, ...robZombieTracks, ...whiteZombieTracks];
    
    // Create music entries
    const createdTracks = [];
    for (const track of allTracks) {
      const musicEntry = await base44.asServiceRole.entities.Music.create({
        title: track.title,
        artist: track.artist,
        album: track.album,
        category: track.genre,
        duration_seconds: track.duration_seconds,
        is_published: true,
        view_count: Math.floor(Math.random() * 500000) + 10000,
        thumbnail_url: track.artist.includes('Ozzy') 
          ? 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400'
          : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'
      });
      createdTracks.push(musicEntry);
    }

    console.log(`Created ${createdTracks.length} music tracks`);

    return Response.json({ 
      success: true, 
      message: `Added ${createdTracks.length} tracks (Ozzy Osbourne, Rob Zombie, White Zombie)`,
      tracks: createdTracks.length
    });
  } catch (error) {
    console.error('Seed music error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});