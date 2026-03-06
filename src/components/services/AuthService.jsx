/**
 * AuthService — Centralized authentication layer.
 * Equivalent to a dedicated auth microservice.
 */
import { base44 } from '@/api/base44Client';

class AuthService {
  _user = null;
  _promise = null;

  /** Get current user (cached). Throws if not authenticated. */
  async getUser() {
    if (this._user) return this._user;
    if (this._promise) return this._promise;
    this._promise = base44.auth.me().then(u => {
      this._user = u;
      this._promise = null;
      return u;
    }).catch(e => {
      this._promise = null;
      throw e;
    });
    return this._promise;
  }

  /** Safe check — returns null instead of throwing */
  async getUserSafe() {
    try { return await this.getUser(); }
    catch { return null; }
  }

  async isAuthenticated() {
    return base44.auth.isAuthenticated();
  }

  async isAdmin() {
    const user = await this.getUserSafe();
    return user?.role === 'admin';
  }

  /** Clear cached user (e.g. after profile update) */
  invalidate() {
    this._user = null;
    this._promise = null;
  }

  logout(redirectUrl) {
    this.invalidate();
    return base44.auth.logout(redirectUrl);
  }

  redirectToLogin(nextUrl) {
    return base44.auth.redirectToLogin(nextUrl);
  }

  async updateMe(data) {
    const result = await base44.auth.updateMe(data);
    this.invalidate();
    return result;
  }
}

export default new AuthService();