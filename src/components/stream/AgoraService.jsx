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
      this.appId = appId;
      AgoraRTC.setLogLevel(2); // Info level logging
      this.client = AgoraRTC.createClient({ mode: 'live', codec: 'vp9' });
      
      // Handle network quality changes
      this.client.on('network-quality', (stats) => {
        this.stats.networkQuality = stats.downlinkNetworkQuality;
        this.notifyQualityChange();
      });

      // Handle user events
      this.client.on('user-published', this.handleUserPublished.bind(this));
      this.client.on('user-unpublished', this.handleUserUnpublished.bind(this));
      this.client.on('user-left', this.handleUserLeft.bind(this));

      return true;
    } catch (error) {
      console.error('Agora initialization failed:', error);
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
      // Create video track with adaptive bitrate
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: videoConfig.cameraId,
        encoderConfig: {
          width: videoConfig.width || 1080,
          height: videoConfig.height || 1920,
          frameRate: videoConfig.frameRate || 30,
          bitrateMin: videoConfig.bitrateMin || 500,
          bitrateMax: videoConfig.bitrateMax || 2500,
          bitrate: videoConfig.bitrate || 1500
        },
        optimizationMode: 'motion'
      });

      // Create audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: audioConfig.microphoneId,
        encoderConfig: {
          sampleRate: audioConfig.sampleRate || 48000,
          stereo: audioConfig.stereo !== false,
          mono: audioConfig.mono || false,
          bitrate: audioConfig.bitrate || 128
        },
        AEC: true,
        AGC: true,
        ANS: true
      });

      return {
        videoTrack: this.localVideoTrack,
        audioTrack: this.localAudioTrack
      };
    } catch (error) {
      console.error('Failed to create local tracks:', error);
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
    this.statsInterval = setInterval(async () => {
      try {
        if (this.localVideoTrack) {
          const videoStats = await this.localVideoTrack.getStats();
          if (videoStats) {
            this.stats.videoBitrate = videoStats.sendBitrate || 0;
            this.stats.videoResolution = `${videoStats.frameWidth || 1080}x${videoStats.frameHeight || 1920}`;
          }
        }

        if (this.localAudioTrack) {
          const audioStats = await this.localAudioTrack.getStats();
          if (audioStats) {
            this.stats.audioBitrate = audioStats.sendBitrate || 0;
          }
        }

        // Get connection stats
        const rtcStatsReport = await this.client.getRTCStats();
        if (rtcStatsReport) {
          this.stats.latency = rtcStatsReport.RTT || 0;
          this.stats.packetLoss = rtcStatsReport.packetsLost || 0;
        }

        this.notifyQualityChange();
      } catch (error) {
        console.error('Stats monitoring error:', error);
      }
    }, 2000); // Update every 2 seconds
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
      await this.client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        this.remoteUsers.set(user.uid, { ...user, videoTrack: user.videoTrack });
        // Play video in the main video element for viewers
        const videoElement = document.querySelector('video');
        if (videoElement && user.videoTrack) {
          user.videoTrack.play(videoElement, { fit: 'contain' });
        }
      } else if (mediaType === 'audio') {
        this.remoteUsers.set(user.uid, { ...this.remoteUsers.get(user.uid), audioTrack: user.audioTrack });
        if (user.audioTrack) {
          user.audioTrack.play();
        }
      }

      console.log(`User ${user.uid} published ${mediaType}`);
      
      // Notify listeners of user join
      this.notifyQualityChange();
    } catch (error) {
      console.error('Failed to handle user published:', error);
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