"""
Search Ranking Model

Implements a learning-to-rank model for search results.

MVP: Linear scoring model with manually tuned weights
Future: Train LambdaMART on click-through data
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set
import math


@dataclass
class SearchRankingFeatures:
    """Features for ranking a single search result."""
    # Query-Document Relevance
    title_exact_match: float = 0.0
    title_token_overlap: float = 0.0
    char_ngram_similarity: float = 0.0
    title_length: int = 0
    title_word_count: int = 0

    # User Personalization
    user_previously_selected: float = 0.0
    user_type_preference: float = 0.0

    # Temporal Signals
    days_since_update: int = 365
    updated_this_week: float = 0.0

    # Contextual Signals
    type_matches_context: float = 0.0

    # Result type indicators
    type_task: float = 0.0
    type_project: float = 0.0
    type_grant: float = 0.0
    type_publication: float = 0.0
    type_navigation: float = 0.0


@dataclass
class RankingWeights:
    """Weights for the linear ranking model."""
    title_exact_match: float = 5.0
    title_token_overlap: float = 3.0
    char_ngram_similarity: float = 1.5
    user_previously_selected: float = 2.0
    user_type_preference: float = 1.0
    updated_this_week: float = 0.5
    type_matches_context: float = 1.5
    # Penalties
    title_length: float = -0.01
    days_since_update: float = -0.005


@dataclass
class SearchResult:
    """A search result with its computed score."""
    id: str
    title: str
    result_type: str  # 'task', 'project', 'grant', 'publication', 'navigation'
    score: float = 0.0
    features: Optional[SearchRankingFeatures] = None
    updated_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchContext:
    """Context for search ranking."""
    user_id: str
    workspace_id: Optional[str]
    query: str
    page_context: str = ""  # Current page path


# Context type mapping for relevance scoring
CONTEXT_TYPE_MAP: Dict[str, List[str]] = {
    "/today": ["task"],
    "/upcoming": ["task"],
    "/board": ["task"],
    "/list": ["task"],
    "/projects": ["project"],
    "/grants": ["grant"],
    "/publications": ["publication"],
    "/calendar": ["task"],
}


class SearchRanker:
    """
    Ranks search results based on relevance and personalization.

    MVP: Linear scoring model with manually tuned weights
    Future: Train LambdaMART on click-through data
    """

    def __init__(self, weights: Optional[RankingWeights] = None):
        self.weights = weights or RankingWeights()

    def compute_features(
        self,
        query: str,
        result: SearchResult,
        user_history: List[Dict[str, Any]],
        context: SearchContext,
    ) -> SearchRankingFeatures:
        """
        Compute ranking features for a query-result pair.

        Args:
            query: Search query string
            result: Search result to score
            user_history: User's past search selections
            context: Search context (user, workspace, page)

        Returns:
            SearchRankingFeatures instance
        """
        features = SearchRankingFeatures()

        # Query-Document Relevance
        query_lower = query.lower()
        title_lower = result.title.lower()

        features.title_exact_match = 1.0 if query_lower in title_lower else 0.0
        features.title_token_overlap = self._compute_token_overlap(query, result.title)
        features.char_ngram_similarity = self._compute_ngram_similarity(query, result.title)
        features.title_length = len(result.title)
        features.title_word_count = len(result.title.split())

        # User Personalization
        selected_ids = {
            h.get("result_id")
            for h in user_history
            if h.get("selected") and h.get("result_id")
        }
        features.user_previously_selected = 1.0 if result.id in selected_ids else 0.0

        # Type preference from history
        type_counts: Dict[str, int] = {}
        for h in user_history:
            if h.get("selected") and h.get("result_type"):
                rt = h["result_type"]
                type_counts[rt] = type_counts.get(rt, 0) + 1

        total_selections = sum(type_counts.values())
        if total_selections > 0:
            features.user_type_preference = type_counts.get(result.result_type, 0) / total_selections
        else:
            features.user_type_preference = 0.25  # Default uniform preference

        # Temporal Signals
        if result.updated_at:
            try:
                from datetime import datetime
                updated_at = datetime.fromisoformat(result.updated_at.replace("Z", "+00:00"))
                now = datetime.now(updated_at.tzinfo) if updated_at.tzinfo else datetime.now()
                days_ago = (now - updated_at).days
                features.days_since_update = max(0, days_ago)
                features.updated_this_week = 1.0 if days_ago <= 7 else 0.0
            except (ValueError, TypeError):
                features.days_since_update = 365
                features.updated_this_week = 0.0
        else:
            features.days_since_update = 365
            features.updated_this_week = 0.0

        # Contextual Signals
        expected_types = CONTEXT_TYPE_MAP.get(context.page_context, [])
        features.type_matches_context = 1.0 if result.result_type in expected_types else 0.0

        # Type indicators (one-hot)
        features.type_task = 1.0 if result.result_type == "task" else 0.0
        features.type_project = 1.0 if result.result_type == "project" else 0.0
        features.type_grant = 1.0 if result.result_type == "grant" else 0.0
        features.type_publication = 1.0 if result.result_type == "publication" else 0.0
        features.type_navigation = 1.0 if result.result_type == "navigation" else 0.0

        return features

    def score(self, features: SearchRankingFeatures) -> float:
        """
        Compute ranking score from features.

        Args:
            features: SearchRankingFeatures instance

        Returns:
            Float score (higher is better)
        """
        score = 0.0

        # Relevance features
        score += features.title_exact_match * self.weights.title_exact_match
        score += features.title_token_overlap * self.weights.title_token_overlap
        score += features.char_ngram_similarity * self.weights.char_ngram_similarity

        # Personalization features
        score += features.user_previously_selected * self.weights.user_previously_selected
        score += features.user_type_preference * self.weights.user_type_preference

        # Temporal features
        score += features.updated_this_week * self.weights.updated_this_week
        score += features.days_since_update * self.weights.days_since_update

        # Contextual features
        score += features.type_matches_context * self.weights.type_matches_context

        # Length penalty
        score += features.title_length * self.weights.title_length

        return score

    def rank(
        self,
        results: List[SearchResult],
        query: str,
        user_history: List[Dict[str, Any]],
        context: SearchContext,
    ) -> List[SearchResult]:
        """
        Rank search results by computed scores.

        Args:
            results: List of search results to rank
            query: Search query string
            user_history: User's past search selections
            context: Search context

        Returns:
            List of SearchResult sorted by score descending
        """
        scored_results = []

        for result in results:
            features = self.compute_features(query, result, user_history, context)
            result.features = features
            result.score = self.score(features)
            scored_results.append(result)

        return sorted(scored_results, key=lambda r: r.score, reverse=True)

    def _compute_token_overlap(self, s1: str, s2: str) -> float:
        """Compute Jaccard similarity on word tokens."""
        tokens1 = set(s1.lower().split())
        tokens2 = set(s2.lower().split())

        if not tokens1 or not tokens2:
            return 0.0

        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)

        return intersection / union if union > 0 else 0.0

    def _compute_ngram_similarity(self, s1: str, s2: str, n: int = 3) -> float:
        """Compute character n-gram Jaccard similarity."""
        def get_ngrams(s: str) -> Set[str]:
            s = s.lower()
            return {s[i:i+n] for i in range(max(0, len(s) - n + 1))}

        ngrams1 = get_ngrams(s1)
        ngrams2 = get_ngrams(s2)

        if not ngrams1 or not ngrams2:
            return 0.0

        intersection = len(ngrams1 & ngrams2)
        union = len(ngrams1 | ngrams2)

        return intersection / union if union > 0 else 0.0


class SearchRankingMetrics:
    """Evaluation metrics for search ranking quality."""

    @staticmethod
    def mean_reciprocal_rank(rankings: List[int]) -> float:
        """
        Calculate MRR from a list of positions where the "correct" result appeared.

        Args:
            rankings: List of 1-indexed positions

        Returns:
            MRR score (0 to 1, higher is better)
        """
        if not rankings:
            return 0.0

        reciprocal_ranks = [1.0 / r for r in rankings if r > 0]
        return sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0

    @staticmethod
    def precision_at_k(
        relevant: Set[str],
        retrieved: List[str],
        k: int,
    ) -> float:
        """
        Calculate precision@k.

        Args:
            relevant: Set of relevant result IDs
            retrieved: List of retrieved result IDs in rank order
            k: Number of top results to consider

        Returns:
            Precision@k score (0 to 1)
        """
        if k <= 0:
            return 0.0

        retrieved_k = retrieved[:k]
        relevant_retrieved = len(set(retrieved_k) & relevant)

        return relevant_retrieved / k

    @staticmethod
    def dcg_at_k(relevance_scores: List[float], k: int) -> float:
        """
        Calculate Discounted Cumulative Gain at k.

        Args:
            relevance_scores: List of relevance scores in rank order
            k: Number of results to consider

        Returns:
            DCG@k score
        """
        dcg = 0.0
        for i, rel in enumerate(relevance_scores[:k]):
            dcg += (2 ** rel - 1) / math.log2(i + 2)
        return dcg

    @staticmethod
    def ndcg_at_k(relevance_scores: List[float], k: int) -> float:
        """
        Calculate Normalized DCG at k.

        Args:
            relevance_scores: List of relevance scores in rank order
            k: Number of results to consider

        Returns:
            NDCG@k score (0 to 1)
        """
        dcg = SearchRankingMetrics.dcg_at_k(relevance_scores, k)

        # Ideal DCG: sort relevance scores in descending order
        ideal_scores = sorted(relevance_scores, reverse=True)
        idcg = SearchRankingMetrics.dcg_at_k(ideal_scores, k)

        return dcg / idcg if idcg > 0 else 0.0

    @staticmethod
    def click_through_rate(clicks: int, impressions: int) -> float:
        """
        Calculate Click-Through Rate.

        Args:
            clicks: Number of clicks
            impressions: Number of impressions

        Returns:
            CTR (0 to 1)
        """
        return clicks / impressions if impressions > 0 else 0.0
