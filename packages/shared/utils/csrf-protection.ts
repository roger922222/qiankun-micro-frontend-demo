export class CSRFProtection {
  private static readonly CSRF_TOKEN_KEY = 'csrf_token';

  // 生成CSRF Token
  static generateCSRFToken(): string {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
    return token;
  }

  // 获取CSRF Token
  static getCSRFToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  // 验证CSRF Token
  static validateCSRFToken(token: string): boolean {
    const storedToken = this.getCSRFToken();
    return storedToken === token;
  }

  // 为请求添加CSRF保护
  static addCSRFProtection(request: Request): Request {
    const token = this.getCSRFToken();
    if (token) {
      request.headers.set('X-CSRF-Token', token);
    }
    return request;
  }
}