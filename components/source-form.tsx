"use client";

import { useActionState } from "react";

import { addSource } from "@/app/actions";
import { fieldClass, panelClass, solidButtonClass } from "@/components/styles";
import type { ActionState } from "@/lib/types";

const initial: ActionState = { message: "", tone: "idle" };

export function SourceForm() {
  const [state, action, pending] = useActionState(addSource, initial);
  return (
    <form action={action} className={`${panelClass} h-fit p-4`}>
      <h2 className="text-base font-semibold tracking-tight">Añadir un feed</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        El servidor comprueba el esquema, resuelve el host y rechaza direcciones privadas antes de leer el XML.
      </p>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-muted">Nombre</span>
        <input name="name" required maxLength={80} className={fieldClass} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-muted">URL del feed</span>
        <input
          name="url"
          type="url"
          required
          placeholder="https://ejemplo.com/feed/"
          className={fieldClass}
        />
      </label>
      <button type="submit" disabled={pending} className={`${solidButtonClass} mt-4`}>
        {pending ? "Comprobando…" : "Validar y añadir"}
      </button>
      {state.message ? (
        <p role="status" className={`mt-3 text-sm leading-6 ${state.tone === "error" ? "text-bad" : "text-good"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
