"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

export interface BranchNodeData {
  quarter: number; // 1 to 20
  month: number; // 3 to 60
  status: "thriving" | "plateau" | "struggling" | "burnout" | "neutral";
  eventTitle?: string;
  diarySnippet?: string;
  happiness?: number;
  health?: number;
  netWorth?: number;
}

export interface TimelineTreeBranch {
  timelineId: string;
  branchOption: "A" | "B";
  branchName: string;
  personaSeed: PersonaSeedType;
  status: "thriving" | "plateau" | "struggling" | "burnout";
  nodes: BranchNodeData[];
}

export interface MultiverseTreeCanvasProps {
  branches: TimelineTreeBranch[];
  scrubberMonth?: number; // 0 to 60
  selectedTimelineId?: string;
  selectedQuarter?: number;
  onSelectNode?: (timelineId: string, quarter: number) => void;
  onSelectBranch?: (timelineId: string) => void;
  className?: string;
}

export const STATUS_COLORS = {
  thriving: "#10b981", // Emerald 500
  plateau: "#f59e0b", // Amber 500
  struggling: "#ef4444", // Rose/Crimson 500
  burnout: "#71717a", // Zinc 500
  neutral: "#a1a1aa", // Zinc 400
  trunk: "#e4e4e7", // Zinc 200
  grid: "rgba(39, 39, 42, 0.4)", // Zinc 800
  scrubber: "#38bdf8", // Sky 400 hairline
} as const;

export function getStatusColor(status: string): string {
  switch (status) {
    case "thriving":
      return STATUS_COLORS.thriving;
    case "plateau":
      return STATUS_COLORS.plateau;
    case "struggling":
      return STATUS_COLORS.struggling;
    case "burnout":
      return STATUS_COLORS.burnout;
    default:
      return STATUS_COLORS.neutral;
  }
}

/**
 * Calculates horizontal X coordinate for a given month (0 to 60).
 */
export function calculateMonthX(
  month: number,
  width: number,
  paddingLeft: number = 140,
  paddingRight: number = 60
): number {
  const boundedMonth = Math.max(0, Math.min(60, month));
  const availableWidth = Math.max(10, width - paddingLeft - paddingRight);
  return paddingLeft + (boundedMonth / 60) * availableWidth;
}

/**
 * Calculates vertical Y coordinate for a specific branch.
 */
export function calculateBranchY(
  branchOption: "A" | "B",
  indexInOption: number,
  totalInOption: number = 6,
  height: number = 600,
  paddingTop: number = 60,
  paddingBottom: number = 50
): number {
  const midY = height / 2;
  const availableHalfHeight = midY - paddingTop - 20;

  if (branchOption === "A") {
    // Option A: Top half, ordered 0 to 5
    const step = availableHalfHeight / Math.max(1, totalInOption - 1);
    return paddingTop + indexInOption * step;
  } else {
    // Option B: Bottom half, ordered 0 to 5
    const startY = midY + 30;
    const bottomAvailable = height - paddingBottom - startY;
    const step = bottomAvailable / Math.max(1, totalInOption - 1);
    return startY + indexInOption * step;
  }
}

export function MultiverseTreeCanvas({
  branches = [],
  scrubberMonth = 0,
  selectedTimelineId,
  selectedQuarter,
  onSelectNode,
  onSelectBranch,
  className = "",
}: MultiverseTreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    timelineId: string;
    quarter: number;
    x: number;
    y: number;
  } | null>(null);

  // High-DPI Canvas Rendering Loop
  const renderTree = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 560;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 2, 3) : 1;

    // Maintain crisp high-DPI resolution
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Dark Slate Canvas Background
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    const paddingLeft = 140;
    const paddingRight = 60;
    const paddingTop = 60;
    const paddingBottom = 50;

    // 2. Draw Year Grid Vertical Columns (Year 1 to Year 5)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(39, 39, 42, 0.45)"; // Zinc 800 subtle grid
    ctx.fillStyle = "rgba(161, 161, 170, 0.6)"; // Zinc 400
    ctx.font = "10px Poppins, sans-serif";
    ctx.textAlign = "center";

    for (let yr = 0; yr <= 5; yr++) {
      const m = yr * 12;
      const x = calculateMonthX(m, width, paddingLeft, paddingRight);

      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.moveTo(x, paddingTop - 20);
      ctx.lineTo(x, height - paddingBottom + 10);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillText(yr === 0 ? "Today" : `Year ${yr}`, x, paddingTop - 26);
    }

    // 3. Draw Today Decision Trunk (Root at Month 0)
    const trunkOriginX = 30;
    const trunkOriginY = height / 2;
    const trunkDivergeX = 90;

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = STATUS_COLORS.trunk;
    ctx.lineCap = "round";
    ctx.moveTo(trunkOriginX, trunkOriginY);
    ctx.lineTo(trunkDivergeX, trunkOriginY);
    ctx.stroke();

    // Trunk Origin Glow Dot
    ctx.beginPath();
    ctx.arc(trunkOriginX, trunkOriginY, 4, 0, Math.PI * 2);
    ctx.fillStyle = STATUS_COLORS.trunk;
    ctx.fill();

    // Group branches by Option A and Option B
    const branchesA = branches.filter((b) => b.branchOption === "A");
    const branchesB = branches.filter((b) => b.branchOption === "B");

    // Helper to draw a branch and its nodes
    const drawBranchGroup = (group: TimelineTreeBranch[], option: "A" | "B") => {
      group.forEach((branch, idx) => {
        const branchY = calculateBranchY(option, idx, group.length, height, paddingTop, paddingBottom);
        const isSelectedBranch = selectedTimelineId === branch.timelineId;
        const color = getStatusColor(branch.status);

        // Cubic Bezier curve branching from trunk to horizontal rail
        ctx.beginPath();
        ctx.lineWidth = isSelectedBranch ? 2.5 : 1.25;
        ctx.strokeStyle = isSelectedBranch ? color : `${color}88`; // subtle alpha when not selected

        ctx.moveTo(trunkDivergeX, trunkOriginY);
        // Control points smooth the fork into parallel horizontal rails
        const cp1x = trunkDivergeX + 25;
        const cp1y = trunkOriginY;
        const cp2x = paddingLeft - 20;
        const cp2y = branchY;
        const endX = calculateMonthX(60, width, paddingLeft, paddingRight);

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, paddingLeft, branchY);
        ctx.lineTo(endX, branchY);
        ctx.stroke();

        // Branch Persona Label at left rail entry
        ctx.fillStyle = isSelectedBranch ? "#f4f4f5" : "#a1a1aa";
        ctx.font = isSelectedBranch ? "600 10px Poppins, sans-serif" : "500 9px Poppins, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(branch.personaSeed.toUpperCase(), paddingLeft - 8, branchY + 3);

        // Draw Quarter Nodes along the branch
        branch.nodes.forEach((node) => {
          const nodeX = calculateMonthX(node.month, width, paddingLeft, paddingRight);
          const isSelectedNode =
            selectedTimelineId === branch.timelineId && selectedQuarter === node.quarter;
          const nodeColor = getStatusColor(node.status);

          ctx.beginPath();
          ctx.arc(nodeX, branchY, isSelectedNode ? 5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          if (isSelectedNode) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#f4f4f5";
            ctx.stroke();
          }
        });
      });
    };

    drawBranchGroup(branchesA, "A");
    drawBranchGroup(branchesB, "B");

    // 4. Draw Option A / Option B Group Header Badges
    ctx.font = "600 11px Poppins, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#e4e4e7";
    ctx.fillText(
      branchesA[0]?.branchName ? `PATH A: ${branchesA[0].branchName}` : "PATH A",
      paddingLeft,
      paddingTop - 10
    );

    ctx.fillText(
      branchesB[0]?.branchName ? `PATH B: ${branchesB[0].branchName}` : "PATH B",
      paddingLeft,
      height / 2 + 20
    );

    // 5. Time Scrubber Vertical Hairline Indicator
    const scrubberX = calculateMonthX(scrubberMonth, width, paddingLeft, paddingRight);
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = STATUS_COLORS.scrubber;
    ctx.moveTo(scrubberX, paddingTop - 15);
    ctx.lineTo(scrubberX, height - paddingBottom + 5);
    ctx.stroke();

    // Scrubber top pointer diamond
    ctx.beginPath();
    ctx.fillStyle = STATUS_COLORS.scrubber;
    ctx.moveTo(scrubberX, paddingTop - 12);
    ctx.lineTo(scrubberX - 4, paddingTop - 18);
    ctx.lineTo(scrubberX, paddingTop - 24);
    ctx.lineTo(scrubberX + 4, paddingTop - 18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [branches, scrubberMonth, selectedTimelineId, selectedQuarter]);

  // Redraw on state change or window resize
  useEffect(() => {
    renderTree();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      renderTree();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderTree]);

  // Click & hover hit-testing on nodes and branch rails
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const paddingLeft = 140;
    const paddingRight = 60;
    const paddingTop = 60;
    const paddingBottom = 50;

    // Check node proximity (radius <= 10px)
    for (const branch of branches) {
      const group = branches.filter((b) => b.branchOption === branch.branchOption);
      const idx = group.findIndex((b) => b.timelineId === branch.timelineId);
      const branchY = calculateBranchY(
        branch.branchOption,
        idx,
        group.length,
        height,
        paddingTop,
        paddingBottom
      );

      for (const node of branch.nodes) {
        const nodeX = calculateMonthX(node.month, width, paddingLeft, paddingRight);
        const dist = Math.hypot(clickX - nodeX, clickY - branchY);
        if (dist <= 10) {
          if (onSelectNode) {
            onSelectNode(branch.timelineId, node.quarter);
          }
          if (onSelectBranch) {
            onSelectBranch(branch.timelineId);
          }
          return;
        }
      }

      // Check branch rail proximity
      if (Math.abs(clickY - branchY) <= 8 && clickX >= paddingLeft && clickX <= width - paddingRight) {
        if (onSelectBranch) {
          onSelectBranch(branch.timelineId);
        }
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const paddingLeft = 140;
    const paddingRight = 60;
    const paddingTop = 60;
    const paddingBottom = 50;

    for (const branch of branches) {
      const group = branches.filter((b) => b.branchOption === branch.branchOption);
      const idx = group.findIndex((b) => b.timelineId === branch.timelineId);
      const branchY = calculateBranchY(
        branch.branchOption,
        idx,
        group.length,
        height,
        paddingTop,
        paddingBottom
      );

      for (const node of branch.nodes) {
        const nodeX = calculateMonthX(node.month, width, paddingLeft, paddingRight);
        const dist = Math.hypot(mouseX - nodeX, mouseY - branchY);
        if (dist <= 10) {
          setHoveredNode({
            timelineId: branch.timelineId,
            quarter: node.quarter,
            x: nodeX,
            y: branchY,
          });
          return;
        }
      }
    }
    setHoveredNode(null);
  };

  return (
    <div
      ref={containerRef}
      data-testid="multiverse-tree-container"
      className={`relative w-full h-full min-h-[480px] bg-[#09090b] flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        data-testid="multiverse-tree-canvas"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Hover Tooltip */}
      {hoveredNode && (
        <div
          data-testid="tree-node-tooltip"
          className="pointer-events-none absolute z-20 px-2.5 py-1 rounded bg-[#121215] border border-zinc-700 text-[11px] font-sans text-zinc-200 shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-8"
          style={{ left: hoveredNode.x, top: hoveredNode.y }}
        >
          Quarter {hoveredNode.quarter} (Month {hoveredNode.quarter * 3})
        </div>
      )}
    </div>
  );
}
