export type AppConfig = {
  demoMode: boolean;
  sectorSlug: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

const PLACEHOLDER_HOSTS = new Set(["example.supabase.co", "your-project.supabase.co"]);

function flag(value: string | undefined): "on" | "off" | "auto" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return "on";
  if (normalized === "false" || normalized === "0") return "off";
  return "auto";
}

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const supabaseUrl = env.TRENDWATCH_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.TRENDWATCH_SUPABASE_ANON_KEY?.trim() ?? "";
  const serviceRoleKey = env.TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const sectorSlug = env.TRENDWATCH_SECTOR_SLUG?.trim() || "renewable-energy";
  const mode = flag(env.TRENDWATCH_DEMO_MODE);
  let demoMode = mode === "on";
  if (mode === "auto") {
    let host = "";
    try {
      host = supabaseUrl ? new URL(supabaseUrl).host : "";
    } catch {
      host = "";
    }
    const configured = Boolean(supabaseUrl && anonKey && host && !PLACEHOLDER_HOSTS.has(host));
    demoMode = !configured;
  }
  return { demoMode, sectorSlug, supabaseUrl, anonKey, serviceRoleKey };
}
