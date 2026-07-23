export default function LoadingGrowthAgentPage() {
  return (
    <main className="space-y-5 pb-10" aria-label="Loading Setu Guru Growth Center">
      <div className="h-44 animate-pulse rounded-hero bg-surface-2" />
      <div className="h-40 animate-pulse rounded-panel bg-surface-2" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-52 animate-pulse rounded-panel bg-surface-2" />
        ))}
      </div>
    </main>
  );
}
