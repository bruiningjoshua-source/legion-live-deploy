import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

/**
 * ZegoStreamingService — Production singleton for all real-time streaming.
 * Handles: solo broadcasts, multi-panel co-streams, PK battles,
 * device switching, quality adaptation, screen sharing, and stats.
 */
class ZegoStreamingService {
  constructor() {
    this._reset();
  }

  _reset() {
    this.engine = null;
    this.appId = null;
    this.roomId = null;
    this.userId = null;
    this.localStream = null;
    this.screenStream = null;
    this.remoteStreams = new Map();   // streamID → MediaStream
    this.remoteUserMap = new Map();   // streamID → { userId, userName }
    this.statsInterval = null;
    this.qualityCallbacks = [];
    this.roomEventCallbacks = [];
    this.isPublishing = false;
    this.isScreenSharing = false;
    this.publishStreamId = null;   // Track the actual publish stream ID (BUG-2 fix)
    this.currentCamera = null;
    this.cameras = [];
    this.microphones = [];

    this.stats = {
      videoBitrate: 0,
      audioBitrate: 0,
      videoResolution: '720p',
      networkQuality: 'good',
      latency: 0,
      packetLoss: 0,
      fps: 0,
      rtt: 0
    };
  }

  // ─── ENGINE LIFECYCLE ───────────────────────────────────────────

  async initialize(appId) {
    if (this.engine && this.appId === appId) {
      console.log('[Zego] Already initialized with appId:', appId);
      return true;
    }

    // Destroy previous engine if switching appId
    if (this.engine) {
      await this.destroy();
    }

    this.appId = parseInt(appId);
    this.engine = new ZegoExpressEngine(
      this.appId,
      'wss://webliveroom773960930-api.coolzcloud.com/ws'
    );

    // ── Room state with auto-reconnect ──
    this.engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.log(`[Zego] Room ${roomID} state: ${state} (err ${errorCode})`);
      this._notifyRoomEvent({ type: 'roomState', roomID, state, errorCode });

      // Auto-reconnect on temporary disconnection (not user-initiated leave)
      if (state === 'DISCONNECTED' && !this._leaving && this.roomId && this._lastToken) {
        this._reconnectAttempts = (this._reconnectAttempts || 0) + 1;
        const maxRetries = 5;
        if (this._reconnectAttempts > maxRetries) {
          console.error('[Zego] Max reconnect attempts reached — giving up');
          this._reconnectAttempts = 0;
          return;
        }
        const backoff = Math.min(3000 * Math.pow(1.5, this._reconnectAttempts - 1), 15000);
        console.warn(`[Zego] Unexpected disconnect — attempt ${this._reconnectAttempts}/${maxRetries} in ${backoff}ms`);
        if (this._reconnectTimeout) clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = setTimeout(() => {
          if (!this._leaving && this.engine && this.roomId) {
            this.engine.loginRoom(this.roomId, this._lastToken, {
              userID: this.userId,
              userName: this._lastUserName || this.userId
            }, { userUpdate: true }).then(() => {
              console.log('[Zego] Reconnected to room:', this.roomId);
              this._reconnectAttempts = 0;
            }).catch(e => {
              console.error('[Zego] Reconnect failed:', e.message);
            });
          }
        }, backoff);
      } else if (state === 'CONNECTED') {
        this._reconnectAttempts = 0;
      }
    });

    // ── Stream add / remove ──
    this.engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
      console.log(`[Zego] Stream update in ${roomID}: ${updateType}`, streamList.map(s => s.streamID));

      if (updateType === 'ADD') {
        for (const stream of streamList) {
          await this._playRemoteStream(stream.streamID, stream.user);
        }
      } else if (updateType === 'DELETE') {
        for (const stream of streamList) {
          this._stopRemoteStream(stream.streamID);
        }
      }
      this._notifyRoomEvent({ type: 'streamUpdate', updateType, streamList });
    });

    // ── User join / leave ──
    this.engine.on('roomUserUpdate', (roomID, updateType, userList) => {
      console.log(`[Zego] User update in ${roomID}: ${updateType}`, userList);
      this._notifyRoomEvent({ type: 'userUpdate', updateType, userList });
    });

    // ── Publish quality ──
    this.engine.on('publishQualityUpdate', (streamID, stats) => {
      this.stats.videoBitrate = Math.round((stats.video?.sendBitrate || 0) / 1000);
      this.stats.audioBitrate = Math.round((stats.audio?.sendBitrate || 0) / 1000);
      this.stats.fps = stats.video?.sendFPS || 0;
      this.stats.rtt = stats.video?.rtt || 0;
      this._computeNetworkQuality();
      this._notifyQualityChange();
    });

    // ── Play quality ──
    this.engine.on('playQualityUpdate', (streamID, stats) => {
      this.stats.latency = stats.peerToPeerDelay || stats.delay || 0;
      this.stats.packetLoss = stats.video?.videoPacketsLostRate || 0;
      this._computeNetworkQuality();
      this._notifyQualityChange();
    });

    // ── Publisher state ──
    this.engine.on('publisherStateUpdate', (result) => {
      console.log('[Zego] Publisher state:', result.state, result.errorCode);
      if (result.state === 'PUBLISHING') {
        this.isPublishing = true;
      } else if (result.state === 'NO_PUBLISH') {
        this.isPublishing = false;
      }
    });

    // ── Player state ──
    this.engine.on('playerStateUpdate', (result) => {
      console.log('[Zego] Player state:', result.streamID, result.state, result.errorCode);
    });

    // Enumerate devices on init
    await this._enumerateDevices();
    console.log('[Zego] Engine initialized — appId:', this.appId);
    return true;
  }

  // ─── ROOM ───────────────────────────────────────────────────────

  async loginRoom(roomId, userId, userName, token) {
    if (!this.engine) throw new Error('Engine not initialized');
    if (!roomId || !userId || !token) throw new Error('Missing roomId, userId, or token');

    this.roomId = roomId;
    this.userId = userId;
    this._lastToken = token;
    this._lastUserName = userName || userId;
    this._leaving = false; // Reset leaving flag on new login

    console.log('[Zego] loginRoom — room:', roomId, 'user:', userId);

    const result = await this.engine.loginRoom(roomId, token, {
      userID: userId,
      userName: userName || userId
    }, { userUpdate: true });

    console.log('[Zego] Logged in successfully:', result);
    return result;
  }

  async logoutRoom() {
    if (!this.engine || !this.roomId) return;
    try {
      await this.engine.logoutRoom(this.roomId);
      console.log('[Zego] Logged out of room:', this.roomId);
    } catch (e) {
      console.warn('[Zego] logoutRoom error:', e);
    }
    this.roomId = null;
  }

  // ─── LOCAL STREAM (camera + mic) ───────────────────────────────

  async createLocalStream(config = {}) {
    if (!this.engine) throw new Error('Engine not initialized');

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const cameraConfig = {
      video: {
        width: config.width || (isMobile ? 480 : 720),
        height: config.height || (isMobile ? 854 : 1280),
        frameRate: config.frameRate || (isMobile ? 24 : 30),
        bitRate: config.bitRate || (isMobile ? 600 : 1200)
      },
      audio: {
        ANS: true,    // noise suppression
        AGC: true,    // auto gain
        AEC: true     // echo cancellation
      }
    };

    // If a specific camera or mic was selected, include it
    if (config.cameraId) cameraConfig.camera = { deviceID: config.cameraId };
    if (config.microphoneId) cameraConfig.audio.deviceID = config.microphoneId;

    this.localStream = await this.engine.createStream({ camera: cameraConfig });
    console.log('[Zego] Local stream created');
    return this.localStream;
  }

  async startPublishing(streamId) {
    if (!this.localStream) throw new Error('No local stream');

    await this.engine.startPublishingStream(streamId, this.localStream);
    this.isPublishing = true;
    this._startStatsMonitor();
    console.log('[Zego] Publishing stream:', streamId);
    return true;
  }

  async stopPublishing() {
    if (!this.engine || !this.isPublishing) return;
    try {
      this.engine.stopPublishingStream(this.roomId || '');
      this.isPublishing = false;
      console.log('[Zego] Stopped publishing');
    } catch (e) {
      console.warn('[Zego] stopPublishing error:', e);
    }
  }

  // ─── SCREEN SHARE ──────────────────────────────────────────────

  async startScreenShare(streamId) {
    if (!this.engine) throw new Error('Engine not initialized');

    this.screenStream = await this.engine.createStream({ screen: { audio: true, video: true } });
    const screenStreamId = streamId + '_screen';
    await this.engine.startPublishingStream(screenStreamId, this.screenStream);
    this.isScreenSharing = true;
    console.log('[Zego] Screen sharing started:', screenStreamId);

    // Listen for user stopping share via browser UI
    const videoTrack = this.screenStream.getVideoTracks?.()[0];
    if (videoTrack) {
      videoTrack.onended = () => this.stopScreenShare();
    }

    return this.screenStream;
  }

  async stopScreenShare() {
    if (!this.isScreenSharing || !this.engine) return;
    try {
      const screenStreamId = (this.roomId || '') + '_screen';
      this.engine.stopPublishingStream(screenStreamId);
      if (this.screenStream) {
        this.engine.destroyStream(this.screenStream);
        this.screenStream = null;
      }
      this.isScreenSharing = false;
      console.log('[Zego] Screen sharing stopped');
    } catch (e) {
      console.warn('[Zego] stopScreenShare error:', e);
    }
  }

  // ─── REMOTE STREAMS ────────────────────────────────────────────

  async _playRemoteStream(streamId, userInfo) {
    try {
      const remoteStream = await this.engine.startPlayingStream(streamId);
      this.remoteStreams.set(streamId, remoteStream);
      if (userInfo) {
        this.remoteUserMap.set(streamId, {
          userId: userInfo.userID || streamId,
          userName: userInfo.userName || 'Unknown'
        });
      }

      // Auto-attach to first available <video> element if solo viewing
      if (this.remoteStreams.size === 1) {
        const videoEl = document.querySelector('video[data-zego-remote]') || document.querySelector('video');
        if (videoEl && remoteStream) {
          videoEl.srcObject = remoteStream;
          videoEl.play().catch(e => console.warn('[Zego] autoplay blocked:', e));
        }
      }

      console.log('[Zego] Playing remote stream:', streamId);
      this._notifyRoomEvent({ type: 'remoteStreamAdded', streamId, remoteStream, userInfo });
      return remoteStream;
    } catch (e) {
      console.error('[Zego] Play remote stream error:', streamId, e);
      throw e;
    }
  }

  _stopRemoteStream(streamId) {
    try {
      this.engine.stopPlayingStream(streamId);
    } catch (e) {
      console.warn('[Zego] stopPlayingStream error:', e);
    }
    this.remoteStreams.delete(streamId);
    this.remoteUserMap.delete(streamId);
    console.log('[Zego] Stopped remote stream:', streamId);
    this._notifyRoomEvent({ type: 'remoteStreamRemoved', streamId });
  }

  async getRemoteStreams() {
    // If no remote streams cached yet, ask the engine for the current list
    if (this.remoteStreams.size === 0 && this.engine && this.roomId) {
      try {
        const streamList = await this.engine.getStreamList?.(this.roomId);
        if (streamList?.length) {
          for (const s of streamList) {
            if (!this.remoteStreams.has(s.streamID)) {
              await this._playRemoteStream(s.streamID, s.user);
            }
          }
        }
      } catch (e) {
        console.warn('[Zego] getStreamList fallback error:', e.message);
      }
    }
    return Array.from(this.remoteStreams.entries()).map(([id, stream]) => ({
      streamId: id,
      stream,
      ...(this.remoteUserMap.get(id) || {})
    }));
  }

  getRemoteStreamById(streamId) {
    return this.remoteStreams.get(streamId) || null;
  }

  // ─── DEVICE MANAGEMENT ─────────────────────────────────────────

  async _enumerateDevices() {
    try {
      const devices = await this.engine.enumDevices();
      this.cameras = devices.cameras || [];
      this.microphones = devices.microphones || [];
      console.log('[Zego] Devices — cameras:', this.cameras.length, 'mics:', this.microphones.length);
    } catch (e) {
      console.warn('[Zego] enumDevices error:', e);
      this.cameras = [];
      this.microphones = [];
    }
  }

  async getDevices() {
    await this._enumerateDevices();
    return { cameras: this.cameras, microphones: this.microphones };
  }

  async switchCamera(deviceId) {
    if (!this.localStream || !this.engine) return false;
    try {
      await this.engine.useVideoDevice(this.localStream, deviceId);
      this.currentCamera = deviceId;
      console.log('[Zego] Switched camera:', deviceId);
      return true;
    } catch (e) {
      console.error('[Zego] switchCamera error:', e);
      return false;
    }
  }

  async cycleCameras() {
    if (this.cameras.length < 2) return false;
    const currentIdx = this.cameras.findIndex(c => c.deviceID === this.currentCamera);
    const nextIdx = (currentIdx + 1) % this.cameras.length;
    return this.switchCamera(this.cameras[nextIdx].deviceID);
  }

  async switchMicrophone(deviceId) {
    if (!this.localStream || !this.engine) return false;
    try {
      await this.engine.useAudioDevice(this.localStream, deviceId);
      console.log('[Zego] Switched microphone:', deviceId);
      return true;
    } catch (e) {
      console.error('[Zego] switchMicrophone error:', e);
      return false;
    }
  }

  // ─── MIC / CAMERA TOGGLE ──────────────────────────────────────

  async toggleMic(enabled) {
    if (!this.engine) return false;
    try {
      await this.engine.muteMicrophone(!enabled);
      console.log('[Zego] Mic', enabled ? 'ON' : 'OFF');
      return true;
    } catch (e) {
      console.error('[Zego] toggleMic error:', e);
      return false;
    }
  }

  async toggleCamera(enabled) {
    if (!this.localStream || !this.engine) return false;
    try {
      await this.engine.mutePublishStreamVideo(this.localStream, !enabled);
      console.log('[Zego] Camera', enabled ? 'ON' : 'OFF');
      return true;
    } catch (e) {
      console.error('[Zego] toggleCamera error:', e);
      return false;
    }
  }

  // ─── QUALITY ADAPTATION ────────────────────────────────────────

  async setVideoQuality(quality) {
    if (!this.localStream || !this.engine) return false;

    const presets = {
      '360p':  { width: 360,  height: 640,  bitRate: 400,  frameRate: 24 },
      '480p':  { width: 480,  height: 854,  bitRate: 700,  frameRate: 24 },
      '720p':  { width: 720,  height: 1280, bitRate: 1200, frameRate: 30 },
      '1080p': { width: 1080, height: 1920, bitRate: 2500, frameRate: 30 }
    };

    const preset = presets[quality] || presets['720p'];

    try {
      // Recreate local stream with new config then republish
      const wasPublishing = this.isPublishing;
      const publishStreamId = this.roomId; // stream ID = room ID convention

      if (wasPublishing) {
        this.engine.stopPublishingStream(publishStreamId);
      }
      if (this.localStream) {
        this.engine.destroyStream(this.localStream);
      }

      this.localStream = await this.engine.createStream({
        camera: {
          video: {
            width: preset.width,
            height: preset.height,
            frameRate: preset.frameRate,
            bitRate: preset.bitRate
          },
          audio: { ANS: true, AGC: true, AEC: true }
        }
      });

      if (wasPublishing) {
        await this.engine.startPublishingStream(publishStreamId, this.localStream);
      }

      this.stats.videoResolution = quality;
      this._notifyQualityChange();
      console.log('[Zego] Quality changed to', quality);
      return true;
    } catch (e) {
      console.error('[Zego] setVideoQuality error:', e);
      return false;
    }
  }

  _computeNetworkQuality() {
    const { rtt, packetLoss, videoBitrate } = this.stats;
    if (rtt > 300 || packetLoss > 10) {
      this.stats.networkQuality = 'poor';
    } else if (rtt > 150 || packetLoss > 5) {
      this.stats.networkQuality = 'fair';
    } else if (rtt > 80 || packetLoss > 2) {
      this.stats.networkQuality = 'good';
    } else {
      this.stats.networkQuality = 'excellent';
    }
  }

  // ─── STATS MONITOR ─────────────────────────────────────────────

  _startStatsMonitor() {
    if (this.statsInterval) return;
    this.statsInterval = setInterval(() => {
      this._notifyQualityChange();
    }, 3000);
  }

  _stopStatsMonitor() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  getStats() { return { ...this.stats }; }

  // ─── EVENT SUBSCRIPTIONS ───────────────────────────────────────

  onQualityChange(callback) {
    this.qualityCallbacks.push(callback);
    return () => {
      this.qualityCallbacks = this.qualityCallbacks.filter(cb => cb !== callback);
    };
  }

  onRoomEvent(callback) {
    this.roomEventCallbacks.push(callback);
    return () => {
      this.roomEventCallbacks = this.roomEventCallbacks.filter(cb => cb !== callback);
    };
  }

  _notifyQualityChange() {
    const s = this.stats;
    this.qualityCallbacks.forEach(cb => cb(s));
  }

  _notifyRoomEvent(event) {
    this.roomEventCallbacks.forEach(cb => cb(event));
  }

  // ─── TEARDOWN ──────────────────────────────────────────────────

  async leave() {
    if (this._leaving) return; // Prevent concurrent leave calls
    this._leaving = true;

    // Cancel any pending reconnect immediately
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }

    console.log('[Zego] Leaving — cleanup start');

    this._stopStatsMonitor();

    const engine = this.engine; // Capture ref in case it's nulled during async ops

    // Stop publishing
    if (this.isPublishing && engine) {
      try { engine.stopPublishingStream(this.roomId || ''); } catch (e) {
        console.warn('[Zego] stopPublishing error:', e.message);
      }
    }

    // Stop screen share
    if (this.isScreenSharing && engine) {
      try { engine.stopPublishingStream((this.roomId || '') + '_screen'); } catch (e) {}
      if (this.screenStream) {
        try { engine.destroyStream(this.screenStream); } catch (e) {}
        // Also stop raw tracks
        try { this.screenStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
    }

    // Destroy local stream (stop raw tracks to release hardware)
    if (this.localStream) {
      if (engine) {
        try { engine.destroyStream(this.localStream); } catch (e) {}
      }
      try { this.localStream.getTracks().forEach(t => { t.stop(); t.enabled = false; }); } catch (e) {}
    }

    // Stop all remote streams
    if (engine) {
      for (const streamId of this.remoteStreams.keys()) {
        try { engine.stopPlayingStream(streamId); } catch (e) {}
      }
    }
    this.remoteStreams.clear();
    this.remoteUserMap.clear();

    // Leave room
    const roomId = this.roomId;
    if (roomId && engine) {
      try { await engine.logoutRoom(roomId); } catch (e) {
        console.warn('[Zego] logoutRoom error:', e.message);
      }
    }

    this.localStream = null;
    this.screenStream = null;
    this.isPublishing = false;
    this.isScreenSharing = false;
    this.roomId = null;
    this.userId = null;
    this._lastToken = null;
    this._lastUserName = null;
    this.qualityCallbacks = [];
    this.roomEventCallbacks = [];
    this._leaving = false;
    this._reconnectAttempts = 0;

    console.log('[Zego] Cleanup complete');
  }

  async destroy() {
    await this.leave();
    if (this.engine) {
      try { this.engine.logoutRoom(); } catch (e) {}
      try { ZegoExpressEngine.destroyEngine?.(this.engine); } catch (e) {}
      this.engine = null;
    }
    this.appId = null;
    console.log('[Zego] Engine destroyed');
  }

  // ─── UTILITY ───────────────────────────────────────────────────

  isStreaming() {
    return !!(this.localStream && this.engine && this.roomId && this.isPublishing);
  }

  getLocalStream() {
    return this.localStream;
  }

  getRoomId() { return this.roomId; }
  getUserId() { return this.userId; }
}

export default new ZegoStreamingService();