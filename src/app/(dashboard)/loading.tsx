export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-zinc-800/50 rounded-xl" />
      </div>
    </div>
  );
}
