// 分享管理器
interface DashboardConfig {
  layout: any;
  filters: any;
  charts: any[];
  theme: string;
  permissions: Permission[];
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
  };
}

interface Permission {
  type: 'read' | 'write' | 'admin';
  level: number;
  resource?: string;
}

interface ShareLink {
  id: string;
  url: string;
  qrCode: string;
  expiresAt: number;
  permissions: Permission[];
  accessCount: number;
  maxAccess?: number;
  password?: string;
  metadata: {
    title: string;
    createdAt: number;
    createdBy: string;
  };
}

interface ShareOptions {
  expirationDays?: number;
  maxAccess?: number;
  password?: string;
  permissions?: Permission[];
  allowDownload?: boolean;
  allowEdit?: boolean;
}

export class ShareManager {
  private shareCache = new Map<string, ShareLink>();
  private compressionWorker: Worker | null = null;

  constructor() {
    this.initializeWorker();
    this.loadShareCache();
  }

  // 生成分享链接
  async generateShareLink(dashboardConfig: DashboardConfig, options: ShareOptions = {}): Promise<ShareLink> {
    const shareId = this.generateShareId();
    const expirationTime = options.expirationDays 
      ? Date.now() + (options.expirationDays * 24 * 60 * 60 * 1000)
      : Date.now() + (7 * 24 * 60 * 60 * 1000); // 默认7天

    const shareData = {
      config: dashboardConfig,
      timestamp: Date.now(),
      version: '1.0',
      expiresAt: expirationTime,
      options: {
        allowDownload: options.allowDownload ?? true,
        allowEdit: options.allowEdit ?? false,
        ...options
      }
    };

    try {
      // 压缩和加密数据
      const compressed = await this.compressData(shareData);
      const encrypted = await this.encryptData(compressed, options.password);
      
      // 存储到服务器
      await this.storeShareData(shareId, encrypted);
      
      // 生成 QR 码
      const shareUrl = `${window.location.origin}/shared/${shareId}`;
      const qrCode = await this.generateQRCode(shareUrl);
      
      const shareLink: ShareLink = {
        id: shareId,
        url: shareUrl,
        qrCode,
        expiresAt: expirationTime,
        permissions: options.permissions || dashboardConfig.permissions,
        accessCount: 0,
        maxAccess: options.maxAccess,
        password: options.password,
        metadata: {
          title: dashboardConfig.metadata.title,
          createdAt: Date.now(),
          createdBy: this.getCurrentUser()
        }
      };

      // 缓存分享链接
      this.shareCache.set(shareId, shareLink);
      this.saveShareCache();
      
      console.log(`Share link generated: ${shareUrl}`);
      return shareLink;
      
    } catch (error) {
      console.error('Failed to generate share link:', error);
      throw new Error(`分享链接生成失败: ${error.message}`);
    }
  }

  // 解析分享链接
  async parseShareLink(shareId: string, password?: string): Promise<DashboardConfig> {
    try {
      // 从缓存或服务器获取数据
      let shareLink = this.shareCache.get(shareId);
      if (!shareLink) {
        shareLink = await this.fetchShareData(shareId);
        if (shareLink) {
          this.shareCache.set(shareId, shareLink);
        }
      }

      if (!shareLink) {
        throw new Error('分享链接不存在');
      }

      // 验证访问权限
      this.validateAccess(shareLink, password);
      
      // 增加访问计数
      shareLink.accessCount++;
      this.saveShareCache();
      
      // 获取加密数据
      const encryptedData = await this.getShareData(shareId);
      
      // 解密和解压数据
      const decrypted = await this.decryptData(encryptedData, password);
      const decompressed = await this.decompressData(decrypted);
      
      return decompressed.config;
      
    } catch (error) {
      console.error('Failed to parse share link:', error);
      throw error;
    }
  }

  // 权限验证
  validateAccess(shareLink: ShareLink, password?: string): void {
    // 检查过期时间
    if (Date.now() > shareLink.expiresAt) {
      throw new Error('分享链接已过期');
    }
    
    // 检查访问次数限制
    if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
      throw new Error('分享链接访问次数已达上限');
    }
    
    // 检查密码
    if (shareLink.password && shareLink.password !== password) {
      throw new Error('密码错误');
    }
    
    // 检查用户权限
    const userPermissions = this.getCurrentUserPermissions();
    const hasAccess = shareLink.permissions.some(required => 
      userPermissions.some(user => user.level >= required.level)
    );
    
    if (!hasAccess) {
      throw new Error('权限不足');
    }
  }

  // 数据压缩
  private async compressData(data: any): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const messageId = Date.now().toString();
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({
        id: messageId,
        action: 'compress',
        data: JSON.stringify(data)
      });
    });
  }

  // 数据解压
  private async decompressData(compressedData: ArrayBuffer): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const messageId = Date.now().toString();
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(JSON.parse(event.data.result));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({
        id: messageId,
        action: 'decompress',
        data: compressedData
      });
    });
  }

  // 数据加密
  private async encryptData(data: ArrayBuffer, password?: string): Promise<ArrayBuffer> {
    if (!password) {
      return data; // 无密码则不加密
    }

    try {
      const key = await this.deriveKey(password);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      // 将 IV 和加密数据合并
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);
      
      return result.buffer;
    } catch (error) {
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  // 数据解密
  private async decryptData(encryptedData: ArrayBuffer, password?: string): Promise<ArrayBuffer> {
    if (!password) {
      return encryptedData; // 无密码则直接返回
    }

    try {
      const key = await this.deriveKey(password);
      const data = new Uint8Array(encryptedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return decrypted;
    } catch (error) {
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  // 派生密钥
  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('dashboard-share-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // 生成 QR 码
  private async generateQRCode(url: string): Promise<string> {
    try {
      // 使用简单的 QR 码生成
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      
      // 验证 QR 码服务可用性
      const response = await fetch(qrCodeUrl, { method: 'HEAD' });
      if (response.ok) {
        return qrCodeUrl;
      }
      
      // 如果外部服务不可用，返回备用方案
      return this.generateFallbackQRCode(url);
    } catch (error) {
      console.warn('Failed to generate QR code:', error);
      return this.generateFallbackQRCode(url);
    }
  }

  private generateFallbackQRCode(url: string): string {
    // 简单的 SVG QR 码占位符
    const size = 200;
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white"/>
        <rect x="20" y="20" width="20" height="20" fill="black"/>
        <rect x="160" y="20" width="20" height="20" fill="black"/>
        <rect x="20" y="160" width="20" height="20" fill="black"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" font-size="12" fill="black">QR Code</text>
        <text x="${size/2}" y="${size/2 + 20}" text-anchor="middle" font-size="10" fill="gray">扫码访问</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // 存储分享数据
  private async storeShareData(shareId: string, data: ArrayBuffer): Promise<void> {
    try {
      // 这里应该调用后端API存储数据
      // 为了演示，我们使用 localStorage（实际应用中不推荐）
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(data)));
      localStorage.setItem(`share_${shareId}`, base64Data);
    } catch (error) {
      throw new Error(`存储分享数据失败: ${error.message}`);
    }
  }

  // 获取分享数据
  private async getShareData(shareId: string): Promise<ArrayBuffer> {
    try {
      const base64Data = localStorage.getItem(`share_${shareId}`);
      if (!base64Data) {
        throw new Error('分享数据不存在');
      }
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } catch (error) {
      throw new Error(`获取分享数据失败: ${error.message}`);
    }
  }

  // 获取分享链接信息
  private async fetchShareData(shareId: string): Promise<ShareLink | null> {
    try {
      // 这里应该调用后端API获取分享链接信息
      // 为了演示，从 localStorage 读取
      const stored = localStorage.getItem(`share_meta_${shareId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to fetch share data:', error);
      return null;
    }
  }

  // 初始化压缩工作线程
  private initializeWorker(): void {
    try {
      // 创建压缩工作线程
      const workerCode = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js');
        
        self.addEventListener('message', function(event) {
          const { id, action, data } = event.data;
          
          try {
            let result;
            if (action === 'compress') {
              const compressed = pako.deflate(data);
              result = compressed.buffer;
            } else if (action === 'decompress') {
              const decompressed = pako.inflate(data, { to: 'string' });
              result = decompressed;
            }
            
            self.postMessage({ id, result });
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        });
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
    }
  }

  // 生成分享ID
  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取当前用户
  private getCurrentUser(): string {
    // 这里应该从认证系统获取用户信息
    return 'anonymous_user';
  }

  // 获取当前用户权限
  private getCurrentUserPermissions(): Permission[] {
    // 这里应该从认证系统获取用户权限
    return [{ type: 'read', level: 1 }];
  }

  // 缓存管理
  private loadShareCache(): void {
    try {
      const cached = localStorage.getItem('share_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.shareCache = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load share cache:', error);
    }
  }

  private saveShareCache(): void {
    try {
      const data = Array.from(this.shareCache.entries());
      localStorage.setItem('share_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save share cache:', error);
    }
  }

  // 公共方法
  async revokeShareLink(shareId: string): Promise<void> {
    this.shareCache.delete(shareId);
    localStorage.removeItem(`share_${shareId}`);
    localStorage.removeItem(`share_meta_${shareId}`);
    this.saveShareCache();
  }

  getShareLinks(): ShareLink[] {
    return Array.from(this.shareCache.values());
  }

  async updateShareLink(shareId: string, options: Partial<ShareOptions>): Promise<ShareLink> {
    const shareLink = this.shareCache.get(shareId);
    if (!shareLink) {
      throw new Error('分享链接不存在');
    }

    // 更新选项
    if (options.expirationDays) {
      shareLink.expiresAt = Date.now() + (options.expirationDays * 24 * 60 * 60 * 1000);
    }
    if (options.maxAccess !== undefined) {
      shareLink.maxAccess = options.maxAccess;
    }
    if (options.password !== undefined) {
      shareLink.password = options.password;
    }

    this.shareCache.set(shareId, shareLink);
    this.saveShareCache();
    
    return shareLink;
  }
}

// 单例导出
export const shareManager = new ShareManager();