/**
 * MiniPlayerContext — lets a live stream keep playing in a small floating
 * window while the user navigates the rest of the app, and supports native
 * Picture-in-Picture (OS-level floating window, even outside the browser).
 */
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const MiniPlayerContext = createContext(null);

export function MiniPlayerProvider({ children }) {
  const [miniStream, setMiniStream] = useState(null); // { streamId, title, creatorName, mediaStream }
  const mediaRef = useRef(null);

  // Minimize: stash the stream + its MediaStream so the floating player shows it
  const minimize = useCallback((info) => {
    setMiniStream(info);
  }, []);

  const close = useCallback(() => {
    setMiniStream(null);
    mediaRef.current = null;
  }, []);

  return (
    <MiniPlayerContext.Provider value={{ miniStream, minimize, close, mediaRef }}>
      {children}
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) return { miniStream: null, minimize: () => {}, close: () => {}, mediaRef: { current: null } };
  return ctx;
}

/** Trigger native Picture-in-Picture on a given <video> element. */
export async function enterPictureInPicture(videoEl) {
  if (!videoEl) return false;
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return false;
    }
    if (videoEl.requestPictureInPicture && document.pictureInPictureEnabled) {
      await videoEl.requestPictureInPicture();
      return true;
    }
  } catch (e) {
    console.warn('[PiP] not available:', e?.message);
  }
  return false;
}
