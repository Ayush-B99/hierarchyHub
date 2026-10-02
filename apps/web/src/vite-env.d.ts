/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Defaults to /api. */
  readonly VITE_API_URL?: string;
  /** Set to "false" to turn off the mock API in development. */
  readonly VITE_API_MOCKING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
