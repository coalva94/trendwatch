import { cookies } from "next/headers";

import { parseOverlay, type DemoOverlay } from "@/lib/demo/overlay";

const COOKIE = "trendwatch_demo_v1";

export async function readDemoOverlay(): Promise<DemoOverlay> {
  const jar = await cookies();
  return parseOverlay(jar.get(COOKIE)?.value);
}

export async function writeDemoOverlay(overlay: DemoOverlay): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(overlay), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
