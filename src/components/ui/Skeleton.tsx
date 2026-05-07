export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-stone-200/80 ${className}`}
      aria-hidden
    />
  );
}
