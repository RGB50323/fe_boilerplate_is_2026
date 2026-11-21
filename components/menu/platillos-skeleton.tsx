import { Skeleton } from "@/components/ui/skeleton";

export function PlatillosSkeleton({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div role="status">
      <span className="sr-only">Cargando menú...</span>
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cantidad }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-4">
            <Skeleton className="size-56 rounded-full" />
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}