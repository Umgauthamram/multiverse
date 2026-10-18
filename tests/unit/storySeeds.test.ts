import { describe, it, expect } from "vitest";
import {
  generateStorySeeds,
  STORY_ROSTER,
} from "@/lib/scene/storySeeds";
import { DEFAULT_INTAKE_VALUES } from "@/lib/schemas/intake";

describe("Phase 1: Story Seeds Generator", () => {
  it("enforces canonical roster: S1 (A-bold), S2 (A-anxious), S3 (B-balanced), S4 (B-workaholic)", () => {
    expect(STORY_ROSTER).toHaveLength(4);

    expect(STORY_ROSTER[0]).toEqual({
      storyId: "S1",
      option: "A",
      seed: "bold",
    });
    expect(STORY_ROSTER[1]).toEqual({
      storyId: "S2",
      option: "A",
      seed: "anxious",
    });
    expect(STORY_ROSTER[2]).toEqual({
      storyId: "S3",
      option: "B",
      seed: "balanced",
    });
    expect(STORY_ROSTER[3]).toEqual({
      storyId: "S4",
      option: "B",
      seed: "workaholic",
    });
  });

  it("is completely deterministic: identical intake inputs generate identical story branches", () => {
    const run1 = generateStorySeeds(DEFAULT_INTAKE_VALUES, 4);
    const run2 = generateStorySeeds(DEFAULT_INTAKE_VALUES, 4);

    expect(run1).toEqual(run2);
    expect(run1).toHaveLength(4);
  });

  it("honors the count parameter accurately", () => {
    const twoStories = generateStorySeeds(DEFAULT_INTAKE_VALUES, 2);
    expect(twoStories).toHaveLength(2);
    expect(twoStories[0].timelineId).toBe("S1");
    expect(twoStories[1].timelineId).toBe("S2");

    const fourStories = generateStorySeeds(DEFAULT_INTAKE_VALUES, 4);
    expect(fourStories).toHaveLength(4);
    expect(fourStories.map((s) => s.timelineId)).toEqual(["S1", "S2", "S3", "S4"]);
  });

  it("correctly maps option details (names, locations, liquid savings) into timeline branches", () => {
    const stories = generateStorySeeds(DEFAULT_INTAKE_VALUES, 4);

    // S1 & S2 -> Option A (London)
    expect(stories[0].branchOption).toBe("A");
    expect(stories[0].branchName).toBe(DEFAULT_INTAKE_VALUES.optionA.name);
    expect(stories[0].branchLocation).toBe(DEFAULT_INTAKE_VALUES.optionA.location);
    expect(stories[0].initialLiquidSavings).toBe(DEFAULT_INTAKE_VALUES.liquidSavings);
    expect(stories[0].initialMonthlyBurn).toBe(DEFAULT_INTAKE_VALUES.monthlyBurn);

    expect(stories[1].branchOption).toBe("A");
    expect(stories[1].branchName).toBe(DEFAULT_INTAKE_VALUES.optionA.name);

    // S3 & S4 -> Option B (Delhi)
    expect(stories[2].branchOption).toBe("B");
    expect(stories[2].branchName).toBe(DEFAULT_INTAKE_VALUES.optionB.name);
    expect(stories[2].branchLocation).toBe(DEFAULT_INTAKE_VALUES.optionB.location);

    expect(stories[3].branchOption).toBe("B");
    expect(stories[3].branchName).toBe(DEFAULT_INTAKE_VALUES.optionB.name);
  });
});
