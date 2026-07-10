/**
 * Runtime configuration.
 *
 * Values are read from Expo public env vars (prefixed with EXPO_PUBLIC_) which
 * are inlined at build time. Copy `.env.example` to `.env` and fill these in.
 *
 * The app is designed to run in a self-contained "demo mode" when Supabase / the
 * AI backend are not configured, so you can explore the UI immediately and wire
 * up the backend later.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const aiApiBaseUrl = process.env.EXPO_PUBLIC_AI_API_URL ?? '';

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  aiApiBaseUrl,
  /** True when a real Supabase project is configured. */
  hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
  /** True when the Python AI backend is configured. */
  hasAiBackend: Boolean(aiApiBaseUrl),
  /** When true the app uses local mock data instead of network calls. */
  get isDemoMode(): boolean {
    return !this.hasSupabase;
  },
} as const;
