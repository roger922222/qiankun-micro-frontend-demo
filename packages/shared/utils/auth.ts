/*
 * 登录态管理工具
 * 负责跨应用共享Cookie以及触发登录事件
 */

import { AuthEvents } from '../types/auth';

declare const process: any;

const DEFAULT_DOMAIN = typeof window !== 'undefined'
  ? `.${window.location.hostname.split('.').slice(-2).join('.')}`
  : undefined;

export class AuthManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static domain: string | undefined = DEFAULT_DOMAIN;

  static configure(options: { domain?: string } = {}): void {
    if (options.domain) {
      this.domain = options.domain;
    }
  }

  static setCookie(name: string, value: string, options: { expires?: Date; domain?: string } = {}): void {
    if (typeof document === 'undefined') return;

    const { expires, domain = this.domain } = options;
    const encoded = encodeURIComponent(value);
    const parts = [
      `${name}=${encoded}`,
      `path=/`
    ];

    if (domain) {
      parts.push(`domain=${domain}`);
    }

    if (expires) {
      parts.push(`expires=${expires.toUTCString()}`);
    }

    const isSecureContext = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;

    if (process?.env?.NODE_ENV === 'production') {
      parts.push('SameSite=None');
      parts.push('Secure');
    } else {
      parts.push('SameSite=Lax');
      if (isSecureContext) {
        parts.push('Secure');
      }
    }

    document.cookie = parts.join('; ');
  }

  static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const cookie of cookies) {
      const [key, ...rest] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(rest.join('='));
      }
    }
    return null;
  }

  static deleteCookie(name: string): void {
    this.setCookie(name, '', { expires: new Date(0) });
  }

  static setAuth(token: string, refreshToken: string, expiresInSeconds: number): void {
    const expires = new Date(Date.now() + expiresInSeconds * 1000);
    this.setCookie(this.TOKEN_KEY, token, { expires });
    this.setCookie(this.REFRESH_KEY, refreshToken, { expires });

    this.dispatchEvent('auth:login', { token, refreshToken });
  }

  static clearAuth(): void {
    this.deleteCookie(this.TOKEN_KEY);
    this.deleteCookie(this.REFRESH_KEY);
    this.dispatchEvent('auth:logout', undefined);
  }

  static getToken(): string | null {
    return this.getCookie(this.TOKEN_KEY);
  }

  private static dispatchEvent<T extends keyof AuthEvents>(type: T, detail: AuthEvents[T]): void {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent(type, { detail });
    window.dispatchEvent(event);
  }
}

export const authManager = AuthManager;