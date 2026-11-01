import { setItemStatus } from "@/app/actions";
import { RELEVANCE_LABEL, STATUS_LABEL } from "@/lib/labels";
import { formatStamp } from "@/lib/format";
import type { Item, ItemStatus } from "@/lib/types";

const ACTIONS: { status: ItemStatus; label: string }[] = [
  { status: "interesting", label: "Interesante" },
  { status: "follow", label: "Seguir" },
  { status: "discarded", label: "Descartar" },
];

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
  const relevance = item.relevance ?? 0;
  return (
    <article className="rounded-2xl border border-line bg-paper-2 p-4 shadow-[0_1px_0_rgba(28,25,21,0.04)]">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-2 py-1">
          <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1.5 w-3 rounded-full ${step <= relevance ? "bg-pine" : "bg-line"}`}
              />
            ))}
          </span>
          <span>
            {item.relevance === null ? "Sin clasificar" : `${RELEVANCE_LABEL[item.relevance]} ${relevance}/3`}
          </span>
        </span>
        <span className="rounded-full bg-paper px-2 py-1">{topicName}</span>
        <span>{sourceName}</span>
        <time dateTime={item.publishedAt}>{formatStamp(item.publishedAt)}</time>
        <span className="rounded-full border border-line px-2 py-1 text-ink">{STATUS_LABEL[item.status]}</span>
      </div>
      <h3 className="mt-3 font-serif text-xl leading-snug">
        <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-pine-deep">
          {item.title}
        </a>
      </h3>
      <p className="mt-2 text-sm text-muted">{item.summary}</p>
      {item.relevanceReason ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">Lectura · </span>
          {item.relevanceReason}
        </p>
      ) : null}
      {mates.length > 0 ? (
        <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Misma historia en {mates.length + 1} medios</p>
          <ul className="mt-1 space-y-1">
            {mates.map((mate) => (
              <li key={mate.url}>
                <a href={mate.url} target="_blank" rel="noreferrer" className="hover:text-pine-deep">
                  {mate.sourceName}: {mate.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form action={setItemStatus} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={item.id} />
        {ACTIONS.map((action) => (
          <button
            key={action.status}
            type="submit"
            name="status"
            value={action.status}
            aria-pressed={item.status === action.status}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              item.status === action.status
                ? "border-pine bg-pine text-paper-2"
                : "border-line bg-paper hover:border-pine"
            }`}
          >
            {action.label}
          </button>
        ))}
        {item.status !== "pending" ? (
          <button
            type="submit"
            name="status"
            value="pending"
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Deshacer
          </button>
        ) : null}
      </form>
    </article>
  );
}
