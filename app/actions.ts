"use server";

import { revalidatePath } from "next/cache";

import { saveItemStatus, saveSource } from "@/lib/data/repository";
import { detectKind, validateFeed } from "@/lib/feeds/validate";
import { isItemStatus } from "@/lib/domain";
import type { ActionState } from "@/lib/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/fuentes");
  revalidatePath("/informe");
}

export async function setItemStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isItemStatus(status)) return;
  await saveItemStatus(id, status);
  refresh();
}

export async function addSource(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { tone: "error", message: "El nombre debe tener entre 2 y 80 caracteres." };
  }
  if (url.length > 2000) {
    return { tone: "error", message: "La URL es demasiado larga." };
  }
  const validation = await validateFeed(url);
  if (!validation.ok) return { tone: "error", message: validation.error };
  try {
    await saveSource({ name, feedUrl: validation.url, kind: detectKind(validation.url) });
  } catch (error) {
    return {
      tone: "error",
      message: error instanceof Error ? error.message : "No se pudo guardar la fuente.",
    };
  }
  refresh();
  return {
    tone: "ok",
    message: `Feed válido, ${validation.entries} ${validation.entries === 1 ? "entrada" : "entradas"}. La fuente quedó en el sector. La ingesta diaria traerá las noticias nuevas.`,
  };
}
