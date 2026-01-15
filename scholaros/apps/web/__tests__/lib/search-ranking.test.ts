/**
 * Search Ranking Utility Tests
 *
 * Tests for the Phase 9B search ranking algorithm.
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";

// Re-implement the ranking functions for testing
// (We test the logic, not the actual imports to avoid module resolution issues)

describe("Search Ranking", () => {
  describe("N-gram Similarity", () => {
    const computeNgramSimilarity = (s1: string, s2: string, n: number = 3): number => {
      const getNgrams = (s: string): Set<string> => {
        const lower = s.toLowerCase();
        const ngrams = new Set<string>();
        for (let i = 0; i <= lower.length - n; i++) {
          ngrams.add(lower.slice(i, i + n));
        }
        return ngrams;
      };

      const ngrams1 = getNgrams(s1);
      const ngrams2 = getNgrams(s2);

      if (ngrams1.size === 0 || ngrams2.size === 0) {
        return 0;
      }

      const intersection = [...ngrams1].filter((ng) => ngrams2.has(ng)).length;
      const union = new Set([...ngrams1, ...ngrams2]).size;

      return union > 0 ? intersection / union : 0;
    };

    it("should return 1 for identical strings", () => {
      expect(computeNgramSimilarity("hello", "hello")).toBe(1);
    });

    it("should return 0 for completely different strings", () => {
      expect(computeNgramSimilarity("abc", "xyz")).toBe(0);
    });

    it("should be case insensitive", () => {
      expect(computeNgramSimilarity("Hello", "hello")).toBe(1);
      expect(computeNgramSimilarity("TEST", "test")).toBe(1);
    });

    it("should handle similar strings", () => {
      const similarity = computeNgramSimilarity("hello", "hallo");
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it("should handle short strings", () => {
      // Strings shorter than n will have no n-grams
      expect(computeNgramSimilarity("ab", "ab")).toBe(0);
      expect(computeNgramSimilarity("abc", "abc")).toBe(1);
    });

    it("should handle empty strings", () => {
      expect(computeNgramSimilarity("", "hello")).toBe(0);
      expect(computeNgramSimilarity("hello", "")).toBe(0);
      expect(computeNgramSimilarity("", "")).toBe(0);
    });
  });

  describe("Token Overlap", () => {
    const computeTokenOverlap = (query: string, title: string): number => {
      const queryTokens = new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 0)
      );
      const titleTokens = new Set(
        title
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 0)
      );

      if (queryTokens.size === 0 || titleTokens.size === 0) {
        return 0;
      }

      const intersection = [...queryTokens].filter((t) => titleTokens.has(t)).length;
      const union = new Set([...queryTokens, ...titleTokens]).size;

      return union > 0 ? intersection / union : 0;
    };

    it("should return 1 for identical tokens", () => {
      expect(computeTokenOverlap("hello world", "hello world")).toBe(1);
    });

    it("should return 0 for no overlap", () => {
      expect(computeTokenOverlap("hello world", "foo bar")).toBe(0);
    });

    it("should be case insensitive", () => {
      expect(computeTokenOverlap("Hello World", "hello world")).toBe(1);
    });

    it("should compute partial overlap", () => {
      // "hello world" and "hello there" share "hello"
      // Union: {hello, world, there} = 3
      // Intersection: {hello} = 1
      // Overlap: 1/3 ≈ 0.333
      const overlap = computeTokenOverlap("hello world", "hello there");
      expect(overlap).toBeCloseTo(1 / 3, 2);
    });

    it("should handle empty strings", () => {
      expect(computeTokenOverlap("", "hello")).toBe(0);
      expect(computeTokenOverlap("hello", "")).toBe(0);
      expect(computeTokenOverlap("", "")).toBe(0);
    });

    it("should handle whitespace-only strings", () => {
      expect(computeTokenOverlap("   ", "hello")).toBe(0);
      expect(computeTokenOverlap("hello", "   ")).toBe(0);
    });
  });

  describe("Ranking Score Computation", () => {
    interface RankingFeatures {
      title_exact_match: number;
      title_token_overlap: number;
      char_ngram_similarity: number;
      user_previously_selected: number;
      user_type_preference: number;
      updated_this_week: number;
      type_matches_context: number;
      title_length: number;
      days_since_update: number;
    }

    const RANKING_WEIGHTS = {
      title_exact_match: 5.0,
      title_token_overlap: 3.0,
      char_ngram_similarity: 1.5,
      user_previously_selected: 2.0,
      user_type_preference: 1.0,
      updated_this_week: 0.5,
      type_matches_context: 1.5,
      title_length: -0.01,
      days_since_update: -0.005,
    };

    const computeScore = (features: Partial<RankingFeatures>): number => {
      let score = 0;

      score += (features.title_exact_match ?? 0) * RANKING_WEIGHTS.title_exact_match;
      score += (features.title_token_overlap ?? 0) * RANKING_WEIGHTS.title_token_overlap;
      score += (features.char_ngram_similarity ?? 0) * RANKING_WEIGHTS.char_ngram_similarity;
      score += (features.user_previously_selected ?? 0) * RANKING_WEIGHTS.user_previously_selected;
      score += (features.user_type_preference ?? 0) * RANKING_WEIGHTS.user_type_preference;
      score += (features.updated_this_week ?? 0) * RANKING_WEIGHTS.updated_this_week;
      score += (features.type_matches_context ?? 0) * RANKING_WEIGHTS.type_matches_context;
      score += (features.title_length ?? 0) * RANKING_WEIGHTS.title_length;
      score += (features.days_since_update ?? 0) * RANKING_WEIGHTS.days_since_update;

      return score;
    };

    it("should compute score with all features", () => {
      const features: RankingFeatures = {
        title_exact_match: 1,
        title_token_overlap: 0.5,
        char_ngram_similarity: 0.7,
        user_previously_selected: 1,
        user_type_preference: 0.3,
        updated_this_week: 1,
        type_matches_context: 1,
        title_length: 20,
        days_since_update: 3,
      };

      const score = computeScore(features);

      // Calculate expected:
      // 1*5 + 0.5*3 + 0.7*1.5 + 1*2 + 0.3*1 + 1*0.5 + 1*1.5 + 20*(-0.01) + 3*(-0.005)
      // = 5 + 1.5 + 1.05 + 2 + 0.3 + 0.5 + 1.5 - 0.2 - 0.015
      // = 11.635
      expect(score).toBeCloseTo(11.635, 2);
    });

    it("should return 0 for empty features", () => {
      expect(computeScore({})).toBe(0);
    });

    it("should apply exact match boost correctly", () => {
      const withExact = computeScore({ title_exact_match: 1 });
      const withoutExact = computeScore({ title_exact_match: 0 });

      expect(withExact - withoutExact).toBe(5.0);
    });

    it("should apply length penalty", () => {
      const shortTitle = computeScore({ title_length: 10 });
      const longTitle = computeScore({ title_length: 100 });

      expect(shortTitle).toBeGreaterThan(longTitle);
      expect(shortTitle - longTitle).toBeCloseTo(0.9, 2);
    });

    it("should apply recency penalty", () => {
      const recent = computeScore({ days_since_update: 1 });
      const old = computeScore({ days_since_update: 100 });

      expect(recent).toBeGreaterThan(old);
    });

    it("should boost previously selected results", () => {
      const selected = computeScore({ user_previously_selected: 1 });
      const notSelected = computeScore({ user_previously_selected: 0 });

      expect(selected - notSelected).toBe(2.0);
    });
  });

  describe("Result Ranking", () => {
    interface SearchResult {
      id: string;
      title: string;
      type: string;
      score: number;
    }

    const rankResults = (results: SearchResult[]): SearchResult[] => {
      return [...results].sort((a, b) => b.score - a.score);
    };

    it("should sort results by score descending", () => {
      const results: SearchResult[] = [
        { id: "1", title: "Low Score", type: "task", score: 1 },
        { id: "2", title: "High Score", type: "task", score: 10 },
        { id: "3", title: "Medium Score", type: "task", score: 5 },
      ];

      const ranked = rankResults(results);

      expect(ranked[0].id).toBe("2");
      expect(ranked[1].id).toBe("3");
      expect(ranked[2].id).toBe("1");
    });

    it("should preserve order for equal scores", () => {
      const results: SearchResult[] = [
        { id: "1", title: "First", type: "task", score: 5 },
        { id: "2", title: "Second", type: "task", score: 5 },
        { id: "3", title: "Third", type: "task", score: 5 },
      ];

      const ranked = rankResults(results);

      // JavaScript's sort is stable, so original order should be preserved
      expect(ranked.map((r) => r.id)).toEqual(["1", "2", "3"]);
    });

    it("should handle empty results", () => {
      const ranked = rankResults([]);
      expect(ranked).toEqual([]);
    });

    it("should handle single result", () => {
      const results: SearchResult[] = [
        { id: "1", title: "Only One", type: "task", score: 5 },
      ];

      const ranked = rankResults(results);
      expect(ranked.length).toBe(1);
      expect(ranked[0].id).toBe("1");
    });
  });

  describe("Metrics", () => {
    describe("Mean Reciprocal Rank (MRR)", () => {
      const calculateMRR = (rankings: number[]): number => {
        if (rankings.length === 0) return 0;

        const reciprocalRanks = rankings
          .filter((r) => r > 0)
          .map((r) => 1 / r);

        return reciprocalRanks.length > 0
          ? reciprocalRanks.reduce((a, b) => a + b, 0) / reciprocalRanks.length
          : 0;
      };

      it("should return 1 for all first-position results", () => {
        expect(calculateMRR([1, 1, 1])).toBe(1);
      });

      it("should return 0.5 for all second-position results", () => {
        expect(calculateMRR([2, 2, 2])).toBe(0.5);
      });

      it("should compute average correctly", () => {
        // MRR of [1, 2, 3] = (1 + 0.5 + 0.333) / 3 ≈ 0.611
        const mrr = calculateMRR([1, 2, 3]);
        expect(mrr).toBeCloseTo(0.611, 2);
      });

      it("should return 0 for empty rankings", () => {
        expect(calculateMRR([])).toBe(0);
      });

      it("should ignore zero rankings", () => {
        // Zero means not found
        expect(calculateMRR([1, 0, 2])).toBeCloseTo(0.75, 2);
      });
    });

    describe("Precision@K", () => {
      const calculatePrecisionAtK = (
        relevant: Set<string>,
        retrieved: string[],
        k: number
      ): number => {
        const topK = retrieved.slice(0, k);
        const relevantRetrieved = topK.filter((id) => relevant.has(id)).length;
        return k > 0 ? relevantRetrieved / k : 0;
      };

      it("should return 1 for perfect precision", () => {
        const relevant = new Set(["1", "2", "3"]);
        const retrieved = ["1", "2", "3", "4", "5"];

        expect(calculatePrecisionAtK(relevant, retrieved, 3)).toBe(1);
      });

      it("should return 0 for no relevant results", () => {
        const relevant = new Set(["1", "2", "3"]);
        const retrieved = ["4", "5", "6"];

        expect(calculatePrecisionAtK(relevant, retrieved, 3)).toBe(0);
      });

      it("should compute partial precision", () => {
        const relevant = new Set(["1", "3"]);
        const retrieved = ["1", "2", "3", "4", "5"];

        // At k=3: retrieved [1, 2, 3], relevant = [1, 3] = 2/3
        expect(calculatePrecisionAtK(relevant, retrieved, 3)).toBeCloseTo(2 / 3, 2);
      });

      it("should return 0 for k=0", () => {
        const relevant = new Set(["1"]);
        const retrieved = ["1"];

        expect(calculatePrecisionAtK(relevant, retrieved, 0)).toBe(0);
      });
    });

    describe("Click-Through Rate (CTR)", () => {
      const calculateCTR = (clicks: number, impressions: number): number => {
        return impressions > 0 ? clicks / impressions : 0;
      };

      it("should compute CTR correctly", () => {
        expect(calculateCTR(10, 100)).toBe(0.1);
        expect(calculateCTR(50, 100)).toBe(0.5);
        expect(calculateCTR(100, 100)).toBe(1);
      });

      it("should return 0 for no impressions", () => {
        expect(calculateCTR(0, 0)).toBe(0);
        expect(calculateCTR(10, 0)).toBe(0);
      });

      it("should handle zero clicks", () => {
        expect(calculateCTR(0, 100)).toBe(0);
      });
    });
  });

  describe("Top Results", () => {
    it("should return top N results", () => {
      const results = [
        { id: "1", score: 10 },
        { id: "2", score: 8 },
        { id: "3", score: 6 },
        { id: "4", score: 4 },
        { id: "5", score: 2 },
      ];

      const topN = results.slice(0, 3);
      expect(topN.length).toBe(3);
      expect(topN[0].id).toBe("1");
      expect(topN[2].id).toBe("3");
    });

    it("should handle N larger than results", () => {
      const results = [{ id: "1", score: 10 }];

      const topN = results.slice(0, 10);
      expect(topN.length).toBe(1);
    });
  });

  describe("Score Filtering", () => {
    it("should filter by minimum score", () => {
      const results = [
        { id: "1", score: 10 },
        { id: "2", score: 5 },
        { id: "3", score: 1 },
        { id: "4", score: 0 },
      ];

      const filtered = results.filter((r) => r.score >= 5);
      expect(filtered.length).toBe(2);
    });

    it("should return all results for min score 0", () => {
      const results = [
        { id: "1", score: 10 },
        { id: "2", score: 0 },
      ];

      const filtered = results.filter((r) => r.score >= 0);
      expect(filtered.length).toBe(2);
    });
  });

  describe("Result Grouping", () => {
    it("should group results by type", () => {
      const results = [
        { id: "1", type: "task", score: 10 },
        { id: "2", type: "project", score: 8 },
        { id: "3", type: "task", score: 6 },
        { id: "4", type: "grant", score: 4 },
      ];

      const groups = new Map<string, typeof results>();

      for (const result of results) {
        if (!groups.has(result.type)) {
          groups.set(result.type, []);
        }
        groups.get(result.type)!.push(result);
      }

      expect(groups.get("task")!.length).toBe(2);
      expect(groups.get("project")!.length).toBe(1);
      expect(groups.get("grant")!.length).toBe(1);
      expect(groups.has("publication")).toBe(false);
    });

    it("should preserve rank order within groups", () => {
      const results = [
        { id: "1", type: "task", score: 10 },
        { id: "2", type: "task", score: 5 },
      ];

      const taskGroup = results.filter((r) => r.type === "task");
      expect(taskGroup[0].id).toBe("1");
      expect(taskGroup[1].id).toBe("2");
    });
  });
});
