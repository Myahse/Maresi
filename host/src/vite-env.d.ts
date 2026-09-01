/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  /** Absolute API base including `/api`, e.g. `https://api.example.com/api`. Defaults to `/api`. */
  readonly VITE_API_URL?: string;
  /** SockJS/STOMP endpoint, e.g. `https://api.example.com/ws`. Defaults to API origin + `/ws`. */
  readonly VITE_WS_URL?: string;
  /** Host operations app origin. */
  readonly VITE_HOST_APP_URL?: string;
  readonly VITE_CLIENT_APP_URL?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
