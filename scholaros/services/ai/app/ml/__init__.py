"""
Machine Learning Module for ScholarOS

This module provides ML models and services for:
- Onboarding completion prediction
- Search result ranking
- Feature validation and A/B testing
- Usage pattern analysis
"""

from app.ml.models.onboarding_predictor import OnboardingCompletionPredictor
from app.ml.models.search_ranker import SearchRanker, SearchRankingFeatures
from app.ml.services.recommendation_engine import RecommendationEngine

__all__ = [
    "OnboardingCompletionPredictor",
    "SearchRanker",
    "SearchRankingFeatures",
    "RecommendationEngine",
]
