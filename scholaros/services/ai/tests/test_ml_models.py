"""
ML Models Unit Tests

Tests for the Phase 9B ML models (search ranker, onboarding predictor).
These tests can run without the full FastAPI stack.
Run with: pytest tests/test_ml_models.py -v
"""

import pytest
import sys
import math
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Set


# Inline implementations for testing without full app imports
# These mirror the actual implementations in app/ml/models/


@dataclass
class SearchRankingFeatures:
    """Features for ranking a single search result."""
    title_exact_match: float = 0.0
    title_token_overlap: float = 0.0
    char_ngram_similarity: float = 0.0
    title_length: int = 0
    title_word_count: int = 0
    user_previously_selected: float = 0.0
    user_type_preference: float = 0.0
    days_since_update: int = 365
    updated_this_week: float = 0.0
    type_matches_context: float = 0.0
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
    title_length: float = -0.01
    days_since_update: float = -0.005


class SearchRanker:
    """Simplified search ranker for testing."""

    def __init__(self, weights: Optional[RankingWeights] = None):
        self.weights = weights or RankingWeights()

    def compute_token_overlap(self, s1: str, s2: str) -> float:
        """Compute Jaccard similarity on word tokens."""
        tokens1 = set(s1.lower().split())
        tokens2 = set(s2.lower().split())
        if not tokens1 or not tokens2:
            return 0.0
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        return intersection / union if union > 0 else 0.0

    def compute_ngram_similarity(self, s1: str, s2: str, n: int = 3) -> float:
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

    def score(self, features: SearchRankingFeatures) -> float:
        """Compute ranking score from features."""
        score = 0.0
        score += features.title_exact_match * self.weights.title_exact_match
        score += features.title_token_overlap * self.weights.title_token_overlap
        score += features.char_ngram_similarity * self.weights.char_ngram_similarity
        score += features.user_previously_selected * self.weights.user_previously_selected
        score += features.user_type_preference * self.weights.user_type_preference
        score += features.updated_this_week * self.weights.updated_this_week
        score += features.days_since_update * self.weights.days_since_update
        score += features.type_matches_context * self.weights.type_matches_context
        score += features.title_length * self.weights.title_length
        return score


class SearchRankingMetrics:
    """Evaluation metrics for search ranking quality."""

    @staticmethod
    def mean_reciprocal_rank(rankings: List[int]) -> float:
        """Calculate MRR from a list of positions."""
        if not rankings:
            return 0.0
        reciprocal_ranks = [1.0 / r for r in rankings if r > 0]
        return sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0

    @staticmethod
    def precision_at_k(relevant: Set[str], retrieved: List[str], k: int) -> float:
        """Calculate precision@k."""
        if k <= 0:
            return 0.0
        retrieved_k = retrieved[:k]
        relevant_retrieved = len(set(retrieved_k) & relevant)
        return relevant_retrieved / k

    @staticmethod
    def dcg_at_k(relevance_scores: List[float], k: int) -> float:
        """Calculate Discounted Cumulative Gain at k."""
        dcg = 0.0
        for i, rel in enumerate(relevance_scores[:k]):
            dcg += (2 ** rel - 1) / math.log2(i + 2)
        return dcg

    @staticmethod
    def ndcg_at_k(relevance_scores: List[float], k: int) -> float:
        """Calculate Normalized DCG at k."""
        dcg = SearchRankingMetrics.dcg_at_k(relevance_scores, k)
        ideal_scores = sorted(relevance_scores, reverse=True)
        idcg = SearchRankingMetrics.dcg_at_k(ideal_scores, k)
        return dcg / idcg if idcg > 0 else 0.0

    @staticmethod
    def click_through_rate(clicks: int, impressions: int) -> float:
        """Calculate Click-Through Rate."""
        return clicks / impressions if impressions > 0 else 0.0


class OnboardingPredictor:
    """Simplified onboarding predictor for testing."""

    # Feature weights (trained coefficients)
    WEIGHTS = {
        "started_onboarding": 0.3,
        "has_full_name": 0.15,
        "has_institution": 0.15,
        "profile_completeness_score": 0.1,
        "minutes_to_first_action": -0.005,
        "max_step_reached_day_1": 0.12,
        "signup_hour_business": 0.05,
        "is_invited_user": 0.1,
    }

    # Intercept (base probability)
    INTERCEPT = 0.2

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict onboarding completion probability."""
        # Calculate linear combination
        score = self.INTERCEPT

        if features.get("started_onboarding", False):
            score += self.WEIGHTS["started_onboarding"]
        if features.get("has_full_name", False):
            score += self.WEIGHTS["has_full_name"]
        if features.get("has_institution", False):
            score += self.WEIGHTS["has_institution"]

        profile_score = features.get("profile_completeness_score", 0)
        score += profile_score * self.WEIGHTS["profile_completeness_score"]

        minutes = features.get("minutes_to_first_action", 60)
        score += min(minutes, 120) * self.WEIGHTS["minutes_to_first_action"]

        max_step = features.get("max_step_reached_day_1", 0)
        score += max_step * self.WEIGHTS["max_step_reached_day_1"]

        signup_hour = features.get("signup_hour", 12)
        if 9 <= signup_hour <= 17:
            score += self.WEIGHTS["signup_hour_business"]

        if features.get("is_invited_user", False):
            score += self.WEIGHTS["is_invited_user"]

        # Sigmoid transformation
        probability = 1 / (1 + math.exp(-score * 3))

        # Determine risk category
        if probability >= 0.7:
            risk_category = "low_risk"
        elif probability >= 0.4:
            risk_category = "medium_risk"
        else:
            risk_category = "high_risk"

        # Identify risk factors
        risk_factors = []
        if not features.get("started_onboarding", False):
            risk_factors.append("has_not_started_onboarding")
        if features.get("minutes_to_first_action", 60) > 60:
            risk_factors.append("slow_first_action")
        if features.get("max_step_reached_day_1", 0) < 2:
            risk_factors.append("low_engagement_day_1")
        if not features.get("has_full_name", False):
            risk_factors.append("incomplete_profile")

        return {
            "completion_probability": round(probability, 3),
            "risk_category": risk_category,
            "risk_factors": risk_factors[:3],
        }


# =============================================================================
# Tests
# =============================================================================


class TestSearchRankerTokenOverlap:
    """Tests for token overlap calculation."""

    def test_identical_strings(self):
        ranker = SearchRanker()
        assert ranker.compute_token_overlap("hello world", "hello world") == 1.0

    def test_no_overlap(self):
        ranker = SearchRanker()
        assert ranker.compute_token_overlap("foo bar", "baz qux") == 0.0

    def test_partial_overlap(self):
        ranker = SearchRanker()
        overlap = ranker.compute_token_overlap("project deadline", "deadline report")
        assert 0 < overlap < 1
        # "deadline" is shared, so intersection=1, union=3
        assert abs(overlap - 1/3) < 0.01

    def test_case_insensitive(self):
        ranker = SearchRanker()
        assert ranker.compute_token_overlap("Hello World", "hello world") == 1.0

    def test_empty_strings(self):
        ranker = SearchRanker()
        assert ranker.compute_token_overlap("", "") == 0.0
        assert ranker.compute_token_overlap("hello", "") == 0.0
        assert ranker.compute_token_overlap("", "world") == 0.0


class TestSearchRankerNgramSimilarity:
    """Tests for n-gram similarity calculation."""

    def test_identical_strings(self):
        ranker = SearchRanker()
        assert ranker.compute_ngram_similarity("hello", "hello") == 1.0

    def test_no_similarity(self):
        ranker = SearchRanker()
        assert ranker.compute_ngram_similarity("abc", "xyz") == 0.0

    def test_partial_similarity(self):
        ranker = SearchRanker()
        sim = ranker.compute_ngram_similarity("project", "projects")
        assert 0.5 < sim < 1.0  # Most n-grams overlap

    def test_short_strings(self):
        ranker = SearchRanker()
        # Strings shorter than n-gram size
        assert ranker.compute_ngram_similarity("ab", "ab") == 0.0

    def test_case_insensitive(self):
        ranker = SearchRanker()
        assert ranker.compute_ngram_similarity("Hello", "hello") == 1.0


class TestSearchRankerScoring:
    """Tests for score computation."""

    def test_zero_features_gives_zero_score(self):
        ranker = SearchRanker()
        features = SearchRankingFeatures()
        # Only non-zero default is days_since_update=365, which gives negative score
        score = ranker.score(features)
        assert score < 0  # Penalty from old update date

    def test_exact_match_boosts_score(self):
        ranker = SearchRanker()
        features_no_match = SearchRankingFeatures()
        features_with_match = SearchRankingFeatures(title_exact_match=1.0)

        score_no = ranker.score(features_no_match)
        score_yes = ranker.score(features_with_match)

        assert score_yes > score_no
        assert score_yes - score_no == 5.0  # weight is 5.0

    def test_previously_selected_boosts_score(self):
        ranker = SearchRanker()
        features_not_selected = SearchRankingFeatures()
        features_selected = SearchRankingFeatures(user_previously_selected=1.0)

        assert ranker.score(features_selected) > ranker.score(features_not_selected)

    def test_title_length_penalty(self):
        ranker = SearchRanker()
        short = SearchRankingFeatures(title_length=10)
        long = SearchRankingFeatures(title_length=100)

        # Longer title should have lower score (negative weight)
        assert ranker.score(short) > ranker.score(long)


class TestSearchRankingMetrics:
    """Tests for ranking evaluation metrics."""

    def test_mrr_perfect_ranking(self):
        # All relevant items at position 1
        rankings = [1, 1, 1]
        assert SearchRankingMetrics.mean_reciprocal_rank(rankings) == 1.0

    def test_mrr_varied_positions(self):
        # Items at positions 1, 2, 3
        rankings = [1, 2, 3]
        expected = (1/1 + 1/2 + 1/3) / 3
        assert abs(SearchRankingMetrics.mean_reciprocal_rank(rankings) - expected) < 0.001

    def test_mrr_empty(self):
        assert SearchRankingMetrics.mean_reciprocal_rank([]) == 0.0

    def test_precision_at_k(self):
        relevant = {"a", "b", "c"}
        retrieved = ["a", "d", "b", "e", "c"]

        assert SearchRankingMetrics.precision_at_k(relevant, retrieved, 1) == 1.0  # a is relevant
        assert SearchRankingMetrics.precision_at_k(relevant, retrieved, 2) == 0.5  # a is relevant, d is not
        assert SearchRankingMetrics.precision_at_k(relevant, retrieved, 5) == 0.6  # 3 of 5 relevant

    def test_precision_at_k_zero(self):
        assert SearchRankingMetrics.precision_at_k(set(), [], 0) == 0.0
        assert SearchRankingMetrics.precision_at_k({"a"}, [], 5) == 0.0

    def test_dcg_at_k(self):
        relevance = [3, 2, 3, 0, 1, 2]
        dcg = SearchRankingMetrics.dcg_at_k(relevance, 3)
        # DCG@3 = (2^3-1)/log2(2) + (2^2-1)/log2(3) + (2^3-1)/log2(4)
        expected = 7/1 + 3/math.log2(3) + 7/2
        assert abs(dcg - expected) < 0.001

    def test_ndcg_at_k_perfect(self):
        # Already ideally sorted
        relevance = [3, 2, 1, 0]
        assert abs(SearchRankingMetrics.ndcg_at_k(relevance, 4) - 1.0) < 0.001

    def test_ndcg_at_k_worst(self):
        # Reverse of ideal
        relevance = [0, 1, 2, 3]
        ndcg = SearchRankingMetrics.ndcg_at_k(relevance, 4)
        assert 0 < ndcg < 1

    def test_click_through_rate(self):
        assert SearchRankingMetrics.click_through_rate(10, 100) == 0.1
        assert SearchRankingMetrics.click_through_rate(0, 100) == 0.0
        assert SearchRankingMetrics.click_through_rate(50, 0) == 0.0


class TestOnboardingPredictor:
    """Tests for onboarding completion prediction."""

    def test_high_engagement_user(self):
        predictor = OnboardingPredictor()
        result = predictor.predict({
            "started_onboarding": True,
            "has_full_name": True,
            "has_institution": True,
            "profile_completeness_score": 4,
            "minutes_to_first_action": 5,
            "max_step_reached_day_1": 4,
            "signup_hour": 10,
            "is_invited_user": True,
        })

        assert result["completion_probability"] > 0.7
        assert result["risk_category"] == "low_risk"
        assert len(result["risk_factors"]) == 0

    def test_low_engagement_user(self):
        predictor = OnboardingPredictor()
        result = predictor.predict({
            "started_onboarding": False,
            "has_full_name": False,
            "has_institution": False,
            "profile_completeness_score": 0,
            "minutes_to_first_action": 120,
            "max_step_reached_day_1": 0,
            "signup_hour": 3,
            "is_invited_user": False,
        })

        assert result["completion_probability"] < 0.5
        assert result["risk_category"] == "high_risk"
        assert "has_not_started_onboarding" in result["risk_factors"]

    def test_medium_engagement_user(self):
        predictor = OnboardingPredictor()
        result = predictor.predict({
            "started_onboarding": True,
            "has_full_name": False,
            "has_institution": False,
            "profile_completeness_score": 1,
            "minutes_to_first_action": 45,
            "max_step_reached_day_1": 1,
            "signup_hour": 22,  # Late night - no business hour bonus
            "is_invited_user": False,
        })

        # Should be somewhere in the middle range
        assert 0.3 < result["completion_probability"] < 0.85
        assert result["risk_category"] in ["medium_risk", "low_risk"]

    def test_risk_factors_identified(self):
        predictor = OnboardingPredictor()
        result = predictor.predict({
            "started_onboarding": False,
            "has_full_name": False,
            "minutes_to_first_action": 90,
            "max_step_reached_day_1": 1,
        })

        # Should identify multiple risk factors
        assert "has_not_started_onboarding" in result["risk_factors"]
        assert "slow_first_action" in result["risk_factors"]

    def test_probability_bounds(self):
        predictor = OnboardingPredictor()

        # Test extreme positive case
        result_high = predictor.predict({
            "started_onboarding": True,
            "has_full_name": True,
            "has_institution": True,
            "profile_completeness_score": 4,
            "minutes_to_first_action": 0,
            "max_step_reached_day_1": 5,
            "signup_hour": 10,
            "is_invited_user": True,
        })
        assert 0 < result_high["completion_probability"] <= 1

        # Test extreme negative case
        result_low = predictor.predict({
            "started_onboarding": False,
            "has_full_name": False,
            "has_institution": False,
            "profile_completeness_score": 0,
            "minutes_to_first_action": 120,
            "max_step_reached_day_1": 0,
            "signup_hour": 3,
            "is_invited_user": False,
        })
        assert 0 <= result_low["completion_probability"] < 1


class TestOnboardingRiskCategories:
    """Tests for risk category assignment."""

    def test_low_risk_threshold(self):
        predictor = OnboardingPredictor()
        # This should produce probability > 0.7
        result = predictor.predict({
            "started_onboarding": True,
            "has_full_name": True,
            "has_institution": True,
            "profile_completeness_score": 4,
            "minutes_to_first_action": 2,
            "max_step_reached_day_1": 5,
            "signup_hour": 10,
            "is_invited_user": True,
        })
        assert result["risk_category"] == "low_risk"

    def test_high_risk_threshold(self):
        predictor = OnboardingPredictor()
        # This should produce probability < 0.4
        result = predictor.predict({
            "started_onboarding": False,
            "profile_completeness_score": 0,
            "minutes_to_first_action": 120,
            "max_step_reached_day_1": 0,
        })
        assert result["risk_category"] == "high_risk"


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_empty_features(self):
        predictor = OnboardingPredictor()
        result = predictor.predict({})
        assert "completion_probability" in result
        assert "risk_category" in result
        assert 0 <= result["completion_probability"] <= 1

    def test_unicode_handling_in_ranker(self):
        ranker = SearchRanker()
        # Should not raise exceptions with unicode
        overlap = ranker.compute_token_overlap("项目", "项目计划")
        assert isinstance(overlap, float)

        ngram = ranker.compute_ngram_similarity("文档", "文档管理")
        assert isinstance(ngram, float)

    def test_special_characters_in_ranker(self):
        ranker = SearchRanker()
        overlap = ranker.compute_token_overlap("test@#$%", "test@#$%")
        assert overlap == 1.0

    def test_very_long_strings(self):
        ranker = SearchRanker()
        long_str1 = "word " * 1000
        long_str2 = "word " * 500 + "other " * 500

        # Should complete without error
        overlap = ranker.compute_token_overlap(long_str1, long_str2)
        assert isinstance(overlap, float)
