import React, { useRef } from 'react';

export default function YouTubePlayer({ url, poster, onEnded, className = '' }) {
  const iframeRef = useRef(null);

  // Extract YouTube video ID from various URL formats
  const getVideoId = (videoUrl) => {
    if (!videoUrl) return null;
    const match = videoUrl.match(/(?:youtube\.com.*v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return (
      <div className={`bg-black flex items-center justify-center ${className}`}>
        <p className="text-amber-400/50">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`} style={{ paddingBottom: '56.25%', height: 0 }}>
      <iframe
        ref={iframeRef}
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}