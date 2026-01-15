"""
Analytics API Router

Provides ML/analytics endpoints for Phase 9B:
- Onboarding prediction
- Search ranking
- Funnel analysis
- A/B test analysis
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml.models.onboarding_predictor import (
    OnboardingCompletionPredictor,
    PredictionResult,
)
from app.ml.models.search_ranker import (
    SearchRanker,
    SearchResult,
    SearchContext,
    RankingWeights,
)
from app.analytics.onboarding import (
    OnboardingFunnelAnalyzer,
    FunnelStage,
)
from app.analytics.ab_testing import (
    ABTestAnalyzer,
    ExperimentConfig,
    Variant,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Initialize services
onboarding_predictor = OnboardingCompletionPredictor()
search_ranker = SearchRanker()
funnel_analyzer = OnboardingFunnelAnalyzer()
ab_analyzer = ABTestAnalyzer()


# ============================================================================
# Request/Response Models
# ============================================================================


class OnboardingPredictionRequest(BaseModel):
    """Request for onboarding completion prediction."""
    user_id: str
    started_onboarding: bool = False
    has_full_name: bool = False
    has_institution: bool = False
    profile_completeness_score: int = Field(default=0, ge=0, le=4)
    minutes_to_first_action: float = 60.0
    max_step_reached_day_1: int = Field(default=0, ge=0, le=5)
    signup_hour: int = Field(default=12, ge=0, le=23)
    signup_day_of_week: int = Field(default=1, ge=0, le=6)
    is_invited_user: bool = False


class OnboardingPredictionResponse(BaseModel):
    """Response with onboarding prediction."""
    user_id: str
    completion_probability: float
    risk_category: str
    top_risk_factors: List[str]
    recommended_interventions: List[Dict[str, str]]


class SearchRankingRequest(BaseModel):
    """Request for search ranking."""
    query: str
    results: List[Dict[str, Any]]
    user_history: List[Dict[str, Any]] = []
    context: Dict[str, Any] = {}


class SearchRankingResponse(BaseModel):
    """Response with ranked search results."""
    ranked_results: List[Dict[str, Any]]
    query: str
    total_results: int


class FunnelAnalysisRequest(BaseModel):
    """Request for funnel analysis."""
    cohort_id: str
    start_date: str  # ISO format
    end_date: str  # ISO format
    user_data: List[Dict[str, Any]]


class FunnelAnalysisResponse(BaseModel):
    """Response with funnel metrics."""
    cohort_id: str
    cohort_size: int
    overall_completion_rate: float
    stage_metrics: Dict[str, Dict[str, Any]]


class ABTestResultRequest(BaseModel):
    """Request for A/B test analysis."""
    experiment_id: str
    control_data: List[float]
    treatment_data: List[float]
    alpha: float = 0.05


class ABTestResultResponse(BaseModel):
    """Response with A/B test results."""
    experiment_id: str
    control_rate: float
    treatment_rate: float
    lift: float
    lift_ci: List[float]
    p_value: float
    is_significant: bool
    recommendation: str
    sample_sizes: Dict[str, int]


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/onboarding/predict", response_model=OnboardingPredictionResponse)
async def predict_onboarding_completion(
    request: OnboardingPredictionRequest,
) -> OnboardingPredictionResponse:
    """
    Predict probability of onboarding completion for a user.

    Returns risk category and recommended interventions.
    """
    try:
        result = onboarding_predictor.predict(request.model_dump())

        return OnboardingPredictionResponse(
            user_id=result.user_id,
            completion_probability=result.completion_probability,
            risk_category=result.risk_category,
            top_risk_factors=result.top_risk_factors,
            recommended_interventions=[
                {
                    "action": i.action,
                    "message": i.message,
                    "priority": i.priority,
                }
                for i in result.recommended_interventions
            ],
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}",
        )


@router.post("/search/rank", response_model=SearchRankingResponse)
async def rank_search_results(
    request: SearchRankingRequest,
) -> SearchRankingResponse:
    """
    Rank search results using ML-based scoring.

    Considers relevance, personalization, and context.
    """
    try:
        # Convert request data to SearchResult objects
        results = [
            SearchResult(
                id=r.get("id", ""),
                title=r.get("title", ""),
                result_type=r.get("type", "task"),
                updated_at=r.get("updated_at"),
                metadata=r,
            )
            for r in request.results
        ]

        # Build context
        context = SearchContext(
            user_id=request.context.get("user_id", "anonymous"),
            workspace_id=request.context.get("workspace_id"),
            query=request.query,
            page_context=request.context.get("page_context", "/today"),
        )

        # Rank results
        ranked = search_ranker.rank(
            results=results,
            query=request.query,
            user_history=request.user_history,
            context=context,
        )

        # Convert back to response format
        ranked_results = [
            {
                **r.metadata,
                "id": r.id,
                "title": r.title,
                "type": r.result_type,
                "_score": r.score,
                "_features": {
                    "title_exact_match": r.features.title_exact_match if r.features else 0,
                    "title_token_overlap": r.features.title_token_overlap if r.features else 0,
                    "user_previously_selected": r.features.user_previously_selected if r.features else 0,
                }
                if r.features
                else {},
            }
            for r in ranked
        ]

        return SearchRankingResponse(
            ranked_results=ranked_results,
            query=request.query,
            total_results=len(ranked_results),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ranking failed: {str(e)}",
        )


@router.post("/funnel/analyze", response_model=FunnelAnalysisResponse)
async def analyze_onboarding_funnel(
    request: FunnelAnalysisRequest,
) -> FunnelAnalysisResponse:
    """
    Analyze onboarding funnel metrics for a cohort.

    Returns conversion rates and drop-off analysis per stage.
    """
    try:
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date)
        end_date = datetime.fromisoformat(request.end_date)

        # Extract user IDs
        user_ids = [u.get("user_id", "") for u in request.user_data if u.get("user_id")]

        # Create cohort
        cohort = funnel_analyzer.create_cohort(
            cohort_id=request.cohort_id,
            start_date=start_date,
            end_date=end_date,
            user_ids=user_ids,
        )

        # Convert user_data to events format for analyze_cohort
        events = []
        for user_data in request.user_data:
            user_id = user_data.get("user_id")
            if not user_id:
                continue

            # Convert stages_completed to events
            stage_timestamps = user_data.get("stage_timestamps", {})
            for stage_name, timestamp in stage_timestamps.items():
                events.append({
                    "user_id": user_id,
                    "event_name": stage_name,
                    "timestamp": timestamp,
                })

        # Analyze the cohort with events
        cohort = funnel_analyzer.analyze_cohort(
            cohort_id=request.cohort_id,
            events=events,
        )

        # Format response
        stage_metrics = {}
        for stage, m in cohort.stage_metrics.items():
            stage_metrics[stage.value] = {
                "entered_count": m.entered_count,
                "completed_count": m.completed_count,
                "dropped_count": m.dropped_count,
                "conversion_rate": m.conversion_rate,
                "median_time_seconds": m.median_time_seconds,
            }

        return FunnelAnalysisResponse(
            cohort_id=cohort.cohort_id,
            cohort_size=cohort.size,
            overall_completion_rate=cohort.overall_completion_rate,
            stage_metrics=stage_metrics,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Funnel analysis failed: {str(e)}",
        )


@router.post("/abtest/analyze", response_model=ABTestResultResponse)
async def analyze_ab_test(
    request: ABTestResultRequest,
) -> ABTestResultResponse:
    """
    Analyze A/B test results with statistical significance.

    Returns lift, confidence intervals, and recommendation.
    """
    try:
        from app.analytics.ab_testing import ABTestAnalyzer
        import statistics
        import math

        control = request.control_data
        treatment = request.treatment_data

        if len(control) < 10 or len(treatment) < 10:
            raise HTTPException(
                status_code=400,
                detail="Insufficient sample size (minimum 10 per group)",
            )

        # Calculate basic statistics
        control_mean = statistics.mean(control)
        treatment_mean = statistics.mean(treatment)

        control_std = statistics.stdev(control) if len(control) > 1 else 0
        treatment_std = statistics.stdev(treatment) if len(treatment) > 1 else 0

        # For binary metrics, treat as conversion rates
        control_rate = sum(1 for v in control if v > 0) / len(control)
        treatment_rate = sum(1 for v in treatment if v > 0) / len(treatment)

        # Calculate lift
        lift = (treatment_rate - control_rate) / control_rate if control_rate > 0 else 0

        # Standard error for difference in proportions
        n_c, n_t = len(control), len(treatment)
        se = math.sqrt(
            (control_rate * (1 - control_rate) / n_c) +
            (treatment_rate * (1 - treatment_rate) / n_t)
        ) if control_rate > 0 and treatment_rate > 0 else 0.1

        # Z-score
        z = (treatment_rate - control_rate) / se if se > 0 else 0

        # P-value (two-tailed)
        # Using normal approximation
        p_value = 2 * (1 - _norm_cdf(abs(z)))

        # Confidence interval for lift
        z_alpha = 1.96  # 95% CI
        lift_se = se / control_rate if control_rate > 0 else 0
        lift_ci_lower = lift - z_alpha * lift_se
        lift_ci_upper = lift + z_alpha * lift_se

        # Determine significance
        is_significant = p_value < request.alpha

        # Generate recommendation
        if not is_significant:
            recommendation = "continue"
        elif lift > 0:
            recommendation = "ship"
        else:
            recommendation = "drop"

        return ABTestResultResponse(
            experiment_id=request.experiment_id,
            control_rate=control_rate,
            treatment_rate=treatment_rate,
            lift=lift,
            lift_ci=[lift_ci_lower, lift_ci_upper],
            p_value=p_value,
            is_significant=is_significant,
            recommendation=recommendation,
            sample_sizes={"control": n_c, "treatment": n_t},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"A/B test analysis failed: {str(e)}",
        )


@router.get("/feature-importance")
async def get_feature_importance():
    """
    Get feature importance for the onboarding prediction model.

    Returns ranked list of features and their importance scores.
    """
    try:
        importance = onboarding_predictor.get_feature_importance()
        return {"features": importance}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get feature importance: {str(e)}",
        )


@router.get("/health")
async def analytics_health():
    """Health check for analytics service."""
    return {
        "status": "healthy",
        "models": {
            "onboarding_predictor": "active",
            "search_ranker": "active",
        },
        "analyzers": {
            "funnel": "active",
            "ab_testing": "active",
        },
    }


# ============================================================================
# Helper Functions
# ============================================================================


def _norm_cdf(x: float) -> float:
    """Standard normal CDF approximation."""
    import math
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0
