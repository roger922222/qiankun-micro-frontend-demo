import { AuthSubscriber, AuthStatus } from '../types/auth';

type TokenCallback = (token: string | null, status: AuthStatus) => void;

interface SubscriberEntry {
  id: string;
  callback: TokenCallback;
}

interface StorageSnapshot {
  token: string | null;
  refreshToken?: string | null;
  timestamp: number;
}

export class AuthBridge {
  private static instance: AuthBridge;
  private token: string | null = null;
  private readonly subscribers: Map<string, TokenCallback> = new Map();
  private initialized = false;
  private ready = false;
  private broadcastChannel?: BroadcastChannel;
  private readyResolvers: Array<(status: AuthStatus) => void> = [];

  static getInstance(): AuthBridge {
    if (!this.instance) {
      this.instance = new AuthBridge();
    }
    return this.instance;
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('auth:login', this.handleLogin);
    window.addEventListener('auth:logout', this.handleLogout);
    window.addEventListener('storage', this.handleStorageChange);

    this.setupBroadcastChannel();
    this.syncToken();
  }

  subscribe(id: string, callback: AuthSubscriber | TokenCallback): () => void {
    const wrapped: TokenCallback = (token, status) => {
      if (callback.length > 1) {
        (callback as TokenCallback)(token, status);
      } else {
        (callback as AuthSubscriber)(token);
      }
    };

    this.subscribers.set(id, wrapped);

    wrapped(this.token, { ready: this.ready, token: this.token });

    return () => this.unsubscribe(id);
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  getToken(): string | null {
    return this.token;
  }

  isReady(): boolean {
    return this.ready;
  }

  waitForReady(timeout = 5000): Promise<AuthStatus> {
    if (this.ready) {
      return Promise.resolve({ ready: true, token: this.token });
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeReadyResolver(resolve);
        reject(new Error('AuthBridge ready timeout'));
      }, timeout);

      this.readyResolvers.push(status => {
        clearTimeout(timer);
        resolve(status);
      });
    });
  }

  clearToken(): void {
    this.token = null;
    this.ready = true;
    this.persist({ token: null, timestamp: Date.now() });
    this.notifySubscribers();
  }

  private handleLogin = (event: Event) => {
    const { detail } = event as CustomEvent<{ token: string; refreshToken?: string }>;
    this.token = detail?.token || null;
    this.ready = true;
    this.persist({ token: this.token, refreshToken: detail?.refreshToken, timestamp: Date.now() });
    this.notifySubscribers();
    this.broadcast('auth:login', detail);
  };

  private handleLogout = () => {
    this.token = null;
    this.ready = true;
    this.persist({ token: null, timestamp: Date.now() });
    this.notifySubscribers();
    this.broadcast('auth:logout');
  };

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key !== 'auth_sync') return;
    try {
      const snapshot = event.newValue ? (JSON.parse(event.newValue) as StorageSnapshot) : null;
      if (snapshot) {
        this.applySnapshot(snapshot);
      }
    } catch (error) {
      console.warn('[AuthBridge] storage sync error', error);
    }
  };

  private setupBroadcastChannel(): void {
    if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') {
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel('auth_channel');
      this.broadcastChannel.addEventListener('message', event => {
        if (!event.data) return;
        if (event.data.type === 'auth:login') {
          this.applySnapshot({
            token: event.data.payload?.token || null,
            refreshToken: event.data.payload?.refreshToken,
            timestamp: Date.now()
          });
        }

        if (event.data.type === 'auth:logout') {
          this.applySnapshot({ token: null, timestamp: Date.now() });
        }
      });
    } catch (error) {
      console.warn('[AuthBridge] BroadcastChannel unavailable', error);
    }
  }

  private broadcast(type: 'auth:login' | 'auth:logout', payload?: any): void {
    if (!this.broadcastChannel) return;
    try {
      this.broadcastChannel.postMessage({ type, payload });
    } catch (error) {
      console.warn('[AuthBridge] broadcast error', error);
    }
  }

  private syncToken(): void {
    const raw = this.retrieve();
    if (!raw) {
      this.ready = true;
      this.notifySubscribers();
      return;
    }

    this.applySnapshot(raw);
  }

  private notifySubscribers(): void {
    const status: AuthStatus = { ready: this.ready, token: this.token };
    this.subscribers.forEach(callback => {
      try {
        callback(this.token, status);
      } catch (error) {
        console.error('[AuthBridge] subscriber error', error);
      }
    });

    if (this.ready) {
      this.flushReadyResolvers(status);
    }
  }

  private applySnapshot(snapshot: StorageSnapshot): void {
    this.token = snapshot.token;
    this.ready = true;
    this.notifySubscribers();
  }

  private persist(snapshot: StorageSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('auth_sync', JSON.stringify(snapshot));
    } catch (error) {
      console.warn('[AuthBridge] persist error', error);
    }
  }

  private retrieve(): StorageSnapshot | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('auth_sync');
      return raw ? (JSON.parse(raw) as StorageSnapshot) : null;
    } catch (error) {
      console.warn('[AuthBridge] retrieve error', error);
      return null;
    }
  }

  private flushReadyResolvers(status: AuthStatus): void {
    if (!this.readyResolvers.length) return;
    this.readyResolvers.forEach(resolve => resolve(status));
    this.readyResolvers = [];
  }

  private removeReadyResolver(target: (status: AuthStatus) => void) {
    this.readyResolvers = this.readyResolvers.filter(resolver => resolver !== target);
  }
}

export const authBridge = AuthBridge.getInstance();