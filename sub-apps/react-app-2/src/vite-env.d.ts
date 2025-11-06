/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_API_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_LOG_LEVEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}