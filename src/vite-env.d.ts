/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TENANT_BASE_DOMAIN?: string;
  readonly VITE_PLATFORM_BASE_DOMAIN?: string;
  readonly PLATFORM_BASE_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
