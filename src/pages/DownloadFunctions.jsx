import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DownloadFunctions() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setStatus('loading');
    setError('');
    try {
      const response = await base44.functions.invoke('exportAllFunctions', {});
      // response.data is the raw text string
      const text = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2);
      
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'legion-live-edge-functions.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('done');
    } catch (err) {
      console.error('Download failed:', err);
      setError(err?.response?.data?.error || err.message || 'Download failed');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center mx-auto">
          <Download className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-white font-display">Export All Functions</h1>
        <p className="text-white/60">
          Downloads all 108 edge function source files from GitHub as a single .txt file for use with GitHub Copilot.
        </p>
        
        <Button 
          onClick={handleDownload} 
          disabled={status === 'loading'}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg"
          size="lg"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting... (30-40s)
            </>
          ) : status === 'done' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Downloaded!
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download All Functions
            </>
          )}
        </Button>

        {status === 'done' && (
          <p className="text-green-400 text-sm">File saved as legion-live-edge-functions.txt</p>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 justify-center text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-white/30 text-xs">Admin access required. Takes ~30-40 seconds to fetch all files from GitHub.</p>
      </div>
    </div>
  );
}