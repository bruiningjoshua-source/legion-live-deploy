/**
 * ResourceDisposer — tracks GPU/media resources by scope and disposes them on cleanup.
 * Used by LegionAREngine (scope: 'ar-engine') and EngineOrchestrator (disposeAll).
 */

class ResourceDisposerService {
  constructor() {
    this._scopes = new Map(); // scope → [{type, resource}]
  }

  /** Register a resource under a named scope */
  register(scope, type, resource) {
    if (!this._scopes.has(scope)) this._scopes.set(scope, []);
    this._scopes.get(scope).push({ type, resource });
  }

  /** Dispose all resources in a scope */
  disposeScope(scope) {
    const entries = this._scopes.get(scope);
    if (!entries) return;
    for (const { type, resource } of entries) {
      this._dispose(type, resource);
    }
    this._scopes.delete(scope);
  }

  /** Dispose every scope */
  disposeAll() {
    for (const scope of this._scopes.keys()) {
      this.disposeScope(scope);
    }
    this._scopes.clear();
  }

  /** Return summary stats */
  getStats() {
    let total = 0;
    const scopes = {};
    for (const [scope, entries] of this._scopes) {
      scopes[scope] = entries.length;
      total += entries.length;
    }
    return { total, scopes };
  }

  /** Internal: attempt to release a resource */
  _dispose(type, resource) {
    if (!resource) return;
    try {
      if (typeof resource.destroy === 'function') { resource.destroy(); return; }
      if (typeof resource.dispose === 'function') { resource.dispose(); return; }
      if (typeof resource.close === 'function') { resource.close(); return; }
      if (typeof resource.stop === 'function') { resource.stop(); return; }
      // MediaStream tracks
      if (typeof resource.getTracks === 'function') {
        resource.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      console.warn('[ResourceDisposer] Cleanup failed:', type, e.message);
    }
  }
}

const Disposer = new ResourceDisposerService();
export default Disposer;