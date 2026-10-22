"use client";

import React, { useEffect } from "react";
import { StorySceneState } from "@/lib/theater/sceneState";

interface StoryFocusBarProps {
  stories: Record<string, StorySceneState>;
  focusedStoryId: string | null;
  onFocusChange: (storyId: string | null) => void;
  className?: string;
}

const STATUS_PILLS: Record<string, { bg: string; text: string; dot: string }> = {
  thriving: { bg: "bg-emerald-950/70", text: "text-emerald-300", dot: "bg-emerald-400" },
  plateau: { bg: "bg-amber-950/70", text: "text-amber-300", dot: "bg-amber-400" },
  struggling: { bg: "bg-rose-950/70", text: "text-rose-300", dot: "bg-rose-400" },
  burnout: { bg: "bg-slate-800/80", text: "text-slate-300", dot: "bg-slate-400" },
};

export function StoryFocusBar({
  stories,
  focusedStoryId,
  onFocusChange,
  className = "",
}: StoryFocusBarProps) {
  // Listen for Esc key to return to overview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusedStoryId) {
        onFocusChange(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedStoryId, onFocusChange]);

  const storyKeys = ["S1", "S2", "S3", "S4"] as const;

  return (
    <div
      role="toolbar"
      aria-label="Story room camera focus selector"
      className={`flex items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl shadow-lg overflow-x-auto no-scrollbar ${className}`}
      data-testid="story-focus-bar"
    >
      {/* Overview Button */}
      <button
        type="button"
        onClick={() => onFocusChange(null)}
        aria-pressed={focusedStoryId === null}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
          focusedStoryId === null
            ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        <span>Overview</span>
        <kbd className="hidden sm:inline-block text-[10px] bg-slate-950 text-slate-500 px-1 py-0.2 rounded border border-slate-800">
          Esc
        </kbd>
      </button>

      <div className="h-4 w-px bg-slate-800" />

      {/* Story Focus Buttons */}
      {storyKeys.map((sId) => {
        const story = stories[sId];
        const isFocused = focusedStoryId === sId;
        const statusPill = story ? STATUS_PILLS[story.status] || STATUS_PILLS.plateau : null;

        return (
          <button
            key={sId}
            type="button"
            onClick={() => onFocusChange(isFocused ? null : sId)}
            aria-pressed={isFocused}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer border ${
              isFocused
                ? "bg-slate-800 border-cyan-500/50 text-slate-100 shadow-sm"
                : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-slate-100"
            }`}
          >
            <span className="font-bold text-[11px] text-cyan-400">{sId}</span>

            {story ? (
              <span className="text-[11px] text-slate-400">
                {story.label || `Path ${story.branchOption}`}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Loading...</span>
            )}

            {story && statusPill && (
              <span
                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusPill.bg} ${statusPill.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusPill.dot}`} />
                <span className="capitalize">{story.status}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
