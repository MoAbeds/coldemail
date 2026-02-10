"use client";

import { useState } from "react";
import {
  ChevronDown,
  Filter,
  X,
  Bookmark,
  Loader2,
} from "lucide-react";

/* ---------- types ---------- */

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multi-select" | "date-range" | "toggle";
  options?: FilterOption[];
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (key: string, value: string | null) => void;
  onClearAll: () => void;
  // Saved filters
  savedFilters?: Array<{ id: string; name: string; filters: Record<string, string> }>;
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filters: Record<string, string>) => void;
  onDeleteFilter?: (id: string) => void;
  // Search
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  // Sort
  sortOptions?: FilterOption[];
  sort?: string;
  onSortChange?: (sort: string) => void;
}

/* ---------- FilterBar ---------- */

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  search,
  onSearchChange,
  searchPlaceholder,
  sortOptions,
  sort,
  onSortChange,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showSavedFilters, setShowSavedFilters] = useState(false);

  return (
    <div className="space-y-3">
      {/* Top row: search + filters + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder || "Search..."}
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background px-3 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter dropdowns */}
        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
                activeFilters.some((f) => f.key === filter.key)
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {filter.label}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {openDropdown === filter.key && filter.options && (
              <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border bg-card py-1 shadow-lg">
                {filter.type === "date-range" ? (
                  <DateRangeDropdown
                    onSelect={(from, to) => {
                      onFilterChange(`${filter.key}_from`, from);
                      onFilterChange(`${filter.key}_to`, to);
                      setOpenDropdown(null);
                    }}
                  />
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onFilterChange(filter.key, null);
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                    >
                      All
                    </button>
                    {filter.options.map((option) => {
                      const isActive = activeFilters.some(
                        (f) => f.key === filter.key && f.value === option.value
                      );
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            onFilterChange(filter.key, isActive ? null : option.value);
                            if (filter.type !== "multi-select") setOpenDropdown(null);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted ${
                            isActive ? "text-primary font-medium" : ""
                          }`}
                        >
                          {filter.type === "multi-select" && (
                            <input
                              type="checkbox"
                              checked={isActive}
                              readOnly
                              className="rounded"
                            />
                          )}
                          {option.label}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Sort dropdown */}
        {sortOptions && onSortChange && (
          <div className="relative ml-auto">
            <button
              onClick={() => setOpenDropdown(openDropdown === "__sort" ? null : "__sort")}
              className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"
            >
              Sort: {sortOptions.find((s) => s.value === sort)?.label || "Default"}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openDropdown === "__sort" && (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border bg-card py-1 shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${
                      sort === option.value ? "text-primary font-medium" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved filters */}
        {onSaveFilter && (
          <div className="relative">
            <button
              onClick={() => setShowSavedFilters(!showSavedFilters)}
              className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </button>
            {showSavedFilters && (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border bg-card py-1 shadow-lg">
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
                  Saved Filters
                </p>
                {savedFilters?.map((sf) => (
                  <div key={sf.id} className="flex items-center gap-1 px-2">
                    <button
                      onClick={() => {
                        onLoadFilter?.(sf.filters);
                        setShowSavedFilters(false);
                      }}
                      className="flex-1 px-1 py-1.5 text-left text-sm hover:text-primary"
                    >
                      {sf.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter?.(sf.id)}
                      className="rounded p-1 text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(!savedFilters || savedFilters.length === 0) && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No saved filters</p>
                )}
                <div className="border-t mt-1 pt-1">
                  {showSaveDialog ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        placeholder="Filter name"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && filterName) {
                            onSaveFilter(filterName);
                            setFilterName("");
                            setShowSaveDialog(false);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (filterName) {
                            onSaveFilter(filterName);
                            setFilterName("");
                            setShowSaveDialog(false);
                          }
                        }}
                        className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full px-3 py-1.5 text-left text-xs text-primary hover:bg-muted"
                    >
                      + Save current filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active filters pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Active:</span>
          {activeFilters.map((f) => (
            <button
              key={`${f.key}-${f.value}`}
              onClick={() => onFilterChange(f.key, null)}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {f.label}: {f.displayValue}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- DateRangeDropdown ---------- */

function DateRangeDropdown({
  onSelect,
}: {
  onSelect: (from: string, to: string) => void;
}) {
  const presets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  return (
    <div className="space-y-1 p-1">
      {presets.map((p) => (
        <button
          key={p.days}
          onClick={() => {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - p.days);
            onSelect(from.toISOString(), to.toISOString());
          }}
          className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
        >
          {p.label}
        </button>
      ))}
      <div className="border-t pt-1">
        <p className="px-2 py-1 text-xs text-muted-foreground">Custom range</p>
        <div className="flex gap-1 px-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 rounded border px-1.5 py-1 text-xs"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 rounded border px-1.5 py-1 text-xs"
          />
        </div>
        <button
          onClick={() => {
            if (customFrom && customTo) {
              onSelect(
                new Date(customFrom).toISOString(),
                new Date(customTo).toISOString()
              );
            }
          }}
          disabled={!customFrom || !customTo}
          className="mt-1 w-full rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/* ---------- BulkActionBar ---------- */

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  actions,
  loading,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
  loading?: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedCount === totalCount}
          onChange={() => (selectedCount === totalCount ? onClearSelection() : onSelectAll())}
          className="rounded"
        />
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <button onClick={onClearSelection} className="text-xs text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              action.variant === "destructive"
                ? "text-red-600 hover:bg-red-50"
                : "hover:bg-muted"
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pagination ---------- */

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-muted-foreground">
        {total} result{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          let pageNum: number;
          if (pages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= pages - 2) {
            pageNum = pages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                page === pageNum
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
        >
          Next
        </button>
      </div>
    </div>
  );
}
