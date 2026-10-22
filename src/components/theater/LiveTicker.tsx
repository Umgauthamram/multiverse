"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TickerItem } from "@/lib/theater/sceneState";

export type TickerFilter = "all" | "S1" | "S2" | "S3" | "S4" | "agents";

interface LiveTickerProps {
  ticker: TickerItem[];
  focusedStoryId?: string | null;
  onFocusStory?: (storyId: string | null) => void;
  className?: string;
}

const STORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S1: { bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-800/40" },
  S2: { bg: "bg-amber-950/60", text: "text-amber-400", border: "border-amber-800/40" },
  S3: { bg: "bg-cyan-950/60", text: "text-cyan-400", border: "border-cyan-800/40" },
  S4: { bg: "bg-rose-950/60", text: "text-rose-400", border: "border-rose-800/40" },
  agents: { bg: "bg-slate-850/60", text: "text-slate-300", border: "border-slate-700/40" },
};

const ANNOUNCED_VERBS = new Set(["ROLL", "STATUS", "END", "REROUTE", "FINISH"]);

export function LiveTicker({
  ticker,
  focusedStoryId,
  onFocusStory,
  className = "",
}: LiveTickerProps) {
  const [userFilter, setUserFilter] = useState<TickerFilter | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Active filter derives from explicit user selection or focused story
  const filter: TickerFilter =
    userFilter ??
    (focusedStoryId && ["S1", "S2", "S3", "S4"].includes(focusedStoryId)
      ? (focusedStoryId as TickerFilter)
      : "all");

  // Screen reader polite announcements for critical milestones (Section 8.5)
  const politeAnnouncement = useMemo(() => {
    for (let i = ticker.length - 1; i >= 0; i--) {
      if (ANNOUNCED_VERBS.has(ticker[i].verb)) {
        return ticker[i].text;
      }
    }
    return "";
  }, [ticker]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (filter === "all") return ticker;
    if (filter === "agents") {
      return ticker.filter((item) => item.scope === "@*" || !item.storyId);
    }
    return ticker.filter((item) => item.storyId === filter);
  }, [ticker, filter]);

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!userScrolled && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredItems, userScrolled]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!isAtBottom);
  };

  const resumeAutoScroll = () => {
    setUserScrolled(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  return (
    <div
      className={`flex flex-col bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl ${className}`}
      data-testid="live-ticker"
    >
      {/* Header & Filter Tabs */}
      <div className="flex flex-col gap-2 p-3 border-b border-slate-800/70 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live Ticker
            </h3>
            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">
              {`${filteredItems.length} events`}
            </span>
          </div>

          {userScrolled && (
            <button
              onClick={resumeAutoScroll}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/50 px-2 py-0.5 rounded transition"
            >
              Resume scroll ↓
            </button>
          )}
        </div>

        {/* Filter Tab Bar */}
        <div
          role="tablist"
          aria-label="Filter ticker events by story or agent office"
          className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "S1", label: "S1: Bold" },
              { id: "S2", label: "S2: Anxious" },
              { id: "S3", label: "S3: Balanced" },
              { id: "S4", label: "S4: Workaholic" },
              { id: "agents", label: "Agents" },
            ] as const
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="ticker-entries-list"
                onClick={() => {
                  setUserFilter(tab.id);
                  if (tab.id.startsWith("S") && onFocusStory) {
                    onFocusStory(tab.id);
                  } else if (tab.id === "all" || tab.id === "agents") {
                    onFocusStory?.(null);
                  }
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticker Feed */}
      <div
        id="ticker-entries-list"
        role="region"
        aria-label="Simulation event log"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[12px] leading-relaxed scroll-smooth"
      >
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center text-xs">
            <p>Awaiting simulation events...</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Events will stream as quarters simulate.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isStory = item.storyId && STORY_COLORS[item.storyId];
            const color = isStory
              ? STORY_COLORS[item.storyId!]
              : STORY_COLORS.agents;

            return (
              <div
                key={item.id}
                className="flex items-start gap-2 group hover:bg-slate-900/40 p-1.5 rounded transition"
              >
                {/* Scope / Story Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (item.storyId && onFocusStory) {
                      onFocusStory(item.storyId);
                      setUserFilter(item.storyId as TickerFilter);
                    }
                  }}
                  title={item.storyId ? `Focus on story ${item.storyId}` : "Agent Office event"}
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border uppercase ${color.bg} ${color.text} ${color.border} hover:opacity-80 transition cursor-pointer`}
                >
                  {item.storyId || "AGENT"}
                </button>

                {/* Event Text */}
                <div className="flex-1 text-slate-300 break-words font-sans text-xs">
                  <span className="font-mono text-slate-400">{item.text}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Polite Accessibility Live Region (Section 8.5) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="ticker-aria-live"
      >
        {politeAnnouncement}
      </div>
    </div>
  );
}
