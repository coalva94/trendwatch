import { Bookmark, ExternalLink, Layers, Star, Undo2, X } from "lucide-react";

import { setItemStatus } from "@/app/actions";
import { panelClass, quietButtonClass } from "@/components/styles";
import { formatStamp } from "@/lib/format";
import { RELEVANCE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { Item, ItemStatus, Relevance } from "@/lib/types";

const ACTIONS: { status: ItemStatus; label: string; icon: typeof Star }[] = [
  { status: "interesting", label: "Interesante", icon: Star },
  { status: "follow", label: "Seguir", icon: Bookmark },
  { status: "discarded", label: "Descartar", icon: X },
];

const RELEVANCE_TONE: Record<Relevance, string> = {
  0: "border-line bg-muted-bg text-muted",
  1: "border-transparent bg-warn-soft text-warn",
  2: "border-transparent bg-good-soft text-good",
  3: "border-transparent bg-accent-soft text-accent",
};

const STATUS_TONE: Record<ItemStatus, string> = {
  pending: "bg-muted-bg text-muted",
  interesting: "bg-accent-soft text-accent",
  follow: "bg-good-soft text-good",
  discarded: "bg-bad-soft text-bad",
};

export function ItemCard({
  item,
  topicName,
  sourceName,
  mates,
}: {
  item: Item;
  topicName: string;
  sourceName: string;
  mates: { title: string; sourceName: string; url: string }[];
}) {
  const relevance = item.relevance;
  return (
    <article className={`${panelClass} p-4 lift`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-medium ${
            relevance === null ? "border-line bg-muted-bg text-muted" : RELEVANCE_TONE[relevance]
          }`}
        >
          {relevance === null ? "Sin clasificar" : RELEVANCE_LABEL[relevance]}
          {relevance === null ? null : <span className="font-mono text-[10px] opacity-80">{relevance}/3</span>}
        </span>
        <span className="rounded-full bg-muted-bg px-2 py-1 font-medium text-ink">{topicName}</span>
        <span className="text-muted">{sourceName}</span>
        <time className="text-muted" dateTime={item.publishedAt}>
          {formatStamp(item.publishedAt)}
        </time>
        <span className={`ml-auto rounded-full px-2 py-1 font-medium ${STATUS_TONE[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight sm:text-lg">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-start gap-1.5 hover:text-accent"
        >
          <span>{item.title}</span>
          <ExternalLink className="mt-1 size-3.5 shrink-0 text-faint" aria-hidden="true" />
        </a>
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{item.summary}</p>
      {item.relevanceReason ? (
        <p className="mt-3 rounded-xl bg-muted-bg px-3 py-2 text-sm leading-6 text-ink">
          <span className="font-medium text-muted">Lectura · </span>
          {item.relevanceReason}
        </p>
      ) : null}
      {mates.length > 0 ? (
        <div className="mt-3 rounded-xl border border-line px-3 py-2 text-sm">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted">
            <Layers className="size-3.5" aria-hidden="true" />
            Misma historia en {mates.length + 1} medios
          </p>
          <ul className="mt-2 space-y-1.5">
            {mates.map((mate) => (
              <li key={mate.url}>
                <a href={mate.url} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">
                  <span className="font-medium">{mate.sourceName}</span>
                  <span className="text-muted"> · {mate.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form action={setItemStatus} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={item.id} />
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const pressed = item.status === action.status;
          return (
            <button
              key={action.status}
              type="submit"
              name="status"
              value={action.status}
              aria-pressed={pressed}
              className={`${quietButtonClass} ${pressed ? "border-accent bg-accent-soft text-ink" : ""}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
        {item.status !== "pending" ? (
          <button type="submit" name="status" value="pending" className={quietButtonClass}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            Deshacer
          </button>
        ) : null}
      </form>
    </article>
  );
}
