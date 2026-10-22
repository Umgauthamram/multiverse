"use client";

import React, { useEffect, useRef } from "react";
import { TheaterRenderer } from "@/lib/theater/renderer";
import { SceneState } from "@/lib/theater/sceneState";

interface TheaterCanvasProps {
  sceneState: SceneState;
  focusedStoryId?: string | null;
  onFocusChange?: (storyId: string | null) => void;
  reducedMotion?: boolean;
  className?: string;
}

export function TheaterCanvas({
  sceneState,
  focusedStoryId = null,
  onFocusChange,
  reducedMotion = false,
  className = "",
}: TheaterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TheaterRenderer | null>(null);
  const sceneStateRef = useRef<SceneState>(sceneState);

  // Keep sceneState reference fresh for the 60fps render loop
  useEffect(() => {
    sceneStateRef.current = sceneState;
  }, [sceneState]);

  // Synchronize camera focus when prop changes
  useEffect(() => {
    if (rendererRef.current) {
      if (rendererRef.current.focusedStoryId !== focusedStoryId) {
        rendererRef.current.focusStory(focusedStoryId);
      }
    }
  }, [focusedStoryId]);

  // Synchronize reduced motion when prop changes
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    if (rendererRef.current) {
      rendererRef.current.setReducedMotion(reducedMotion);
    }
  }, [reducedMotion]);

  // Initialize TheaterRenderer, attach to canvas, setup resize observer and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new TheaterRenderer();
    renderer.setReducedMotion(reducedMotionRef.current);
    rendererRef.current = renderer;

    // Attach to HTML5 Canvas
    renderer.attach(canvas);

    // Sync room click events from Canvas to parent state
    renderer.onRoomClick = (clickedStoryId) => {
      onFocusChange?.(clickedStoryId);
    };

    // ResizeObserver on the container to maintain crisp resolution and scale
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Main 60 FPS requestAnimationFrame render loop
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(100, now - lastTime); // Clamp max dt to avoid animation jumping
      lastTime = now;

      renderer.update(dt, sceneStateRef.current);
      renderer.draw(sceneStateRef.current);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [onFocusChange]);

  // Generate dynamic aria-label summarizing simulation state (Section 8.5)
  const doneQuarters = Math.floor(
    (sceneState.progress.done / Math.max(1, sceneState.progress.total || 80)) * 20
  );
  const ariaLabel = `Multiverse Theater live visualization: Quarter ${doneQuarters} of 20 with 4 stories and 9 simulation agents running`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[420px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800/80 flex items-center justify-center ${className}`}
      data-testid="theater-canvas-container"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="w-full h-full object-contain cursor-crosshair focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />

      {/* Screen reader live status summary */}
      <div className="sr-only" aria-live="polite">
        {ariaLabel}
      </div>
    </div>
  );
}
