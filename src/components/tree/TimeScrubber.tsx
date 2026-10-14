"use client";

import React, { useEffect, useCallback } from "react";

export interface TimeScrubberProps {
  currentMonth: number; // 0 to 60
  onMonthChange: (month: number) => void;
  maxMonth?: number; // default: 60
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  playbackSpeed?: number; // 1, 2, 4
  onSpeedChange?: (speed: number) => void;
  className?: string;
}

export const YEAR_MARKERS = [
  { month: 0, label: "Today" },
  { month: 12, label: "Yr 1" },
  { month: 24, label: "Yr 2" },
  { month: 36, label: "Yr 3" },
  { month: 48, label: "Yr 4" },
  { month: 60, label: "Yr 5" },
];

/**
 * Clamps month value between 0 and maxMonth.
 */
export function clampMonth(month: number, maxMonth: number = 60): number {
  if (Number.isNaN(month) || !Number.isFinite(month)) return 0;
  return Math.max(0, Math.min(maxMonth, Math.round(month)));
}

/**
 * Converts a month (0-60) into quarter index (0-20).
 */
export function monthToQuarter(month: number): number {
  return Math.min(20, Math.floor(clampMonth(month) / 3));
}

/**
 * Formats month into human-readable timeline notation.
 */
export function formatMonthLabel(month: number): string {
  const bounded = clampMonth(month);
  if (bounded === 0) return "Today (Month 0)";
  const yr = Math.floor(bounded / 12);
  const q = Math.ceil(bounded / 3);
  const remMonths = bounded % 12;

  if (remMonths === 0) {
    return `Year ${yr} (Month ${bounded} • Q${q})`;
  }
  return `Year ${yr} +${remMonths}mo (Month ${bounded} • Q${q})`;
}

export function TimeScrubber({
  currentMonth,
  onMonthChange,
  maxMonth = 60,
  isPlaying = false,
  onTogglePlay,
  playbackSpeed = 1,
  onSpeedChange,
  className = "",
}: TimeScrubberProps) {
  const boundedMonth = clampMonth(currentMonth, maxMonth);
  const quarterIndex = monthToQuarter(boundedMonth);

  // Playback timer ticker when isPlaying is true
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(100, Math.round(600 / playbackSpeed));
    const timer = setInterval(() => {
      onMonthChange(boundedMonth >= maxMonth ? 0 : boundedMonth + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, boundedMonth, maxMonth, playbackSpeed, onMonthChange]);

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onMonthChange(clampMonth(boundedMonth - (e.shiftKey ? 3 : 1), maxMonth));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onMonthChange(clampMonth(boundedMonth + (e.shiftKey ? 3 : 1), maxMonth));
      } else if (e.key === "Home") {
        e.preventDefault();
        onMonthChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onMonthChange(maxMonth);
      } else if (e.key === " " && onTogglePlay) {
        e.preventDefault();
        onTogglePlay();
      }
    },
    [boundedMonth, maxMonth, onMonthChange, onTogglePlay]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMonthChange(clampMonth(Number(e.target.value), maxMonth));
  };

  const stepQuarterBack = () => {
    onMonthChange(clampMonth(boundedMonth - 3, maxMonth));
  };

  const stepQuarterForward = () => {
    onMonthChange(clampMonth(boundedMonth + 3, maxMonth));
  };

  const cycleSpeed = () => {
    if (!onSpeedChange) return;
    const nextSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1;
    onSpeedChange(nextSpeed);
  };

  const progressPercentage = (boundedMonth / maxMonth) * 100;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="time-scrubber"
      aria-label="Multiverse Time Horizon Scrubber"
      className={`flex flex-col gap-2.5 w-full max-w-5xl mx-auto select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/50 rounded-lg p-2 ${className}`}
    >
      {/* Top Header: Controls & Time Readout */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Playback & Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={stepQuarterBack}
            data-testid="scrubber-step-back"
            aria-label="Step back 1 quarter"
            className="px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-xs font-semibold transition-colors"
          >
            ◀ -3mo
          </button>

          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              data-testid="scrubber-play-toggle"
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                isPlaying
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <span>{isPlaying ? "❚❚ PAUSE" : "▶ PLAY"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={stepQuarterForward}
            data-testid="scrubber-step-forward"
            aria-label="Step forward 1 quarter"
            className="px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-xs font-semibold transition-colors"
          >
            +3mo ▶
          </button>

          {onSpeedChange && (
            <button
              type="button"
              onClick={cycleSpeed}
              data-testid="scrubber-speed-toggle"
              aria-label={`Playback speed ${playbackSpeed}x`}
              className="ml-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 text-[11px] font-semibold font-tabular transition-colors"
            >
              {playbackSpeed}x
            </button>
          )}
        </div>

        {/* Informative Time Readout */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Timeline Head
          </span>
          <span
            data-testid="scrubber-time-readout"
            className="text-xs font-bold font-tabular text-zinc-100 px-2.5 py-0.5 rounded bg-zinc-850 border border-zinc-750"
          >
            {formatMonthLabel(boundedMonth)}
          </span>
          <span className="text-[11px] text-zinc-400 font-tabular font-medium">
            (Q{quarterIndex} / 20)
          </span>
        </div>
      </div>

      {/* Main Track Slider */}
      <div className="relative w-full flex flex-col justify-center py-1">
        {/* Progress Fill Underlay */}
        <div className="absolute left-0 right-0 h-1.5 bg-zinc-800 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-sky-500 transition-all duration-75"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Range Input Slider */}
        <input
          type="range"
          min={0}
          max={maxMonth}
          step={1}
          value={boundedMonth}
          onChange={handleSliderChange}
          data-testid="scrubber-slider-input"
          aria-label="Simulation month slider"
          aria-valuemin={0}
          aria-valuemax={maxMonth}
          aria-valuenow={boundedMonth}
          className="relative z-10 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-sky-400 focus:outline-none"
        />
      </div>

      {/* Year Scale Markers */}
      <div className="flex justify-between items-center text-[10px] font-semibold tracking-wider uppercase text-zinc-400 px-0.5">
        {YEAR_MARKERS.map((marker) => {
          const isReached = boundedMonth >= marker.month;
          return (
            <button
              key={marker.month}
              type="button"
              onClick={() => onMonthChange(marker.month)}
              className={`transition-colors hover:text-zinc-200 ${
                isReached ? "text-zinc-300 font-bold" : "text-zinc-400"
              }`}
            >
              {marker.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
