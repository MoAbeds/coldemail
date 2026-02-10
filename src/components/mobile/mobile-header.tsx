"use client";

import { Search } from "lucide-react";
import { Mail } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
  /** Optional left action (e.g. back button) */
  leftAction?: React.ReactNode;
  /** Optional right action */
  rightAction?: React.ReactNode;
}

/**
 * Mobile-optimized top header bar.
 * Shown only on small screens (sm:hidden in the layout).
 */
export function MobileHeader({ title, leftAction, rightAction }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 sm:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2 min-w-0">
          {leftAction || (
            <div className="flex items-center gap-1.5">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">ColdClaude</span>
            </div>
          )}
        </div>

        {title && (
          <h1 className="text-sm font-semibold text-white absolute left-1/2 -translate-x-1/2 truncate max-w-[60%]">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-1">
          {rightAction || (
            <button
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true })
                );
              }}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
