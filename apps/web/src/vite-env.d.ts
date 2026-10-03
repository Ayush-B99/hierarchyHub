/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Defaults to /api. */
  readonly VITE_API_URL?: string;
  /** Set to "true" to use the mock API in development instead of the real one. */
  readonly VITE_API_MOCKING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
