import React from "react";

export interface HudContainerProps {
  headerSlot?: React.ReactNode;
  metricsSlot?: React.ReactNode;
  children?: React.ReactNode;
  controlsSlot?: React.ReactNode;
  drawerSlot?: React.ReactNode;
  isDrawerOpen?: boolean;
  className?: string;
}

export function HudContainer({
  headerSlot,
  metricsSlot,
  children,
  controlsSlot,
  drawerSlot,
  isDrawerOpen = false,
  className = "",
}: HudContainerProps) {
  return (
    <div
      data-testid="hud-container"
      className={`relative min-h-screen w-full bg-[#09090b] text-zinc-100 flex flex-col font-sans select-none overflow-hidden ${className}`}
    >
      {/* Background Subtle Coordinate Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#f4f4f5 1px, transparent 1px), linear-gradient(90deg, #f4f4f5 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top Header Region */}
      {headerSlot && <div className="z-10">{headerSlot}</div>}

      {/* Top Metrics Dock (Optional High-Density Stats) */}
      {metricsSlot && (
        <div
          data-testid="hud-metrics-dock"
          className="z-10 px-4 py-2.5 md:px-6 border-b border-zinc-850 bg-[#0d0d10]"
        >
          {metricsSlot}
        </div>
      )}

      {/* Main Workspace (Canvas Branching Visualizer) */}
      <main
        data-testid="hud-workspace"
        className="relative flex-1 w-full h-full min-h-[480px] overflow-hidden flex flex-col z-0"
      >
        {children}
      </main>

      {/* Bottom Controls Region (Time Scrubber & Playback) */}
      {controlsSlot && (
        <footer
          data-testid="hud-controls-dock"
          className="z-10 border-t border-zinc-800/80 bg-[#09090b]/95 backdrop-blur-sm px-4 py-3 md:px-6"
        >
          {controlsSlot}
        </footer>
      )}

      {/* Side Slide-Out Drawer Slot */}
      {drawerSlot && (
        <aside
          data-testid="hud-drawer-slot"
          className={`fixed inset-y-0 right-0 z-30 w-full sm:w-[420px] md:w-[480px] bg-[#121215] border-l border-zinc-800 shadow-2xl transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {drawerSlot}
        </aside>
      )}
    </div>
  );
}
