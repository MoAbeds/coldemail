export default function EmailAccountsLoading() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-44 bg-zinc-800 rounded" />
          <div className="h-9 w-36 bg-zinc-800 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
