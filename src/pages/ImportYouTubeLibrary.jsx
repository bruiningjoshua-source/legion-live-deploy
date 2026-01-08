import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportYouTubeLibrary() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('importYouTubeContent', {});
      setResult(response.data);
      toast.success(`Added ${response.data.videosAdded} videos to Music library!`);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to import YouTube content');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Import YouTube Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-amber-300/70">
              This will fetch and import all videos from:
            </p>
            <ul className="text-amber-300/70 list-disc list-inside space-y-1">
              <li>Trash Gang channel</li>
              <li>New Retro Wave channel</li>
              <li>Synthwave Vibes playlist</li>
            </ul>

            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import YouTube Library'
              )}
            </Button>

            {result && (
              <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-green-300 font-semibold mb-2">Success!</h3>
                    <p className="text-green-300/70 text-sm mb-3">
                      Added {result.videosAdded} videos to your music library
                    </p>
                    {result.videos?.slice(0, 10).map((v, i) => (
                      <p key={i} className="text-green-300/60 text-xs truncate">
                        • {v.title} by {v.artist}
                      </p>
                    ))}
                    {result.videos?.length > 10 && (
                      <p className="text-green-300/60 text-xs mt-2">
                        ... and {result.videos.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-300 font-semibold mb-1">Error</h3>
                    <p className="text-red-300/70 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}