import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import GiftVideoOverlay from '@/components/gifts/GiftVideoOverlay';
import GiftAnimation from '@/components/gifts/GiftAnimation';

/**
 * GiftTest — ISOLATED gift menu + animation preview.
 *
 * Loads the REAL gift catalog from the database and lets you tap any gift to
 * watch its actual animation play — without a live stream, without spending
 * denarii, and without touching the money path. Purely visual QA.
 */
export default function GiftTest() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null);   // { gift, quantity }
  const [quantity, setQuantity] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.Gift.filter({}, 'cost_denarii', 200);
        setGifts(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setError(e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const play = useCallback((gift) => {
    setPlaying(null);
    // brief unmount so replaying the same gift restarts the animation
    setTimeout(() => setPlaying({ gift, quantity }), 30);
  }, [quantity]);

  const visible = gifts.filter(g => showInactive || g.is_active !== false);
  const isVideo = (g) => g.animation_type === 'video' && g.video_url;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Gift Menu &amp; Animation Test — Isolated</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
        Real gift catalog from the database. Tap any gift to preview its animation. Nothing is sent, no denarii spent.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, opacity: 0.6 }}>Quantity:</span>
        {[1, 5, 10, 99].map(q => (
          <button key={q} onClick={() => setQuantity(q)}
            style={{ background: quantity === q ? '#f5a623' : 'rgba(255,255,255,0.08)', color: quantity === q ? '#000' : '#e8dcc8', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12 }}>
            x{q}
          </button>
        ))}
        <button onClick={() => setShowInactive(v => !v)}
          style={{ marginLeft: 'auto', background: showInactive ? '#f5a623' : 'rgba(255,255,255,0.08)', color: showInactive ? '#000' : '#e8dcc8', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
          {showInactive ? 'Showing all' : 'Active only'}
        </button>
      </div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading gift catalog…</div>}
      {error && <div style={{ color: '#ff9a9a', fontSize: 13 }}>Failed to load gifts: {error}</div>}

      {!loading && (
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
          {visible.length} gifts · {visible.filter(isVideo).length} with video animations
        </div>
      )}

      {/* Gift grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
        {visible.map(g => (
          <button key={g.id} onClick={() => play(g)}
            style={{
              background: g.is_active === false ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${g.screen_takeover ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.10)'}`,
              borderRadius: 12, padding: '12px 6px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, opacity: g.is_active === false ? 0.45 : 1, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 26 }}>{g.icon || '🎁'}</span>
            <span style={{ fontSize: 10, color: '#e8dcc8', textAlign: 'center', lineHeight: 1.2 }}>{g.name}</span>
            <span style={{ fontSize: 10, color: '#f5a623', fontWeight: 700 }}>{g.cost_denarii?.toLocaleString()}</span>
            <span style={{ fontSize: 8, opacity: 0.5 }}>
              {isVideo(g) ? 'video' : g.animation_type || '—'}{g.screen_takeover ? ' · takeover' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Animation stage — renders the real gift animation components */}
      {playing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none' }}>
          {isVideo(playing.gift) ? (
            <GiftVideoOverlay
              gift={playing.gift}
              sender={{ display_name: 'Test Sender', user_email: 'test@legion.live' }}
              quantity={playing.quantity}
              onComplete={() => setPlaying(null)}
            />
          ) : (
            <GiftAnimation
              gift={playing.gift}
              sender={{ display_name: 'Test Sender', user_email: 'test@legion.live' }}
              quantity={playing.quantity}
              onComplete={() => setPlaying(null)}
            />
          )}
        </div>
      )}

      {playing && (
        <button onClick={() => setPlaying(null)}
          style={{ position: 'fixed', top: 12, right: 12, zIndex: 100, background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13, pointerEvents: 'auto' }}>
          ✕ Stop
        </button>
      )}

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 16, lineHeight: 1.5 }}>
        <strong>What to check:</strong> does each gift's video/animation actually play, is the sender name and quantity
        shown, do screen-takeover gifts (gold border) fill the screen, and does the animation clean up when it finishes?
        Try x1 vs x99 to see quantity handling.
      </div>
    </div>
  );
}
