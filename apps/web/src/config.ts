/** Runtime configuration, read once from Vite's build-time environment. */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
} as const;
