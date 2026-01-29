/**
 * Search Ranking Module
 *
 * Implements a hybrid search ranking system that combines:
 * - Text relevance (exact match, token overlap, n-gram similarity)
 * - User personalization (past selections, type preferences)
 * - Temporal signals (recency)
 * - Contextual signals (page context matching)
 *
 * This is the MVP implementation using manually tuned weights.
 * Future versions can use ML-based learning-to-rank.
 */

import type {
  SearchRankingFeatures,
  SearchRankingWeights,
  ScoredSearchResult,
  SearchResultType,
  SearchHistoryEntry,
} from "@scholaros/shared/types";

// ============================================================================
// Default Weights
// ============================================================================

export const RANKING_WEIGHTS: SearchRankingWeights = {
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

// ============================================================================
// Feature Computation
// ============================================================================

/**
 * Compute character n-gram Jaccard similarity
 */
function computeNgramSimilarity(s1: string, s2: string, n: number = 3): number {
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
}

/**
 * Compute token overlap (Jaccard similarity on words)
 */
function computeTokenOverlap(query: string, title: string): number {
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
}

/**
 * Context type mapping for relevance scoring
 */
const CONTEXT_TYPE_MAP: Record<string, SearchResultType[]> = {
  "/today": ["task"],
  "/upcoming": ["task"],
  "/board": ["task"],
  "/list": ["task"],
  "/projects": ["project"],
  "/grants": ["grant"],
  "/publications": ["publication"],
  "/calendar": ["task"],
};

export interface SearchResult {
  id: string;
  title: string;
  type: SearchResultType;
  updated_at?: string;
  [key: string]: unknown;
}

export interface SearchContext {
  pageContext: string;
  userHistory: SearchHistoryEntry[];
}

/**
 * Compute all ranking features for a query-result pair
 */
export function computeRankingFeatures(
  query: string,
  result: SearchResult,
  context: SearchContext
): Partial<SearchRankingFeatures> {
  const features: Partial<SearchRankingFeatures> = {};

  // Query-Document Relevance
  features.title_exact_match = result.title.toLowerCase().includes(query.toLowerCase())
    ? 1
    : 0;
  features.title_token_overlap = computeTokenOverlap(query, result.title);
  features.char_ngram_similarity = computeNgramSimilarity(query, result.title);
  features.title_length = result.title.length;
  features.title_word_count = result.title.split(/\s+/).length;

  // User Personalization
  const selectedIds = new Set(
    context.userHistory.filter((h) => h.selected).map((h) => h.result_id)
  );
  features.user_previously_selected = selectedIds.has(result.id) ? 1 : 0;

  // Type preference from history
  const typeCounts: Record<string, number> = {};
  context.userHistory
    .filter((h) => h.selected && h.result_type)
    .forEach((h) => {
      typeCounts[h.result_type!] = (typeCounts[h.result_type!] || 0) + 1;
    });
  const totalSelections = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  features.user_type_preference =
    totalSelections > 0 ? (typeCounts[result.type] || 0) / totalSelections : 0.25;

  // Temporal Signals
  if (result.updated_at) {
    const updatedAt = new Date(result.updated_at);
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    features.days_since_update = daysSinceUpdate;
    features.updated_this_week = daysSinceUpdate <= 7 ? 1 : 0;
  } else {
    features.days_since_update = 365;
    features.updated_this_week = 0;
  }

  // Contextual Signals
  const expectedTypes = CONTEXT_TYPE_MAP[context.pageContext] || [];
  features.type_matches_context = expectedTypes.includes(result.type) ? 1 : 0;

  // Type indicators (one-hot)
  features.type_task = result.type === "task" ? 1 : 0;
  features.type_project = result.type === "project" ? 1 : 0;
  features.type_grant = result.type === "grant" ? 1 : 0;
  features.type_publication = result.type === "publication" ? 1 : 0;
  features.type_navigation = result.type === "navigation" ? 1 : 0;

  return features;
}

// ============================================================================
// Scoring
// ============================================================================

/**
 * Compute ranking score from features using linear model
 */
export function computeRankingScore(
  features: Partial<SearchRankingFeatures>,
  weights: SearchRankingWeights = RANKING_WEIGHTS
): number {
  let score = 0;

  // Relevance features
  score += (features.title_exact_match ?? 0) * weights.title_exact_match;
  score += (features.title_token_overlap ?? 0) * weights.title_token_overlap;
  score += (features.char_ngram_similarity ?? 0) * weights.char_ngram_similarity;

  // Personalization features
  score += (features.user_previously_selected ?? 0) * weights.user_previously_selected;
  score += (features.user_type_preference ?? 0) * weights.user_type_preference;

  // Temporal features
  score += (features.updated_this_week ?? 0) * weights.updated_this_week;
  score += (features.days_since_update ?? 0) * weights.days_since_update;

  // Contextual features
  score += (features.type_matches_context ?? 0) * weights.type_matches_context;

  // Length penalty
  score += (features.title_length ?? 0) * weights.title_length;

  return score;
}

// ============================================================================
// Ranking Functions
// ============================================================================

/**
 * Rank search results by computed scores
 */
export function rankSearchResults<T extends SearchResult>(
  results: T[],
  query: string,
  context: SearchContext,
  weights: SearchRankingWeights = RANKING_WEIGHTS
): ScoredSearchResult<T>[] {
  const scoredResults = results.map((result) => {
    const features = computeRankingFeatures(query, result, context);
    const score = computeRankingScore(features, weights);
    return {
      result,
      score,
      features,
    };
  });

  // Sort by score descending
  return scoredResults.sort((a, b) => b.score - a.score);
}

/**
 * Re-rank results with personalization applied
 */
export function applyPersonalization<T extends SearchResult>(
  scoredResults: ScoredSearchResult<T>[],
  boost: number = 1.5
): ScoredSearchResult<T>[] {
  return scoredResults
    .map((item) => ({
      ...item,
      score:
        item.score + (item.features.user_previously_selected || 0) * boost,
    }))
    .sort((a, b) => b.score - a.score);
}

// ============================================================================
// Metrics
// ============================================================================

/**
 * Calculate Mean Reciprocal Rank (MRR) from a list of rankings
 *
 * @param rankings - List of positions (1-indexed) where correct result was found
 */
export function calculateMRR(rankings: number[]): number {
  if (rankings.length === 0) return 0;

  const reciprocalRanks = rankings
    .filter((r) => r > 0)
    .map((r) => 1 / r);

  return reciprocalRanks.length > 0
    ? reciprocalRanks.reduce((a, b) => a + b, 0) / reciprocalRanks.length
    : 0;
}

/**
 * Calculate Precision@K
 *
 * @param relevant - Set of relevant result IDs
 * @param retrieved - List of retrieved result IDs in rank order
 * @param k - Number of top results to consider
 */
export function calculatePrecisionAtK(
  relevant: Set<string>,
  retrieved: string[],
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantRetrieved = topK.filter((id) => relevant.has(id)).length;
  return k > 0 ? relevantRetrieved / k : 0;
}

/**
 * Calculate Click-Through Rate
 *
 * @param clicks - Number of clicks (selections)
 * @param impressions - Number of search results shown
 */
export function calculateCTR(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get top N results after ranking
 */
export function getTopResults<T extends SearchResult>(
  results: T[],
  query: string,
  context: SearchContext,
  n: number = 10
): T[] {
  const ranked = rankSearchResults(results, query, context);
  return ranked.slice(0, n).map((item) => item.result);
}

/**
 * Filter results by minimum score threshold
 */
export function filterByScore<T extends SearchResult>(
  scoredResults: ScoredSearchResult<T>[],
  minScore: number = 0
): ScoredSearchResult<T>[] {
  return scoredResults.filter((item) => item.score >= minScore);
}

/**
 * Group results by type while preserving rank order within groups
 */
export function groupResultsByType<T extends SearchResult>(
  scoredResults: ScoredSearchResult<T>[]
): Map<SearchResultType, ScoredSearchResult<T>[]> {
  const groups = new Map<SearchResultType, ScoredSearchResult<T>[]>();

  for (const item of scoredResults) {
    const type = item.result.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(item);
  }

  return groups;
}
