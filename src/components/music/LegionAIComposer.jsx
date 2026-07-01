/**
 * Legion AI Composer — Our own AI music generation system.
 *
 * Powered by Claude (Anthropic) for composition intelligence:
 *   - Generates full track structure: BPM, key, chord progressions, song sections
 *   - Writes lyrics verse/chorus/bridge with style matching
 *   - Builds a complete instrument arrangement (which synth plays what, when)
 *   - Auto-loads the arrangement into Legion Studio's sequencer
 *
 * Audio playback via Tone.js (already in the project).
 * No external music AI services. This is entirely ours.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, ChevronUp, Music, Zap, Lock, Unlock, Copy, Check, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// GENRE / MOOD / ENERGY OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const GENRES = [
  'Hip Hop','Trap','Lo-Fi','R&B','Pop','House','Electronic',
  'Afrobeats','Drill','Reggae','Jazz','Soul','Rock','Funk',
  'Gospel','Country','Latin','Dancehall','Phonk','Jersey Club',
];

const MOODS = [
  'Dark & Aggressive','Chill & Relaxed','Emotional & Deep',
  'Energetic & Hype','Romantic & Smooth','Mysterious & Eerie',
  'Uplifting & Positive','Melancholic & Sad','Triumphant & Epic',
  'Playful & Fun',
];

const STRUCTURES = [
  { id: 'standard',  label: 'Standard',   desc: 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Outro' },
  { id: 'short',     label: 'Short Form',  desc: 'Intro → Verse → Chorus → Outro' },
  { id: 'freestyle', label: 'Freestyle',   desc: 'Hook → Verse × 3 → Hook → Outro' },
  { id: 'extended',  label: 'Extended',    desc: 'Intro → Verse → Pre-chorus → Chorus × 2 → Bridge → Breakdown → Finale' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHORD PROGRESSIONS (used to display what Claude generated)
// ─────────────────────────────────────────────────────────────────────────────
const CHORD_COLORS = {
  I: '#f5a623', II: '#ec4899', III: '#8b5cf6', IV: '#3b82f6',
  V: '#10b981', VI: '#ef4444', VII: '#f97316', 'I7': '#f5a623',
};

function ChordPill({ chord }) {
  const color = CHORD_COLORS[chord.replace('m','').replace('7','')] || '#ffffff';
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
      style={{ background: color + '18', border: `1px solid ${color}30`, color }}>
      {chord}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD — displays a generated song section
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ section, onLock, onRegenerate, locked }) {
  const [expanded, setExpanded] = useState(false);
  const colors = { verse: '#3b82f6', chorus: '#f5a623', bridge: '#8b5cf6', intro: '#10b981', outro: '#6b7280', hook: '#ec4899', breakdown: '#ef4444', 'pre-chorus': '#f97316' };
  const color = colors[section.type?.toLowerCase()] || '#ffffff';

  return (
    <div className="ll-card rounded-2xl overflow-hidden"
      style={{ borderColor: color + '25' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '18' }}>
          <Music className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm capitalize">{section.type}</p>
          <p className="text-white/35 text-xs">{section.bars} bars · {section.feel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onRegenerate}
            disabled={locked}
            className="w-7 h-7 rounded-lg flex items-center justify-center ll-interactive disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <RefreshCw className="w-3 h-3 text-white/40" />
          </button>
          <button onClick={onLock}
            className="w-7 h-7 rounded-lg flex items-center justify-center ll-interactive"
            style={{ background: locked ? color + '20' : 'rgba(255,255,255,0.05)', border: locked ? `1px solid ${color}40` : 'none' }}>
            {locked
              ? <Lock className="w-3 h-3" style={{ color }} />
              : <Unlock className="w-3 h-3 text-white/30" />}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center ll-interactive"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {expanded ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              {section.chords && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Chord Progression</p>
                  <div className="flex flex-wrap gap-1.5">
                    {section.chords.map((c, i) => <ChordPill key={i} chord={c} />)}
                  </div>
                </div>
              )}
              {section.lyrics && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Lyrics</p>
                  <p className="text-white/70 text-sm leading-relaxed font-light whitespace-pre-line">
                    {section.lyrics}
                  </p>
                </div>
              )}
              {section.arrangement && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Arrangement</p>
                  <div className="space-y-1">
                    {section.arrangement.map((layer, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/40 text-xs w-20 shrink-0">{layer.instrument}</span>
                        <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden relative">
                          <div className="absolute inset-y-0 left-0 rounded"
                            style={{ width: `${layer.activity}%`, background: color + '60' }} />
                        </div>
                        <span className="text-white/25 text-[10px] w-10 text-right">{layer.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LegionAIComposer({ onLoadToSequencer }) {
  // Inputs
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [structure, setStructure] = useState('standard');
  const [wantLyrics, setWantLyrics] = useState(true);
  const [instrumental, setInstrumental] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Output
  const [track, setTrack] = useState(null);
  const [lockedSections, setLockedSections] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Build the prompt for Claude ──────────────────────────────────────────
  const buildPrompt = useCallback((desc, gen, mo, struc, lyrics, instr) => {
    const structureMap = {
      standard:  'Intro, Verse, Chorus, Verse, Chorus, Bridge, Outro',
      short:     'Intro, Verse, Chorus, Outro',
      freestyle: 'Hook, Verse, Verse, Verse, Hook, Outro',
      extended:  'Intro, Verse, Pre-chorus, Chorus, Chorus, Bridge, Breakdown, Finale',
    };
    const sections = structureMap[struc] || structureMap.standard;

    return `You are Legion AI Composer, the music creation AI for Legion Live — a creator streaming platform.

Generate a complete, production-ready track specification for a creator on Legion Live.

USER REQUEST: "${desc}"
GENRE: ${gen || 'any fitting genre'}
MOOD: ${mo || 'match the description'}
SONG STRUCTURE: ${sections}
LYRICS: ${instr ? 'instrumental — no lyrics' : (lyrics ? 'yes, write full lyrics' : 'chord charts only')}

Respond ONLY with a valid JSON object. No explanation, no markdown, just the JSON.

{
  "title": "track title",
  "genre": "specific genre",
  "subgenre": "more specific style",
  "bpm": 90,
  "key": "C minor",
  "timeSignature": "4/4",
  "energy": "medium",
  "feel": "one-sentence vibe description",
  "instruments": ["list", "of", "main", "instruments"],
  "productionNotes": "brief production direction",
  "sections": [
    {
      "type": "intro",
      "bars": 4,
      "feel": "builds tension",
      "chords": ["Im", "VIb", "IIIb", "VIIb"],
      "lyrics": ${instr ? 'null' : '"lyrics here if verse/chorus/hook, otherwise null"'},
      "arrangement": [
        { "instrument": "808 Kick", "activity": 80, "role": "anchor" },
        { "instrument": "Hi-Hat", "activity": 60, "role": "rhythm" },
        { "instrument": "Synth Bass", "activity": 90, "role": "foundation" },
        { "instrument": "Pad", "activity": 40, "role": "atmosphere" }
      ]
    }
  ]
}

Include all sections from the structure: ${sections}
Each section needs: type, bars (4-16), feel, chords (array of Roman numerals), ${instr ? '' : 'lyrics (for verse/chorus/hook/bridge),'} arrangement (4-6 instruments with activity % and role).
Make it authentic to ${gen || 'the described genre'}. BPM should match ${gen || 'the genre'} conventions. Write real, creative lyrics if requested.`;
  }, []);

  // ── Call Claude ──────────────────────────────────────────────────────────
  const generate = async () => {
    if (!description.trim() && !genre && !mood) {
      toast.error('Describe your track, pick a genre, or set a mood first.');
      return;
    }
    setGenerating(true);
    setTrack(null);
    setLockedSections(new Set());
    setGenPhase('Composing structure…');

    const prompt = buildPrompt(description, genre, mood, structure, wantLyrics, instrumental);

    try {
      setGenPhase('Writing arrangement…');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text || '';

      setGenPhase('Building track…');

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);

      setTrack(parsed);
      setGenPhase('');
      toast.success(`"${parsed.title}" — ready to play`);

      // Auto-load to sequencer if callback provided
      if (onLoadToSequencer && parsed.sections) {
        onLoadToSequencer(parsed);
      }
    } catch (err) {
      console.error('Legion AI Composer error:', err);
      toast.error('Generation failed. Check your connection and try again.');
      setGenPhase('');
    } finally {
      setGenerating(false);
    }
  };

  // ── Regenerate a single section ──────────────────────────────────────────
  const regenerateSection = async (sectionIdx) => {
    if (!track) return;
    const section = track.sections[sectionIdx];
    setGenerating(true);
    setGenPhase(`Rewriting ${section.type}…`);

    const prompt = `You are Legion AI Composer. Rewrite just this one section of a track.

Track: "${track.title}" — ${track.genre}, ${track.bpm}bpm, ${track.key}
Section to rewrite: ${section.type} (${section.bars} bars)
Keep the same vibe but make it fresh and different.

Respond with ONLY a JSON object for this single section:
{
  "type": "${section.type}",
  "bars": ${section.bars},
  "feel": "new feel description",
  "chords": ["chord", "array"],
  "lyrics": ${instrumental ? 'null' : '"new lyrics if applicable"'},
  "arrangement": [
    { "instrument": "name", "activity": 75, "role": "role" }
  ]
}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const newSection = JSON.parse(jsonMatch[0]);
      setTrack(t => ({
        ...t,
        sections: t.sections.map((s, i) => i === sectionIdx ? newSection : s),
      }));
      toast.success(`${section.type} rewritten`);
    } catch {
      toast.error('Could not regenerate this section');
    } finally {
      setGenerating(false);
      setGenPhase('');
    }
  };

  // ── Copy lyrics to clipboard ─────────────────────────────────────────────
  const copyAllLyrics = () => {
    if (!track) return;
    const lyrics = track.sections
      .filter(s => s.lyrics)
      .map(s => `[${s.type.toUpperCase()}]\n${s.lyrics}`)
      .join('\n\n');
    navigator.clipboard.writeText(lyrics).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(245,166,35,0.2)' }}>
          <Sparkles className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Legion AI Composer</p>
          <p className="text-white/35 text-xs">Describe your track — AI builds the rest</p>
        </div>
      </div>

      {/* ── Main input ── */}
      <div className="ll-card p-4 rounded-2xl space-y-3">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe your track... e.g. 'A dark trap anthem for working through the night, heavy 808s, melodic piano, aggressive energy'"
          className="ll-input text-sm resize-none"
          rows={3}
        />

        {/* Genre + Mood */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="ll-label text-white/25 text-[10px] mb-1.5">GENRE</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(prev => prev === g ? '' : g)}
                  className="px-2 py-0.5 rounded-full text-[10px] ll-interactive"
                  style={{
                    background: genre === g ? 'rgba(245,166,35,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${genre === g ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: genre === g ? '#f5a623' : 'rgba(255,255,255,0.45)',
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="ll-label text-white/25 text-[10px] mb-1.5">MOOD</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {MOODS.map(m => (
                <button key={m} onClick={() => setMood(prev => prev === m ? '' : m)}
                  className="px-2 py-0.5 rounded-full text-[10px] ll-interactive"
                  style={{
                    background: mood === m ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${mood === m ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: mood === m ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options toggle */}
        <button onClick={() => setShowOptions(v => !v)}
          className="w-full flex items-center justify-between text-white/25 text-[10px] uppercase tracking-wider ll-interactive py-0.5">
          <span>Options</span>
          {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showOptions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-1">
                {/* Structure */}
                <div>
                  <p className="ll-label text-white/25 text-[10px] mb-2">SONG STRUCTURE</p>
                  <div className="space-y-1.5">
                    {STRUCTURES.map(s => (
                      <button key={s.id} onClick={() => setStructure(s.id)}
                        className="w-full text-left px-3 py-2 rounded-xl ll-interactive"
                        style={{
                          background: structure === s.id ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${structure === s.id ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                        <p className="text-xs font-semibold" style={{ color: structure === s.id ? '#f5a623' : 'rgba(255,255,255,0.6)' }}>{s.label}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instrumental + Lyrics */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div onClick={() => setInstrumental(v => !v)}
                      className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
                      style={{ background: instrumental ? '#f5a623' : 'rgba(255,255,255,0.1)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
                        style={{ left: instrumental ? '20px' : '2px' }} />
                    </div>
                    <span className="text-white/50 text-xs">Instrumental</span>
                  </div>
                  {!instrumental && (
                    <div className="flex items-center gap-2">
                      <div onClick={() => setWantLyrics(v => !v)}
                        className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
                        style={{ background: wantLyrics ? '#a78bfa' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
                          style={{ left: wantLyrics ? '20px' : '2px' }} />
                      </div>
                      <span className="text-white/50 text-xs">Write lyrics</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-3.5 rounded-2xl font-bold text-sm ll-interactive disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
          style={{
            background: generating
              ? 'rgba(245,166,35,0.1)'
              : 'linear-gradient(135deg, #f5a623 0%, #d97706 100%)',
            color: generating ? '#f5a623' : '#0a0800',
            boxShadow: generating ? 'none' : '0 4px 20px rgba(245,166,35,0.3)',
          }}>
          {generating ? (
            <><RefreshCw className="w-4 h-4 animate-spin" />{genPhase || 'Composing…'}</>
          ) : (
            <><Sparkles className="w-4 h-4" />Compose Track</>
          )}
        </button>
      </div>

      {/* ── Generated Track ── */}
      <AnimatePresence>
        {track && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3">

            {/* Track header */}
            <div className="ll-card p-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.06), rgba(139,92,246,0.06))', borderColor: 'rgba(245,166,35,0.2)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="ll-heading text-white text-lg">{track.title}</h2>
                  <p className="text-white/40 text-xs mt-0.5">{track.genre}{track.subgenre ? ` · ${track.subgenre}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {track.lyrics && (
                    <button onClick={copyAllLyrics}
                      className="w-8 h-8 rounded-xl flex items-center justify-center ll-interactive"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
                    </button>
                  )}
                  <button onClick={generate}
                    className="w-8 h-8 rounded-xl flex items-center justify-center ll-interactive"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                    title="Regenerate everything">
                    <RefreshCw className="w-3.5 h-3.5 text-white/30" />
                  </button>
                </div>
              </div>

              {/* Track stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'BPM', value: track.bpm },
                  { label: 'Key', value: track.key },
                  { label: 'Time', value: track.timeSignature },
                  { label: 'Energy', value: track.energy },
                ].map(s => (
                  <div key={s.label} className="text-center px-2 py-2 rounded-xl bg-white/4">
                    <p className="ll-stat-num text-sm">{s.value}</p>
                    <p className="ll-stat-label text-[9px] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Feel + Production notes */}
              {track.feel && (
                <p className="text-white/45 text-xs mt-3 leading-relaxed italic">"{track.feel}"</p>
              )}
              {track.productionNotes && (
                <p className="text-white/30 text-[11px] mt-1.5 leading-relaxed">{track.productionNotes}</p>
              )}

              {/* Instruments */}
              {track.instruments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {track.instruments.map((inst, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)' }}>
                      {inst}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Load to sequencer */}
            {onLoadToSequencer && (
              <button
                onClick={() => onLoadToSequencer(track)}
                className="w-full py-3 rounded-2xl font-semibold text-sm ll-interactive flex items-center justify-center gap-2"
                style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', color: '#f5a623' }}>
                <Zap className="w-4 h-4" />
                Load to Studio
              </button>
            )}

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="ll-label text-white/25 text-[10px]">SONG SECTIONS — {track.sections?.length || 0} parts</p>
                <p className="text-white/20 text-[10px]">Tap ↓ to expand · 🔒 to lock</p>
              </div>
              <div className="space-y-2">
                {track.sections?.map((section, i) => (
                  <SectionCard
                    key={i}
                    section={section}
                    locked={lockedSections.has(i)}
                    onLock={() => setLockedSections(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                    onRegenerate={() => !lockedSections.has(i) && !generating && regenerateSection(i)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
