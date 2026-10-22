"use client";

import React from "react";
import { StorySceneState } from "@/lib/theater/sceneState";

export interface LifeCardStoryData {
  storyId: string;
  branchOption: "A" | "B";
  branchName: string;
  branchLocation: string;
  personaSeed: string;
  finalSavings: number;
  finalStats: {
    happiness: number;
    health: number;
    relationships: number;
    career: number;
  };
  status: "thriving" | "plateau" | "struggling" | "burnout";
  lastDiaryEntry?: string | null;
  completedQuarters?: number;
  totalQuarters?: number;
  isPartial?: boolean;
}

export interface LifeCardsProps {
  stories: Record<string, StorySceneState> | LifeCardStoryData[];
  onOpenTimeline?: (storyId: string) => void;
  onCompareAll?: () => void;
  onReplayTheater?: () => void;
  className?: string;
}

/**
 * Normalizes input stories into an array of LifeCardStoryData.
 */
function normalizeStories(
  input: Record<string, StorySceneState> | LifeCardStoryData[]
): LifeCardStoryData[] {
  if (Array.isArray(input)) {
    return input;
  }

  return Object.entries(input).map(([storyId, story]) => {
    const isPartial = !story.finished && story.quarter < 20;
    return {
      storyId,
      branchOption: story.branchOption,
      branchName: story.label || `Story ${storyId}`,
      branchLocation: story.location || "Simulated Location",
      personaSeed: story.personaSeed,
      finalSavings: story.currentSavings,
      finalStats: story.stats,
      status: story.status,
      lastDiaryEntry: story.lastDiary,
      completedQuarters: story.quarter,
      totalQuarters: 20,
      isPartial,
    };
  });
}

const STATUS_BADGE_STYLES = {
  thriving: {
    label: "Thriving",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  plateau: {
    label: "Plateau",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  struggling: {
    label: "Struggling",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  burnout: {
    label: "Burnout Rest",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
} as const;

export function LifeCards({
  stories,
  onOpenTimeline,
  onCompareAll,
  onReplayTheater,
  className = "",
}: LifeCardsProps) {
  const normalized = normalizeStories(stories);

  return (
    <section
      data-testid="life-cards-container"
      className={`flex flex-col gap-5 w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all duration-500 ${className}`}
      aria-label="Revealed Simulation Futures"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              Simulation Complete • 4 Parallel Lives Revealed
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Compare 5-year trajectories across divergent persona temperaments and choices.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onReplayTheater && (
            <button
              type="button"
              onClick={onReplayTheater}
              data-testid="replay-theater-btn"
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-700/80 hover:border-zinc-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>↺</span>
              <span>Replay Theater</span>
            </button>
          )}

          {onCompareAll && (
            <button
              type="button"
              onClick={onCompareAll}
              data-testid="compare-all-btn"
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-zinc-50 transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Compare All 4 Futures</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Life Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {normalized.map((card) => {
          const badge = STATUS_BADGE_STYLES[card.status] || STATUS_BADGE_STYLES.thriving;
          const formattedSavings = `$${Math.round(card.finalSavings).toLocaleString()}`;
          const isOptionA = card.branchOption === "A";

          return (
            <article
              key={card.storyId}
              data-testid={`life-card-${card.storyId}`}
              className="flex flex-col justify-between p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700 transition flex-1 gap-4"
            >
              {/* Card Top: Story Header & Badges */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                        isOptionA
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {card.storyId} • Path {card.branchOption}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {card.personaSeed}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Branch Name & Location */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">
                    {card.branchName}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {card.branchLocation}
                  </span>
                </div>

                {/* Incomplete Warning if Partial */}
                {card.isPartial && (
                  <div
                    data-testid={`partial-warning-${card.storyId}`}
                    className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400 font-medium"
                  >
                    Incomplete: {card.completedQuarters ?? 0} of {card.totalQuarters ?? 20} quarters
                  </div>
                )}

                {/* Final Net Worth Display */}
                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400">
                    Final Net Worth
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {formattedSavings}
                  </span>
                </div>

                {/* 4 Clamped Stat Bars */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* Joy / Happiness */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Joy</span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {card.finalStats.happiness}/100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, card.finalStats.happiness))}%` }}
                      />
                    </div>
                  </div>

                  {/* Health */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Health</span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {card.finalStats.health}/100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, card.finalStats.health))}%` }}
                      />
                    </div>
                  </div>

                  {/* Relationships */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Relationships</span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {card.finalStats.relationships}/100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, card.finalStats.relationships))}%` }}
                      />
                    </div>
                  </div>

                  {/* Career */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Career</span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {card.finalStats.career}/100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, card.finalStats.career))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Last Diary Excerpt */}
                {card.lastDiaryEntry && (
                  <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-850/60 text-[11px] text-zinc-400 italic line-clamp-2">
                    &ldquo;{card.lastDiaryEntry}&rdquo;
                  </div>
                )}
              </div>

              {/* Card Action: Open Timeline */}
              {onOpenTimeline && (
                <button
                  type="button"
                  onClick={() => onOpenTimeline(card.storyId)}
                  data-testid={`open-timeline-btn-${card.storyId}`}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/80 hover:border-zinc-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Timeline</span>
                  <span className="text-zinc-400">→</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
