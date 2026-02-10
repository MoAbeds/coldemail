export default function LeadsLoading() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <div className="w-80 border-r border-zinc-800 p-4 animate-pulse space-y-3">
        <div className="h-8 w-24 bg-zinc-800 rounded" />
        <div className="h-10 bg-zinc-800/50 rounded-lg" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 bg-zinc-800/50 rounded-lg" />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading leads...</div>
      </div>
    </div>
  );
}
