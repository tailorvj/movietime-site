/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_VIMEO_VIDEO_ID?: string
  readonly PUBLIC_CONTACT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
