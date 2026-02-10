export default function SettingsLoading() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-zinc-800 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
