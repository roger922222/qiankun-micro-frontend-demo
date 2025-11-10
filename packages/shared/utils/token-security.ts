export class TokenSecurity {
  private static getKey(): string {
    if (typeof window === 'undefined') return 'default-key';
    return window.btoa(window.location.hostname);
  }

  static encryptToken(token: string): string {
    if (typeof window === 'undefined') {
      return token;
    }
    const key = this.getKey();
    let encrypted = '';
    for (let i = 0; i < token.length; i++) {
      encrypted += String.fromCharCode(token.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return window.btoa(encrypted);
  }

  static decryptToken(encryptedToken: string): string {
    try {
      if (typeof window === 'undefined') {
        return encryptedToken;
      }
      const decoded = window.atob(encryptedToken);
      const key = this.getKey();
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch {
      return '';
    }
  }

  static validateToken(token: string): boolean {
    if (!token) return false;
    return token.split('.').length === 3;
  }

  static isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const [, payload] = token.split('.');
      if (typeof window === 'undefined') {
        return false;
      }
      const decoded = JSON.parse(window.atob(payload));
      const currentTime = Math.floor(Date.now() / 1000);
      return typeof decoded.exp === 'number' ? decoded.exp < currentTime : true;
    } catch {
      return true;
    }
  }
}