import { describe, it, expect } from "vitest";
import {
  LIFE_WING_ROOMS,
  AGENT_OFFICE,
  isTileBlocked,
  resolveWindowView,
} from "@/lib/theater/layout";

describe("Phase 4: Layout & Blueprint", () => {
  it("defines 4 Life Wing rooms with valid dimensions and anchors", () => {
    const roomKeys = Object.keys(LIFE_WING_ROOMS);
    expect(roomKeys).toEqual(["S1", "S2", "S3", "S4"]);

    for (const [id, room] of Object.entries(LIFE_WING_ROOMS)) {
      expect(room.storyId).toBe(id);
      expect(room.width).toBe(8);
      expect(room.height).toBe(8);

      const anchors = room.anchors;
      expect(anchors.door).toBeDefined();
      expect(anchors.desk).toBeDefined();
      expect(anchors.sofa).toBeDefined();
      expect(anchors.window).toBeDefined();
      expect(anchors.kitchen).toBeDefined();
      expect(anchors.shelf).toBeDefined();
      expect(anchors.visitor_1).toBeDefined();
      expect(anchors.visitor_2).toBeDefined();

      // Verify all anchors lie inside the room bounds or entry
      for (const coord of Object.values(anchors)) {
        expect(coord.level).toBe(0);
        expect(coord.col).toBeGreaterThanOrEqual(room.originCol);
        expect(coord.col).toBeLessThanOrEqual(room.originCol + room.width);
        expect(coord.row).toBeGreaterThanOrEqual(room.originRow);
        expect(coord.row).toBeLessThanOrEqual(room.originRow + room.height);
      }
    }
  });

  it("defines Agent Office layout with all 9 agent desk anchors", () => {
    expect(AGENT_OFFICE.width).toBe(16);
    expect(AGENT_OFFICE.height).toBe(10);

    const agentIds = [
      "RONIN",
      "SAGE",
      "CIPHER",
      "MUSE",
      "ATLAS",
      "FORGE",
      "ECHO",
      "SPARK",
    ];

    for (const agentId of agentIds) {
      const key = `desk_${agentId}` as keyof typeof AGENT_OFFICE.anchors;
      const anchor = AGENT_OFFICE.anchors[key];
      expect(anchor).toBeDefined();
      expect(anchor.level).toBe(1);
      expect(anchor.col).toBeGreaterThan(0);
      expect(anchor.col).toBeLessThan(AGENT_OFFICE.width);
      expect(anchor.row).toBeGreaterThan(0);
      expect(anchor.row).toBeLessThan(AGENT_OFFICE.height);
    }

    expect(AGENT_OFFICE.anchors.reception.level).toBe(1);
    expect(AGENT_OFFICE.anchors.server_rack.level).toBe(1);
    expect(AGENT_OFFICE.anchors.bulletin_board.level).toBe(1);
    expect(AGENT_OFFICE.anchors.water_cooler.level).toBe(1);
  });

  it("evaluates tile collision blocking accurately", () => {
    // Negative coordinates blocked
    expect(isTileBlocked(-1, 5, 0)).toBe(true);
    expect(isTileBlocked(5, -1, 0)).toBe(true);
    expect(isTileBlocked(20, 5, 0)).toBe(true);

    // Life Wing corridor (col 8, row 8) is walkable
    expect(isTileBlocked(8, 4, 0)).toBe(false);
    expect(isTileBlocked(4, 8, 0)).toBe(false);
    expect(isTileBlocked(8, 8, 0)).toBe(false);

    // Agent Office boundaries
    expect(isTileBlocked(0, 5, 1)).toBe(true); // Outer NW wall
    expect(isTileBlocked(5, 0, 1)).toBe(true); // Outer NE wall
    expect(isTileBlocked(5, 5, 1)).toBe(false); // Open office floor
  });

  it("resolves city window view silhouette correctly", () => {
    expect(resolveWindowView("London, UK")).toBe("london");
    expect(resolveWindowView("Central London")).toBe("london");
    expect(resolveWindowView("Delhi NCR")).toBe("delhi");
    expect(resolveWindowView("Bengaluru, Karnataka")).toBe("bengaluru");
    expect(resolveWindowView("Bangalore")).toBe("bengaluru");
    expect(resolveWindowView("San Francisco, CA")).toBe("sf");
    expect(resolveWindowView("Bay Area")).toBe("sf");
    expect(resolveWindowView("Tokyo, Japan")).toBe("generic");
    expect(resolveWindowView("")).toBe("generic");
  });
});
