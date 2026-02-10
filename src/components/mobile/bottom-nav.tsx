"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Target,
  BarChart3,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Sheet } from "./sheet";
import { signOut } from "next-auth/react";
import {
  Users,
  Mail,
  Settings,
  LogOut,
  Search,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainTabs = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Analytics", href: "/dashboard", icon: BarChart3 },
  { name: "More", href: "#more", icon: Menu },
];

const moreLinks = [
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Email Accounts", href: "/email-accounts", icon: Mail },
  { name: "Integrations", href: "/settings/integrations", icon: Settings },
  { name: "Audit Log", href: "/settings/audit-log", icon: Shield },
  { name: "Search", href: "#search", icon: Search },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 safe-area-bottom sm:hidden">
        <div className="flex items-center justify-around h-16">
          {mainTabs.map((tab) => {
            if (tab.href === "#more") {
              return (
                <button
                  key={tab.name}
                  onClick={() => setShowMore(true)}
                  className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-zinc-500"
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px]">{tab.name}</span>
                </button>
              );
            }
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px]",
                  active ? "text-primary" : "text-zinc-500"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px]">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={showMore} onClose={() => setShowMore(false)} title="More">
        <div className="space-y-1">
          {moreLinks.map((link) => {
            if (link.href === "#search") {
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    setShowMore(false);
                    setTimeout(() => {
                      window.dispatchEvent(
                        new KeyboardEvent("keydown", { key: "k", metaKey: true })
                      );
                    }, 200);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 min-h-[44px]"
                >
                  <link.icon className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm">{link.name}</span>
                </button>
              );
            }
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg min-h-[44px]",
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <link.icon className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
          <div className="border-t border-zinc-800 my-2" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-400 hover:bg-zinc-800 min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
