import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Download, Cloud, Package, AlertCircle, CheckCircle } from 'lucide-react';

export default function GameLibraryBrowser({ onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('action');

  const importGamesFromPlayStore = useMutation({
    mutationFn: async (genre) => {
      return base44.functions.invoke('importGooglePlayGames', {
        genre,
        count: 50
      });
    },
    onSuccess: (response) => {
      setStatus({
        type: 'success',
        message: `Imported ${response.data?.imported || 0} games from Google Play Store`,
        details: response.data
      });
      onImportComplete?.(response.data);
    },
    onError: (error) => {
      setStatus({
        type: 'error',
        message: error.message || 'Failed to import games'
      });
    }
  });

  const handleImport = async () => {
    setImporting(true);
    await importGamesFromPlayStore.mutateAsync(selectedGenre);
    setImporting(false);
  };

  const GENRES = [
    { id: 'action', label: 'Action Games', icon: '⚔️' },
    { id: 'puzzle', label: 'Puzzle Games', icon: '🧩' },
    { id: 'strategy', label: 'Strategy Games', icon: '♟️' },
    { id: 'casual', label: 'Casual Games', icon: '🎲' },
  ];

  return (
    <div className="bigo-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Cloud className="w-4 h-4 text-cyan-400" />
        <h3 className="text-white font-semibold text-sm">Google Play Library Import</h3>
      </div>

      {status && (
        <div className={`p-3 rounded-lg border ${
          status.type === 'success'
            ? 'bg-green-500/15 border-green-500/30'
            : 'bg-red-500/15 border-red-500/30'
        }`}>
          <div className="flex gap-2 items-start">
            {status.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-xs font-semibold ${
                status.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}>{status.message}</p>
              {status.details && (
                <p className="text-white/40 text-[10px] mt-1">
                  {status.details.imported} imported, {status.details.skipped} duplicates skipped
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Genre selection */}
      <div className="space-y-2">
        <label className="text-white text-xs font-semibold">Select Genre</label>
        <div className="grid grid-cols-2 gap-2">
          {GENRES.map(genre => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedGenre === genre.id
                  ? 'bg-cyan-500/30 border border-cyan-400/50'
                  : 'bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12]'
              }`}
            >
              <div className="text-lg mb-1">{genre.icon}</div>
              <p className="text-white text-xs font-semibold">{genre.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={importGamesFromPlayStore.isPending || importing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {importing ? 'Importing...' : 'Import Games'}
      </button>

      {/* Info */}
      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/[0.1]">
        <p className="text-white/60 text-xs">
          Imports popular {selectedGenre} games from Google Play Store. Streamers can immediately start broadcasting with screen share.
        </p>
      </div>
    </div>
  );
}