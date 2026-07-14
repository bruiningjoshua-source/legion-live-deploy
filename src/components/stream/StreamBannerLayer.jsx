import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseCore';
import DraggableBanner from './DraggableBanner';
import BannerEditModal from './BannerEditModal';
import { toast } from 'sonner';

/**
 * StreamBannerLayer — renders all custom banners for a stream. The host can
 * toggle edit mode to drag/resize/add/edit banners; changes persist to
 * stream_banners and broadcast to viewers via realtime.
 */
export default function StreamBannerLayer({ streamId, creatorEmail, isHost, containerRef }) {
  const [banners, setBanners] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const pendingSave = useRef({});

  // Load + realtime subscribe
  useEffect(() => {
    if (!streamId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('stream_banners').select('*').eq('stream_id', streamId).order('z_index');
      if (active && data) setBanners(data);
    };
    load();
    const chan = supabase
      .channel(`banners_${streamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_banners', filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(chan); };
  }, [streamId]);

  // Local optimistic change; commit persists to DB
  const handleChange = useCallback((banner, patch, commit) => {
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, ...patch } : b));
    pendingSave.current[banner.id] = { ...pendingSave.current[banner.id], ...patch };
    if (commit) {
      const updates = pendingSave.current[banner.id];
      pendingSave.current[banner.id] = null;
      if (updates && Object.keys(updates).length) {
        supabase.from('stream_banners').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', banner.id)
          .then(({ error }) => { if (error) toast.error('Save failed'); });
      }
    }
  }, []);

  const addBanner = async (data) => {
    const { error } = await supabase.from('stream_banners').insert({
      stream_id: streamId, creator_email: creatorEmail, x: 55, y: 15, width: 38, height: 12, ...data,
    });
    if (error) toast.error('Could not add banner'); else toast.success('Banner added');
    setEditing(null);
  };

  const saveEdit = async (id, data) => {
    const { error } = await supabase.from('stream_banners').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Save failed'); else toast.success('Banner updated');
    setEditing(null);
  };

  const deleteBanner = async (id) => {
    await supabase.from('stream_banners').delete().eq('id', id);
    setEditing(null);
    toast.success('Banner removed');
  };

  return (
    <>
      {banners.map(b => (
        <DraggableBanner
          key={b.id}
          banner={b}
          editable={isHost && editMode}
          containerRef={containerRef}
          onChange={(patch, commit) => handleChange(b, patch, commit)}
          onEdit={(banner) => setEditing(banner)}
        />
      ))}

      {/* Host banner toolbar */}
      {isHost && (
        <div className="absolute z-40 left-3 flex flex-col gap-2" style={{ bottom: '250px' }}>
          <button
            onClick={() => setEditMode(v => !v)}
            className="w-10 h-10 rounded-full flex flex-col items-center justify-center backdrop-blur-md active:scale-95"
            style={{ background: editMode ? '#f5a623' : 'rgba(26,21,16,0.7)', color: editMode ? '#000' : '#e8dcc8', border: '1px solid rgba(200,135,26,0.4)' }}
            aria-label="Edit banners"
          >
            <span style={{ fontSize: '15px' }}>🎯</span>
          </button>
          {editMode && (
            <button
              onClick={() => setEditing({ _new: true, kind: 'text', title: '', content: '' })}
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md active:scale-95"
              style={{ background: 'rgba(26,21,16,0.7)', color: '#e8dcc8', border: '1px solid rgba(200,135,26,0.4)' }}
              aria-label="Add banner"
            >
              <span style={{ fontSize: '18px' }}>＋</span>
            </button>
          )}
        </div>
      )}

      {editing && (
        <BannerEditModal
          banner={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => editing._new ? addBanner(data) : saveEdit(editing.id, data)}
          onDelete={editing._new ? null : () => deleteBanner(editing.id)}
        />
      )}
    </>
  );
}
