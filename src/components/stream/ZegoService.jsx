import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

class ZegoStreamingService {
  constructor() {
    this.engine = null;
    this.appId = null;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.stats = {
      videoBitrate: 0,
      audioBitrate: 0,
      videoResolution: '720p',
      networkQuality: 'good',
      latency: 0,
      packetLoss: 0
    };
    this.qualityCallbacks = [];
    this.roomId = null;
    this.userId = null;
  }

  async initialize(appId) {
    try {
      if (this.engine && this.appId === appId) {
        console.log('[Zego] Already initialized');
        return true;
      }

      this.appId = parseInt(appId);
      
      // Create Zego engine with explicit server URLs for pure RTC
      this.engine = new ZegoExpressEngine(this.appId, 'wss://webliveroom773960930-api.coolzcloud.com/ws');
      
      console.log('[Zego] Engine created with appId:', this.appId);
      
      // Set up event handlers
      this.engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
        console.log(`[Zego] Room state: ${state}, error: ${errorCode}`, extendedData);
      });

      this.engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
        console.log(`[Zego] Stream update: ${updateType}`, streamList);
        
        if (updateType === 'ADD') {
          for (const stream of streamList) {
            await this.playRemoteStream(stream.streamID);
          }
        } else if (updateType === 'DELETE') {
          for (const stream of streamList) {
            this.stopRemoteStream(stream.streamID);
          }
        }
      });

      this.engine.on('publisherStateUpdate', (result) => {
        console.log('[Zego] Publisher state:', result);
      });

      this.engine.on('playerStateUpdate', (result) => {
        console.log('[Zego] Player state:', result);
      });

      this.engine.on('publishQualityUpdate', (streamID, stats) => {
        this.stats.videoBitrate = stats.video?.sendBitrate || 0;
        this.stats.audioBitrate = stats.audio?.sendBitrate || 0;
        this.notifyQualityChange();
      });

      this.engine.on('playQualityUpdate', (streamID, stats) => {
        this.stats.latency = stats.peerToPeerDelay || 0;
        this.notifyQualityChange();
      });

      console.log('[Zego] Engine initialized successfully');
      return true;
    } catch (error) {
      console.error('[Zego] Initialization failed:', error);
      throw error;
    }
  }

  async loginRoom(roomId, userId, userName, token) {
    try {
      if (!this.engine) {
        throw new Error('Zego engine not initialized');
      }

      this.roomId = roomId;
      this.userId = userId;

      console.log('[Zego] Attempting login - roomId:', roomId, 'userId:', userId, 'token length:', token?.length);

      // Login to room with token
      const result = await this.engine.loginRoom(roomId, token, {
        userID: userId,
        userName: userName || userId
      }, { userUpdate: true });

      console.log(`[Zego] Logged into room ${roomId} as ${userId}`, result);
      return result;
    } catch (error) {
      console.error('[Zego] Login failed:', error);
      throw error;
    }
  }

  async createLocalStream(videoConfig = {}) {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      console.log('[Zego] Creating local stream, isMobile:', isMobile);

      // Use simpler constraints that work across browsers
      this.localStream = await this.engine.createStream({
        camera: {
          video: {
            width: isMobile ? 480 : 720,
            height: isMobile ? 854 : 1280,
            frameRate: isMobile ? 24 : 30,
            bitRate: isMobile ? 600 : 1200
          },
          audio: true
        }
      });
      
      console.log('[Zego] Local stream created successfully');
      return this.localStream;
    } catch (error) {
      console.error('[Zego] Failed to create local stream:', error);
      throw error;
    }
  }

  async startPublishing(streamId) {
    try {
      if (!this.localStream) {
        throw new Error('Local stream not created');
      }

      await this.engine.startPublishingStream(streamId, this.localStream);
      console.log(`[Zego] Started publishing stream: ${streamId}`);
      
      // Start monitoring stats
      this.startStatsMonitoring();
      return true;
    } catch (error) {
      console.error('[Zego] Failed to start publishing:', error);
      throw error;
    }
  }

  async playRemoteStream(streamId) {
    try {
      const remoteStream = await this.engine.startPlayingStream(streamId);
      this.remoteStreams.set(streamId, remoteStream);
      
      // Play video in the main video element for viewers
      const videoElement = document.querySelector('video');
      if (videoElement && remoteStream) {
        videoElement.srcObject = remoteStream;
        videoElement.play().catch(e => console.log('[Zego] Autoplay blocked:', e));
      }
      
      console.log(`[Zego] Playing remote stream: ${streamId}`);
      return remoteStream;
    } catch (error) {
      console.error('[Zego] Failed to play remote stream:', error);
      throw error;
    }
  }

  stopRemoteStream(streamId) {
    try {
      this.engine.stopPlayingStream(streamId);
      this.remoteStreams.delete(streamId);
      console.log(`[Zego] Stopped remote stream: ${streamId}`);
    } catch (error) {
      console.error('[Zego] Failed to stop remote stream:', error);
    }
  }

  startStatsMonitoring() {
    this.statsInterval = setInterval(() => {
      // Stats are updated via event handlers
      this.notifyQualityChange();
    }, 3000);
  }

  async setVideoQuality(quality) {
    try {
      if (!this.localStream) return;

      const configs = {
        '360p': { width: 360, height: 640, bitrate: 400, frameRate: 24 },
        '480p': { width: 480, height: 854, bitrate: 600, frameRate: 24 },
        '720p': { width: 720, height: 1280, bitrate: 1200, frameRate: 30 },
        '1080p': { width: 1080, height: 1920, bitrate: 2000, frameRate: 30 }
      };

      const config = configs[quality] || configs['720p'];
      
      // Zego doesn't have direct encoder config update, would need to recreate stream
      // For now, just update stats display
      this.stats.videoResolution = quality;
      this.notifyQualityChange();
      console.log(`[Zego] Video quality target: ${quality}`);
      return true;
    } catch (error) {
      console.error('[Zego] Failed to set video quality:', error);
      return false;
    }
  }

  onQualityChange(callback) {
    this.qualityCallbacks.push(callback);
    return () => {
      this.qualityCallbacks = this.qualityCallbacks.filter(cb => cb !== callback);
    };
  }

  notifyQualityChange() {
    this.qualityCallbacks.forEach(cb => cb(this.stats));
  }

  getStats() {
    return { ...this.stats };
  }

  getRemoteStreams() {
    return Array.from(this.remoteStreams.values());
  }

  async toggleMic(enabled) {
    try {
      if (this.localStream) {
        await this.engine.muteMicrophone(!enabled);
        console.log(`[Zego] Microphone ${enabled ? 'enabled' : 'disabled'}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Zego] Toggle mic failed:', error);
      return false;
    }
  }

  async toggleCamera(enabled) {
    try {
      if (this.localStream) {
        await this.engine.mutePublishStreamVideo(this.localStream, !enabled);
        console.log(`[Zego] Camera ${enabled ? 'enabled' : 'disabled'}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Zego] Toggle camera failed:', error);
      return false;
    }
  }

  async switchCamera() {
    try {
      if (this.localStream) {
        const devices = await this.engine.enumDevices();
        const cameras = devices.cameras || [];
        if (cameras.length > 1) {
          // Would need to recreate stream with different camera
          console.log('[Zego] Switch camera - available cameras:', cameras.length);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[Zego] Switch camera failed:', error);
      return false;
    }
  }

  async getDevices() {
    try {
      const devices = await this.engine.enumDevices();
      return {
        cameras: devices.cameras || [],
        microphones: devices.microphones || [],
        speakers: devices.speakers || []
      };
    } catch (error) {
      console.error('[Zego] Get devices failed:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  async leave() {
    try {
      // Stop publishing
      if (this.localStream) {
        await this.engine.stopPublishingStream(this.roomId);
        await this.engine.destroyStream(this.localStream);
        this.localStream = null;
      }

      // Stop all remote streams
      for (const streamId of this.remoteStreams.keys()) {
        this.engine.stopPlayingStream(streamId);
      }
      this.remoteStreams.clear();

      // Leave room
      if (this.roomId) {
        await this.engine.logoutRoom(this.roomId);
        this.roomId = null;
      }

      // Clear stats monitoring
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }

      this.qualityCallbacks = [];
      console.log('[Zego] Left room and cleaned up resources');
    } catch (error) {
      console.error('[Zego] Leave failed:', error);
    }
  }

  isStreaming() {
    return !!(this.localStream && this.engine && this.roomId);
  }

  // Get local stream for video preview
  getLocalStream() {
    return this.localStream;
  }
}

export default new ZegoStreamingService();