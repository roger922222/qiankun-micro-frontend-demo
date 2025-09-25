/// <reference types="vite/client" />

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
    qiankunProps?: any;
    legacyQiankun?: any;
  }
}
declare var __webpack_public_path__: string | undefined;
declare var __webpack_public_path__: string;

export {};