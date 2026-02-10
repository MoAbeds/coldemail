"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  Search,
  Send,
  Users,
  Target,
  FileText,
  User,
  Loader2,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";

/* ---------- types ---------- */

interface SearchResults {
  campaigns?: Array<{
    id: string;
    name: string;
    status: string;
    _count: { prospects: number };
  }>;
  prospects?: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    status: string;
    campaignId: string;
    campaign: { name: string };
  }>;
  leads?: Array<{
    id: string;
    status: string;
    temperature: string;
    prospect: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      company: string | null;
    };
    campaign: { id: string; name: string };
  }>;
  templates?: Array<{
    id: string;
    name: string;
    subject: string;
    category: string | null;
  }>;
  members?: Array<{
    role: string;
    user: { id: string; name: string | null; email: string };
  }>;
}

interface SearchItem {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

const STORAGE_KEY = "coldclaude-recent-searches";

/* ---------- component ---------- */

export function GlobalSearch() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      const r: SearchResults = data.results || {};
      const items: SearchItem[] = [];

      // Campaigns
      r.campaigns?.forEach((c) =>
        items.push({
          type: "Campaign",
          id: c.id,
          title: c.name,
          subtitle: `${c.status} - ${c._count.prospects} prospects`,
          href: `/campaigns/${c.id}/analytics`,
          icon: <Send className="h-4 w-4 text-blue-500" />,
        })
      );

      // Prospects
      r.prospects?.forEach((p) =>
        items.push({
          type: "Prospect",
          id: p.id,
          title: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email,
          subtitle: `${p.email}${p.company ? ` - ${p.company}` : ""} (${p.campaign.name})`,
          href: `/prospects/${p.id}/timeline`,
          icon: <Users className="h-4 w-4 text-green-500" />,
        })
      );

      // Leads
      r.leads?.forEach((l) =>
        items.push({
          type: "Lead",
          id: l.id,
          title:
            [l.prospect.firstName, l.prospect.lastName].filter(Boolean).join(" ") ||
            l.prospect.email,
          subtitle: `${l.temperature} - ${l.status} (${l.campaign.name})`,
          href: `/leads?selected=${l.id}`,
          icon: <Target className="h-4 w-4 text-orange-500" />,
        })
      );

      // Templates
      r.templates?.forEach((t) =>
        items.push({
          type: "Template",
          id: t.id,
          title: t.name,
          subtitle: t.subject,
          href: `/settings`, // templates don't have a dedicated page yet
          icon: <FileText className="h-4 w-4 text-purple-500" />,
        })
      );

      // Members
      r.members?.forEach((m) =>
        items.push({
          type: "Team Member",
          id: m.user.id,
          title: m.user.name || m.user.email,
          subtitle: `${m.user.email} - ${m.role}`,
          href: `/settings`,
          icon: <User className="h-4 w-4 text-cyan-500" />,
        })
      );

      setResults(items);
      setSelectedIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  function saveRecentSearch(q: string) {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function navigate(item: SearchItem) {
    saveRecentSearch(query);
    setOpen(false);
    router.push(item.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  }

  if (!open) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className={`fixed inset-0 z-50 ${isMobile ? "" : "flex items-start justify-center pt-[15vh]"}`}>
      {/* Backdrop */}
      {!isMobile && (
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Modal — full-screen on mobile, centered card on desktop */}
      <div className={`relative ${
        isMobile
          ? "flex flex-col h-full bg-zinc-950"
          : "w-full max-w-xl rounded-xl border bg-card shadow-2xl"
      }`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 border-b px-4 ${isMobile ? "py-3 safe-area-top" : "py-3"}`}>
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search campaigns, prospects, leads..."
            className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <button
            onClick={() => setOpen(false)}
            className="rounded p-2 hover:bg-muted min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className={`overflow-y-auto p-2 ${isMobile ? "flex-1" : "max-h-[400px]"}`}>
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Recent Searches
              </p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </p>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-2">
              <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {type}s
              </p>
              {items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors min-h-[44px] ${
                      selectedIndex === idx ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer — keyboard hints on desktop only */}
        {!isMobile && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd>
              <span>Navigate</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↵</kbd>
              <span>Select</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
