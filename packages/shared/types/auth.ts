export interface AuthEvents {
  'auth:login': {
    token: string;
    refreshToken?: string;
  };
  'auth:logout': undefined;
  'auth:token-expired': undefined;
  'auth:require-login': {
    redirectUrl?: string;
  };
  'auth:session-revoked': {
    sessionId?: string;
  };
  'auth:login-failed': {
    reason?: string;
  };
}

export type AuthSubscriber = (token: string | null) => void;

export interface AuthStatus {
  ready: boolean;
  token: string | null;
}