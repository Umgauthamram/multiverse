"use client";

import React, { useState, useEffect, useRef } from "react";
import { TheaterDirector } from "@/lib/theater/director";
import { SceneState, createInitialSceneState, INITIAL_AGENTS, AgentId } from "@/lib/theater/sceneState";
import { createMockSceneStream } from "@/lib/scene/mockSceneStream";
import { TheaterCanvas } from "./TheaterCanvas";
import { LiveTicker } from "./LiveTicker";
import { StoryFocusBar } from "./StoryFocusBar";

export interface TheaterViewProps {
  sessionId?: string;
  streamUrl?: string;
  useMock?: boolean;
  onRevealReady?: () => void;
  onSkip?: () => void;
  reducedMotion?: boolean;
  className?: string;
}

export function TheaterView({
  sessionId,
  streamUrl,
  useMock = false,
  onRevealReady,
  onSkip,
  reducedMotion = false,
  className = "",
}: TheaterViewProps) {
  const [sceneState, setSceneState] = useState<SceneState>(createInitialSceneState);
  const [focusedStoryId, setFocusedStoryId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [serverFinished, setServerFinished] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isMobileTickerOpen, setIsMobileTickerOpen] = useState(false);

  const directorRef = useRef<TheaterDirector | null>(null);

  // Initialize Director & timer
  useEffect(() => {
    const director = new TheaterDirector({
      reducedMotion,
      onStateChange: (newState) => {
        setSceneState({ ...newState });
      },
      onRevealReady: () => {
        onRevealReady?.();
      },
    });

    directorRef.current = director;

    // Tick loop at 30 Hz (33ms) for deterministic sub-beat scheduling
    const tickInterval = setInterval(() => {
      director.tick();
    }, 33);

    // Elapsed wall-clock timer for 15s Skip button gate and honesty status
    const secondTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(secondTimer);
      director.destroy();
      directorRef.current = null;
    };
  }, [reducedMotion, onRevealReady]);

  // Connect to SSE stream or mock scene stream
  useEffect(() => {
    const director = directorRef.current;
    if (!director) return;

    if (useMock || !sessionId) {
      // Offline mock stream for demo or testing
      const mockStream = createMockSceneStream({
        speed: "realistic",
        sessionId: sessionId || "demo-theater",
      });

      const unsubscribe = mockStream.subscribe((lines) => {
        director.ingestLines(lines);
      });

      return () => {
        unsubscribe();
      };
    } else {
      // Real SSE stream connection
      const url = streamUrl || `/api/simulate/stream/${sessionId}`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener("scene", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (Array.isArray(payload.lines) && payload.lines.length > 0) {
            director.ingestLines(payload.lines);
          }
        } catch (err) {
          console.warn("[TheaterView] Failed to parse scene SSE data", err);
        }
      });

      eventSource.addEventListener("done", () => {
        setServerFinished(true);
        eventSource.close();
      });

      eventSource.onerror = () => {
        // SSE error or completion
        setServerFinished(true);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [sessionId, streamUrl, useMock]);

  // Handle Skip action
  const handleSkip = () => {
    if (!directorRef.current) return;
    setIsSkipping(true);
    directorRef.current.skip();
    onSkip?.();
  };

  // Calculate current Quarter and Month
  const progressRatio = sceneState.progress.total > 0
    ? sceneState.progress.done / sceneState.progress.total
    : 0;
  const currentQuarter = Math.min(20, Math.max(1, Math.ceil(progressRatio * 20)));
  const currentMonth = currentQuarter * 3;

  return (
    <div
      className={`flex flex-col w-full h-full min-h-screen bg-slate-950 text-slate-100 font-sans select-none ${className}`}
      data-testid="theater-view"
    >
      {/* Header Strip */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-20">
        {/* Title & Permanent Framing Line */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-base font-bold tracking-tight text-slate-100">
              Multiverse Theater
            </h1>
          </div>
          <span className="hidden md:inline-block text-slate-600">|</span>
          <span className="hidden md:inline-block text-xs text-slate-400 font-medium">
            Reflective Simulation Engine, Not a Future Prediction
          </span>
        </div>

        {/* Center: Honesty Status Chip & Quarter Tracker */}
        <div className="flex items-center gap-4">
          {/* Honesty Status Chip (Section 3) */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/70 text-xs">
            {sceneState.isFinished ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-medium">Simulation complete</span>
              </>
            ) : serverFinished ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 font-medium">Playing back your simulation</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-300 font-medium">Computing live</span>
              </>
            )}
          </div>

          {/* Current Round Counter */}
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">Quarter</span>
            <span className="text-cyan-400 font-bold">Q{currentQuarter}/20</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Month {currentMonth}/60</span>
          </div>
        </div>

        {/* Right: Skip Button (appears after 15 s) */}
        <div>
          {elapsedSeconds >= 15 && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSkipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-sm cursor-pointer disabled:opacity-50"
              data-testid="skip-to-results-btn"
            >
              <span>{isSkipping ? "Finishing..." : "Skip to results"}</span>
              <span className="text-slate-400">→</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Agent Office Status Strip (< 1024px) */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 overflow-x-auto no-scrollbar text-[11px]">
        {(Object.keys(INITIAL_AGENTS) as AgentId[]).map((agentId) => {
          const agent = sceneState.agents[agentId] || INITIAL_AGENTS[agentId];
          const isWorking = agent.dotColor === "accent";
          return (
            <div
              key={agentId}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-850/80 border border-slate-800 whitespace-nowrap"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWorking ? "animate-pulse" : ""
                }`}
                style={{ backgroundColor: isWorking ? agent.accent : "#64748b" }}
              />
              <span className="font-semibold text-slate-300">{agent.name}</span>
              <span className="text-slate-500 text-[10px]">{agent.statusTag}</span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left 70%: Stage (Story Focus Bar + Canvas) */}
        <section
          className="flex-1 lg:w-[70%] flex flex-col gap-3 min-h-[460px] relative"
          aria-label="Simulation Theater Visual Stage"
        >
          {/* Focus Bar */}
          <StoryFocusBar
            stories={sceneState.stories}
            focusedStoryId={focusedStoryId}
            onFocusChange={setFocusedStoryId}
          />

          {/* Canvas Wrapper */}
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-[380px]">
            <TheaterCanvas
              sceneState={sceneState}
              focusedStoryId={focusedStoryId}
              onFocusChange={setFocusedStoryId}
            />
          </div>
        </section>

        {/* Right 30%: Live Ticker (Desktop) */}
        <section
          className="hidden lg:flex lg:w-[30%] min-w-[320px] flex-col"
          aria-label="Live Simulation Ticker"
        >
          <LiveTicker
            ticker={sceneState.ticker}
            focusedStoryId={focusedStoryId}
            onFocusStory={setFocusedStoryId}
            className="h-full"
          />
        </section>

        {/* Mobile Live Ticker Bottom Sheet (< 1024px) */}
        <section
          className={`lg:hidden flex flex-col bg-slate-900 border-t border-slate-800 transition-all duration-300 ${
            isMobileTickerOpen ? "h-[360px]" : "h-[96px]"
          }`}
          aria-label="Mobile Live Ticker Drawer"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Live Ticker
            </span>
            <button
              type="button"
              onClick={() => setIsMobileTickerOpen(!isMobileTickerOpen)}
              className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-slate-800"
            >
              {isMobileTickerOpen ? "Collapse ↓" : "Expand ↑"}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <LiveTicker
              ticker={sceneState.ticker}
              focusedStoryId={focusedStoryId}
              onFocusStory={setFocusedStoryId}
              className="h-full border-0 rounded-none bg-transparent"
            />
          </div>
        </section>
      </main>

      {/* Safety Footer Line (Rule 7, Section 11) */}
      <footer className="px-6 py-2 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500 font-medium">
        Reflective Simulation Engine, Not a Future Prediction.
      </footer>
    </div>
  );
}
