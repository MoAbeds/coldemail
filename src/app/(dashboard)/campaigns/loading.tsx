export default function CampaignsLoading() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-zinc-800 rounded" />
          <div className="h-9 w-32 bg-zinc-800 rounded-lg" />
        </div>
        <div className="h-10 bg-zinc-800/50 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
