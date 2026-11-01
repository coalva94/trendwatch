import { panelClass } from "@/components/styles";

function Bone({ className }: { className: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando</span>
      <div className="space-y-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`${panelClass} space-y-3 p-4`}>
            <Bone className="h-3 w-20" />
            <Bone className="h-8 w-16" />
            <Bone className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className={`${panelClass} space-y-3 p-4`}>
        <Bone className="h-4 w-32" />
        <Bone className="h-28 w-full" />
      </div>
    </div>
  );
}
