import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { GlobalSearch } from "@/components/search/global-search";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { MobileHeader } from "@/components/mobile/mobile-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — hidden on desktop */}
        <MobileHeader />

        <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />

      <GlobalSearch />
    </div>
  );
}
