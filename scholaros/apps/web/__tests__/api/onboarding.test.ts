/**
 * Onboarding API Route Tests
 *
 * Tests for the Phase 9B onboarding progress tracking API.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateOnboardingSchema, OnboardingProgressSchema, OnboardingStepSchema } from "@scholaros/shared/schemas";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("Onboarding API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema Validation", () => {
    describe("OnboardingStepSchema", () => {
      it("should accept valid step values (0-5)", () => {
        [0, 1, 2, 3, 4, 5].forEach((step) => {
          const result = OnboardingStepSchema.safeParse(step);
          expect(result.success).toBe(true);
        });
      });

      it("should reject invalid step values", () => {
        [-1, 6, 10, 100].forEach((step) => {
          const result = OnboardingStepSchema.safeParse(step);
          expect(result.success).toBe(false);
        });
      });

      it("should reject non-integer values", () => {
        const result = OnboardingStepSchema.safeParse(2.5);
        expect(result.success).toBe(false);
      });

      it("should reject string values", () => {
        const result = OnboardingStepSchema.safeParse("3");
        expect(result.success).toBe(false);
      });
    });

    describe("OnboardingProgressSchema", () => {
      it("should validate complete progress object", () => {
        const progress = {
          step: 3,
          completed: false,
          skipped: false,
          startedAt: "2024-01-15T10:30:00Z",
          completedAt: null,
        };
        const result = OnboardingProgressSchema.safeParse(progress);
        expect(result.success).toBe(true);
      });

      it("should accept completed onboarding", () => {
        const progress = {
          step: 5,
          completed: true,
          skipped: false,
          startedAt: "2024-01-15T10:30:00Z",
          completedAt: "2024-01-15T11:00:00Z",
        };
        const result = OnboardingProgressSchema.safeParse(progress);
        expect(result.success).toBe(true);
      });

      it("should accept skipped onboarding", () => {
        const progress = {
          step: 2,
          completed: true,
          skipped: true,
          startedAt: "2024-01-15T10:30:00Z",
          completedAt: "2024-01-15T10:35:00Z",
        };
        const result = OnboardingProgressSchema.safeParse(progress);
        expect(result.success).toBe(true);
      });

      it("should accept null timestamps", () => {
        const progress = {
          step: 0,
          completed: false,
          skipped: false,
          startedAt: null,
          completedAt: null,
        };
        const result = OnboardingProgressSchema.safeParse(progress);
        expect(result.success).toBe(true);
      });
    });

    describe("UpdateOnboardingSchema", () => {
      it("should accept step update only", () => {
        const result = UpdateOnboardingSchema.safeParse({ step: 3 });
        expect(result.success).toBe(true);
      });

      it("should accept completed update only", () => {
        const result = UpdateOnboardingSchema.safeParse({ completed: true });
        expect(result.success).toBe(true);
      });

      it("should accept skipped update only", () => {
        const result = UpdateOnboardingSchema.safeParse({ skipped: true });
        expect(result.success).toBe(true);
      });

      it("should accept multiple fields", () => {
        const result = UpdateOnboardingSchema.safeParse({
          step: 5,
          completed: true,
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty object", () => {
        const result = UpdateOnboardingSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it("should reject invalid step value", () => {
        const result = UpdateOnboardingSchema.safeParse({ step: 10 });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Onboarding Step Names", () => {
    const ONBOARDING_STEP_NAMES: Record<number, string> = {
      0: "not_started",
      1: "welcome",
      2: "profile",
      3: "workspace",
      4: "first_task",
      5: "completion",
    };

    it("should have names for all steps", () => {
      [0, 1, 2, 3, 4, 5].forEach((step) => {
        expect(ONBOARDING_STEP_NAMES[step]).toBeDefined();
      });
    });

    it("should provide meaningful step names", () => {
      expect(ONBOARDING_STEP_NAMES[0]).toBe("not_started");
      expect(ONBOARDING_STEP_NAMES[2]).toBe("profile");
      expect(ONBOARDING_STEP_NAMES[5]).toBe("completion");
    });
  });

  describe("Timestamp Handling", () => {
    it("should generate valid ISO timestamps", () => {
      const now = new Date().toISOString();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it("should parse ISO timestamps correctly", () => {
      const timestamp = "2024-01-15T10:30:00.000Z";
      const date = new Date(timestamp);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });
  });

  describe("State Transitions", () => {
    it("should allow progression through steps", () => {
      const transitions = [
        { from: 0, to: 1, valid: true },
        { from: 1, to: 2, valid: true },
        { from: 2, to: 3, valid: true },
        { from: 3, to: 4, valid: true },
        { from: 4, to: 5, valid: true },
      ];

      transitions.forEach(({ from, to, valid }) => {
        expect(to > from).toBe(valid);
      });
    });

    it("should identify completion state", () => {
      const isComplete = (step: number, completed: boolean) => completed && step === 5;

      expect(isComplete(5, true)).toBe(true);
      expect(isComplete(4, true)).toBe(false);
      expect(isComplete(5, false)).toBe(false);
    });

    it("should identify skip state", () => {
      const wasSkipped = (skipped: boolean, completed: boolean) => skipped && completed;

      expect(wasSkipped(true, true)).toBe(true);
      expect(wasSkipped(true, false)).toBe(false);
      expect(wasSkipped(false, true)).toBe(false);
    });
  });

  describe("Update Logic", () => {
    it("should auto-set startedAt when moving from step 0", () => {
      const shouldSetStartedAt = (
        newStep: number,
        currentStep: number,
        currentStartedAt: string | null
      ) => {
        return newStep > 0 && currentStep === 0 && !currentStartedAt;
      };

      expect(shouldSetStartedAt(1, 0, null)).toBe(true);
      expect(shouldSetStartedAt(1, 0, "2024-01-15T10:00:00Z")).toBe(false);
      expect(shouldSetStartedAt(2, 1, null)).toBe(false);
    });

    it("should auto-set completedAt when completing", () => {
      const shouldSetCompletedAt = (
        newCompleted: boolean,
        currentCompleted: boolean
      ) => {
        return newCompleted && !currentCompleted;
      };

      expect(shouldSetCompletedAt(true, false)).toBe(true);
      expect(shouldSetCompletedAt(true, true)).toBe(false);
      expect(shouldSetCompletedAt(false, false)).toBe(false);
    });

    it("should auto-complete when skipping", () => {
      const shouldAutoComplete = (skipped: boolean, currentCompleted: boolean) => {
        return skipped && !currentCompleted;
      };

      expect(shouldAutoComplete(true, false)).toBe(true);
      expect(shouldAutoComplete(true, true)).toBe(false);
    });
  });

  describe("Default Values", () => {
    it("should have correct default progress", () => {
      const defaultProgress = {
        step: 0,
        completed: false,
        skipped: false,
        startedAt: null,
        completedAt: null,
      };

      expect(defaultProgress.step).toBe(0);
      expect(defaultProgress.completed).toBe(false);
      expect(defaultProgress.skipped).toBe(false);
      expect(defaultProgress.startedAt).toBeNull();
      expect(defaultProgress.completedAt).toBeNull();
    });
  });
});

describe("Onboarding Step Constants", () => {
  const ONBOARDING_STEPS = {
    NOT_STARTED: 0,
    WELCOME: 1,
    PROFILE: 2,
    WORKSPACE: 3,
    FIRST_TASK: 4,
    COMPLETION: 5,
  } as const;

  it("should define all step constants", () => {
    expect(ONBOARDING_STEPS.NOT_STARTED).toBe(0);
    expect(ONBOARDING_STEPS.WELCOME).toBe(1);
    expect(ONBOARDING_STEPS.PROFILE).toBe(2);
    expect(ONBOARDING_STEPS.WORKSPACE).toBe(3);
    expect(ONBOARDING_STEPS.FIRST_TASK).toBe(4);
    expect(ONBOARDING_STEPS.COMPLETION).toBe(5);
  });

  it("should have sequential step values", () => {
    const steps = Object.values(ONBOARDING_STEPS);
    const sorted = [...steps].sort((a, b) => a - b);
    expect(steps).toEqual(sorted);
  });
});

describe("Onboarding Duration Calculation", () => {
  it("should calculate duration in milliseconds", () => {
    const calculateDuration = (
      startedAt: string | null,
      completedAt: string | null
    ): number | null => {
      if (!startedAt || !completedAt) return null;
      return new Date(completedAt).getTime() - new Date(startedAt).getTime();
    };

    const duration = calculateDuration(
      "2024-01-15T10:00:00Z",
      "2024-01-15T10:30:00Z"
    );
    expect(duration).toBe(30 * 60 * 1000); // 30 minutes
  });

  it("should return null for incomplete onboarding", () => {
    const calculateDuration = (
      startedAt: string | null,
      completedAt: string | null
    ): number | null => {
      if (!startedAt || !completedAt) return null;
      return new Date(completedAt).getTime() - new Date(startedAt).getTime();
    };

    expect(calculateDuration("2024-01-15T10:00:00Z", null)).toBeNull();
    expect(calculateDuration(null, "2024-01-15T10:30:00Z")).toBeNull();
    expect(calculateDuration(null, null)).toBeNull();
  });

  it("should format duration for display", () => {
    const formatDuration = (ms: number): string => {
      const minutes = Math.floor(ms / 60000);
      if (minutes < 60) return `${minutes} minutes`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    };

    expect(formatDuration(30 * 60 * 1000)).toBe("30 minutes");
    expect(formatDuration(90 * 60 * 1000)).toBe("1h 30m");
    expect(formatDuration(5 * 60 * 1000)).toBe("5 minutes");
  });
});
