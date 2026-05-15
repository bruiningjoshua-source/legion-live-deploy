import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function DownloadFunctions() {
  const handleDownload = () => {
    // Fetch the markdown file and trigger download
    fetch('/src/EDGE_FUNCTIONS_REFERENCE.md')
      .then(res => res.text())
      .then(text => {
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'LEGION_LIVE_EDGE_FUNCTIONS_REFERENCE.md';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        alert('Download failed. Use the Code tab in the dashboard to access EDGE_FUNCTIONS_REFERENCE.md directly.');
      });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-white">Edge Functions Reference</h1>
        <p className="text-white/60">Download the complete function catalog for GitHub Copilot</p>
        <Button onClick={handleDownload} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Download className="w-5 h-5" />
          Download Reference (.md)
        </Button>
        <p className="text-white/40 text-sm">
          You can also find it in the Code tab → EDGE_FUNCTIONS_REFERENCE.md
        </p>
      </div>
    </div>
  );
}