/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the fintech API. Defaults to the same-origin `/api/v1` prefix. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
