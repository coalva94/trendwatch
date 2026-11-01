"use client";

import { useActionState } from "react";

import { addSource } from "@/app/actions";
import type { ActionState } from "@/lib/types";

const initial: ActionState = { message: "", tone: "idle" };

export function SourceForm() {
  const [state, action, pending] = useActionState(addSource, initial);
  return (
    <form action={action} className="rounded-2xl border border-line bg-paper-2 p-4">
      <h2 className="font-serif text-2xl">Añadir un feed</h2>
      <p className="mt-1 text-sm text-muted">
        El servidor comprueba el esquema, resuelve el host y rechaza direcciones privadas antes de leer el XML.
      </p>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-muted">Nombre</span>
        <input name="name" required maxLength={80} className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-muted">URL del feed</span>
        <input
          name="url"
          type="url"
          required
          placeholder="https://ejemplo.com/feed/"
          className="w-full rounded-xl border border-line bg-paper px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-pine px-4 py-2 text-sm text-paper-2 disabled:opacity-60"
      >
        {pending ? "Comprobando…" : "Validar y añadir"}
      </button>
      {state.message ? (
        <p role="status" className={`mt-3 text-sm ${state.tone === "error" ? "text-clay" : "text-pine-deep"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
