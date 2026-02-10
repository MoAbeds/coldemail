import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-zinc-600">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
