import React, { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

// Content categories to detect
const VIOLATION_TYPES = {
  NUDITY: 'nudity',
  VIOLENCE: 'violence',
  DRUGS: 'drugs',
  WEAPONS: 'weapons',
  HATE_SYMBOLS: 'hate_symbols',
  SELF_HARM: 'self_harm'
};

// Moderation thresholds
const THRESHOLDS = {
  WARNING: 0.6,    // Show warning to creator
  AUTO_BLUR: 0.8,  // Automatically blur stream
  AUTO_END: 0.95   // Automatically end stream
};

export default function RealTimeVideoModeration({ 
  videoRef, 
  streamId, 
  creatorId,
  onViolationDetected,
  enabled = true 
}) {
  const canvasRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [violations, setViolations] = useState([]);
  const [isBlurred, setIsBlurred] = useState(false);
  const analysisIntervalRef = useRef(null);
  const violationCountRef = useRef({});

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef?.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 320; // Smaller for faster analysis
    canvas.height = 240;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.5);
  }, [videoRef]);

  // Analyze frame for violations
  const analyzeFrame = useCallback(async () => {
    if (!enabled || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const frameData = captureFrame();
      if (!frameData) return;

      // Send to AI moderation
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image for content policy violations. Check for:
1. Nudity or sexual content (score 0-1)
2. Violence or gore (score 0-1)
3. Drug use or paraphernalia (score 0-1)
4. Weapons displayed threateningly (score 0-1)
5. Hate symbols (score 0-1)

Respond with JSON only:
{
  "nudity": 0.0,
  "violence": 0.0,
  "drugs": 0.0,
  "weapons": 0.0,
  "hate_symbols": 0.0,
  "safe": true,
  "concerns": []
}`,
        file_urls: [frameData],
        response_json_schema: {
          type: "object",
          properties: {
            nudity: { type: "number" },
            violence: { type: "number" },
            drugs: { type: "number" },
            weapons: { type: "number" },
            hate_symbols: { type: "number" },
            safe: { type: "boolean" },
            concerns: { type: "array", items: { type: "string" } }
          }
        }
      });

      handleModerationResult(result);
      
    } catch (error) {
      console.error('Frame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, isAnalyzing, captureFrame]);

  // Handle moderation result
  const handleModerationResult = useCallback((result) => {
    const newViolations = [];
    
    Object.entries(result).forEach(([type, score]) => {
      if (typeof score === 'number' && score >= THRESHOLDS.WARNING) {
        newViolations.push({ type, score, timestamp: Date.now() });
        
        // Track violation frequency
        violationCountRef.current[type] = (violationCountRef.current[type] || 0) + 1;
        
        // Auto-blur on high score
        if (score >= THRESHOLDS.AUTO_BLUR) {
          setIsBlurred(true);
          toast.error('Stream temporarily blurred due to potential policy violation');
        }
        
        // Auto-end on very high score
        if (score >= THRESHOLDS.AUTO_END || violationCountRef.current[type] >= 5) {
          handleAutoEndStream(type, score);
        }
      }
    });

    if (newViolations.length > 0) {
      setViolations(prev => [...prev.slice(-10), ...newViolations]); // Keep last 10
      onViolationDetected?.(newViolations);
      
      // Log violation for admin review
      logViolation(newViolations);
    }
  }, [onViolationDetected, streamId]);

  // Log violation to database
  const logViolation = async (violations) => {
    try {
      await base44.entities.ContentViolation.create({
        stream_id: streamId,
        creator_id: creatorId,
        violation_type: violations.map(v => v.type).join(','),
        confidence_score: Math.max(...violations.map(v => v.score)),
        status: 'pending_review',
        auto_action_taken: isBlurred ? 'blur' : 'none',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
  };

  // Handle automatic stream termination
  const handleAutoEndStream = async (violationType, score) => {
    toast.error('Stream ended due to policy violation');
    
    try {
      // End stream
      await base44.entities.Stream.update(streamId, {
        status: 'ended',
        end_reason: 'moderation_violation'
      });

      // Create moderation action
      await base44.entities.ModerationAction.create({
        stream_id: streamId,
        creator_id: creatorId,
        action_type: 'stream_terminated',
        reason: `Automatic termination: ${violationType} (confidence: ${(score * 100).toFixed(1)}%)`,
        automated: true
      });

      // Update creator record
      await base44.entities.Creator.update(creatorId, {
        is_live: false,
        current_stream_id: null,
        moderation_strikes: { $inc: 1 }
      });

    } catch (error) {
      console.error('Failed to end stream:', error);
    }
  };

  // Start/stop analysis
  useEffect(() => {
    if (enabled && videoRef?.current) {
      // Analyze every 5 seconds
      analysisIntervalRef.current = setInterval(analyzeFrame, 5000);
      
      return () => {
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
        }
      };
    }
  }, [enabled, analyzeFrame, videoRef]);

  // Reset violation count periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      violationCountRef.current = {};
    }, 60000); // Reset every minute
    
    return () => clearInterval(resetInterval);
  }, []);

  return (
    <>
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Blur overlay when violations detected */}
      {isBlurred && (
        <div className="absolute inset-0 backdrop-blur-xl bg-black/50 flex items-center justify-center z-50">
          <div className="text-center p-6 bg-red-900/80 rounded-xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2">Content Under Review</h3>
            <p className="text-red-200 text-sm mb-4">
              This stream has been temporarily paused for content review.
            </p>
            <button 
              onClick={() => setIsBlurred(false)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
            >
              I understand, continue streaming
            </button>
          </div>
        </div>
      )}

      {/* Moderation indicator */}
      {enabled && (
        <div className="absolute top-4 left-4 z-30">
          <Badge className="bg-green-600/80 text-white flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span className="text-xs">AI Moderated</span>
          </Badge>
        </div>
      )}

      {/* Recent violations (visible to creator only) */}
      {violations.length > 0 && (
        <div className="absolute top-12 left-4 z-30 max-w-xs">
          <div className="bg-yellow-900/80 rounded-lg p-2 text-xs">
            <div className="flex items-center gap-1 text-yellow-200 mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Content Warning</span>
            </div>
            <p className="text-yellow-100 text-xs">
              {violations[violations.length - 1]?.type} detected. Please review community guidelines.
            </p>
          </div>
        </div>
      )}
    </>
  );
}