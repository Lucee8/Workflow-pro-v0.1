/// <reference types="vite/client" />

// Allow importing static assets (png/jpg/svg/etc.) without TS errors.
// Vite normally provides these types via `vite/client`, but we keep this
// file to ensure consistent type resolution across environments.
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

