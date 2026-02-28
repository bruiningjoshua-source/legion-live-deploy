import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraStreamingService {
  constructor() {
    this.client = null;
    this.appId = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = new Map();
    this.stats = {
      videoBitrate: 0,
      audioBitrate: 0,
      videoResolution: '720p',
      networkQuality: 'good',
      latency: 0,
      packetLoss: 0
    };
    this.qualityCallbacks = [];
  }

  async initialize(appId) {
    try {
      // Prevent re-initialization
      if (this.client && this.appId === appId) {
        console.log('[Agora] Already initialized');
        return true;
      }
      
      this.appId = appId;
      AgoraRTC.setLogLevel(2); // Warning level for production
      
      // Create client optimized for mobile
      this.client = AgoraRTC.createClient({ 
        mode: 'live', 
        codec: 'vp8',
        role: 'host'
      });
      
      // Handle network quality with throttling
      let lastQualityUpdate = 0;
      this.client.on('network-quality', (stats) => {
        const now = Date.now();
        if (now - lastQualityUpdate > 2000) {
          this.stats.networkQuality = stats.downlinkNetworkQuality;
          this.notifyQualityChange();
          lastQualityUpdate = now;
        }
      });

      // Handle user events
      this.client.on('user-published', this.handleUserPublished.bind(this));
      this.client.on('user-unpublished', this.handleUserUnpublished.bind(this));
      this.client.on('user-left', this.handleUserLeft.bind(this));
      
      // Handle connection state
      this.client.on('connection-state-change', (curState, prevState) => {
        console.log(`[Agora] Connection: ${prevState} -> ${curState}`);
      });

      return true;
    } catch (error) {
      console.error('[Agora] Initialization failed:', error);
      throw error;
    }
  }

  async joinChannel(token, channelName, uid, role = 'host') {
    try {
      if (!this.client) {
        throw new Error('Agora client not initialized');
      }
      if (!this.appId) {
        throw new Error('Agora App ID not set');
      }

      // Set client role for live streaming
      await this.client.setClientRole(role === 'host' ? 'host' : 'audience');
      
      // Join with appId, channel, token, and uid
      await this.client.join(this.appId, channelName, token || null, uid);
      console.log(`Joined channel ${channelName} as ${role} with uid ${uid}`);
      return true;
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }

  async createLocalTracks(videoConfig = {}, audioConfig = {}) {
    try {
      // Detect mobile for optimized settings
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Create video track with adaptive settings
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: videoConfig.cameraId,
        facingMode: 'user',
        encoderConfig: isMobile ? {
          width: { min: 360, ideal: 540, max: 720 },
          height: { min: 640, ideal: 960, max: 1280 },
          frameRate: { min: 15, ideal: 24, max: 30 },
          bitrateMin: 300,
          bitrateMax: 1200,
        } : {
          width: { ideal: 720, max: 1080 },
          height: { ideal: 1280, max: 1920 },
          frameRate: videoConfig.frameRate || 30,
          bitrateMin: 400,
          bitrateMax: 2000,
        },
        optimizationMode: 'detail'
      });

      // Create audio track with optimizations
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: audioConfig.microphoneId,
        AEC: true,
        AGC: true,
        ANS: true,
        encoderConfig: isMobile ? 'speech_standard' : 'music_standard'
      });

      console.log('[Agora] Local tracks created (mobile:', isMobile, ')');
      return {
        videoTrack: this.localVideoTrack,
        audioTrack: this.localAudioTrack
      };
    } catch (error) {
      console.error('[Agora] Failed to create local tracks:', error);
      throw error;
    }
  }

  async publishTracks() {
    try {
      if (!this.localVideoTrack || !this.localAudioTrack) {
        throw new Error('Local tracks not created');
      }

      await this.client.publish([this.localVideoTrack, this.localAudioTrack]);
      console.log('Tracks published successfully');
      
      // Start monitoring stats
      this.startStatsMonitoring();
      return true;
    } catch (error) {
      console.error('Failed to publish tracks:', error);
      throw error;
    }
  }

  startStatsMonitoring() {
    // Less frequent monitoring for better performance
    this.statsInterval = setInterval(async () => {
      try {
        if (this.localVideoTrack) {
          const videoStats = this.localVideoTrack.getStats();
          if (videoStats) {
            this.stats.videoBitrate = videoStats.sendBitrate || 0;
            this.stats.videoResolution = `${videoStats.frameWidth || 720}x${videoStats.frameHeight || 1280}`;
          }
        }

        if (this.localAudioTrack) {
          const audioStats = this.localAudioTrack.getStats();
          if (audioStats) {
            this.stats.audioBitrate = audioStats.sendBitrate || 0;
          }
        }

        // Get connection stats
        if (this.client) {
          const rtcStatsReport = this.client.getRTCStats();
          if (rtcStatsReport) {
            this.stats.latency = rtcStatsReport.RTT || 0;
            this.stats.packetLoss = rtcStatsReport.packetsLost || 0;
          }
        }

        this.notifyQualityChange();
      } catch (error) {
        // Silent fail for stats - not critical
      }
    }, 3000); // Update every 3 seconds for less overhead
  }

  async setVideoQuality(quality) {
    try {
      if (!this.localVideoTrack) return;

      const configs = {
        '360p': { width: 640, height: 1140, bitrate: 500 },
        '480p': { width: 854, height: 1520, bitrate: 800 },
        '720p': { width: 1080, height: 1920, bitrate: 1500 },
        '1080p': { width: 1440, height: 2560, bitrate: 2500 }
      };

      const config = configs[quality] || configs['720p'];
      await this.localVideoTrack.setEncoderConfiguration({
        width: config.width,
        height: config.height,
        bitrate: config.bitrate,
        frameRate: 30
      });

      this.stats.videoResolution = quality;
      this.notifyQualityChange();
      console.log(`Video quality changed to ${quality}`);
      return true;
    } catch (error) {
      console.error('Failed to set video quality:', error);
      return false;
    }
  }

  // Auto-adapt quality based on network
  async adaptQuality() {
    const quality = this.stats.networkQuality;
    
    if (quality <= 2) { // Poor or weak network
      await this.setVideoQuality('360p');
    } else if (quality <= 4) { // Moderate network
      await this.setVideoQuality('480p');
    } else if (quality <= 6) { // Good network
      await this.setVideoQuality('720p');
    } else { // Excellent network
      await this.setVideoQuality('1080p');
    }
  }

  async handleUserPublished(user, mediaType) {
    try {
      console.log(`[Agora] Subscribing to user ${user.uid} ${mediaType}`);
      await this.client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        this.remoteUsers.set(user.uid, { ...user, videoTrack: user.videoTrack });
        
        // Play video in the main video element for viewers
        const videoElement = document.querySelector('video');
        if (videoElement && user.videoTrack) {
          // Stop any existing playback first
          try {
            user.videoTrack.stop();
          } catch (e) {}
          
          // Play to video element
          user.videoTrack.play(videoElement, { fit: 'contain', mirror: false });
          console.log(`[Agora] Playing remote video for user ${user.uid}`);
        }
      } else if (mediaType === 'audio') {
        const existingUser = this.remoteUsers.get(user.uid) || {};
        this.remoteUsers.set(user.uid, { ...existingUser, audioTrack: user.audioTrack });
        if (user.audioTrack) {
          user.audioTrack.play();
          console.log(`[Agora] Playing remote audio for user ${user.uid}`);
        }
      }
      
      // Notify listeners of user join
      this.notifyQualityChange();
    } catch (error) {
      console.error('[Agora] Failed to handle user published:', error);
    }
  }

  async handleUserUnpublished(user, mediaType) {
    try {
      if (mediaType === 'video' && user.videoTrack) {
        user.videoTrack.stop();
      }
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.stop();
      }
      console.log(`User ${user.uid} unpublished ${mediaType}`);
    } catch (error) {
      console.error('Failed to handle user unpublished:', error);
    }
  }

  handleUserLeft(user) {
    this.remoteUsers.delete(user.uid);
    console.log(`User ${user.uid} left`);
  }

  onQualityChange(callback) {
    this.qualityCallbacks.push(callback);
  }

  notifyQualityChange() {
    this.qualityCallbacks.forEach(cb => cb(this.stats));
  }

  getStats() {
    return { ...this.stats };
  }

  getRemoteUsers() {
    return Array.from(this.remoteUsers.values());
  }

  async leave() {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.client) {
        await this.client.leave();
      }
      
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }

      this.remoteUsers.clear();
      this.qualityCallbacks = [];
      console.log('Left channel and cleaned up resources');
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  }

  // Toggle microphone
  async toggleMic(enabled) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
      console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  // Toggle camera
  async toggleCamera(enabled) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
      console.log(`Camera ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  // Switch camera (front/back on mobile)
  async switchCamera() {
    if (this.localVideoTrack) {
      const devices = await AgoraRTC.getCameras();
      if (devices.length > 1) {
        const currentDevice = this.localVideoTrack.getTrackLabel();
        const nextDevice = devices.find(d => d.label !== currentDevice) || devices[0];
        await this.localVideoTrack.setDevice(nextDevice.deviceId);
        console.log(`Switched to camera: ${nextDevice.label}`);
        return true;
      }
    }
    return false;
  }

  // Get available devices
  async getDevices() {
    const cameras = await AgoraRTC.getCameras();
    const microphones = await AgoraRTC.getMicrophones();
    const speakers = await AgoraRTC.getPlaybackDevices();
    return { cameras, microphones, speakers };
  }

  // Check if tracks are active
  isStreaming() {
    return !!(this.localVideoTrack && this.localAudioTrack && this.client);
  }
}

export default new AgoraStreamingService();