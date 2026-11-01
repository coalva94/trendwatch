import type { LucideIcon } from "lucide-react";

import { panelClass } from "@/components/styles";

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${panelClass} border-dashed px-5 py-10 text-center`}>
      <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted-bg text-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">{children}</p>
    </div>
  );
}
