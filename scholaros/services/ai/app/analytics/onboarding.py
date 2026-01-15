"""
Onboarding Funnel Analytics

Provides comprehensive analytics for user onboarding flows:
- Funnel conversion analysis by cohort
- Drop-off detection and analysis
- Completion time distribution
- Risk scoring for churn prediction
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import statistics


class FunnelStage(Enum):
    """Onboarding funnel stages."""
    SIGNUP = "signup"
    PROFILE_COMPLETE = "profile_complete"
    WORKSPACE_CREATED = "workspace_created"
    FIRST_TASK = "first_task"
    TUTORIAL_COMPLETE = "tutorial_complete"
    ACTIVATED = "activated"


@dataclass
class FunnelMetrics:
    """Metrics for a single funnel stage."""
    stage: FunnelStage
    entered_count: int = 0
    completed_count: int = 0
    dropped_count: int = 0
    median_time_seconds: float = 0.0
    p90_time_seconds: float = 0.0
    conversion_rate: float = 0.0

    def compute_conversion(self) -> None:
        """Compute conversion rate from counts."""
        if self.entered_count > 0:
            self.conversion_rate = self.completed_count / self.entered_count
        else:
            self.conversion_rate = 0.0


@dataclass
class OnboardingCohort:
    """A cohort of users for funnel analysis."""
    cohort_id: str
    start_date: datetime
    end_date: datetime
    user_ids: List[str] = field(default_factory=list)
    stage_metrics: Dict[FunnelStage, FunnelMetrics] = field(default_factory=dict)

    @property
    def size(self) -> int:
        return len(self.user_ids)

    @property
    def overall_completion_rate(self) -> float:
        """Return the overall funnel completion rate (signup to activated)."""
        signup_metrics = self.stage_metrics.get(FunnelStage.SIGNUP)
        activated_metrics = self.stage_metrics.get(FunnelStage.ACTIVATED)

        if not signup_metrics or signup_metrics.entered_count == 0:
            return 0.0
        if not activated_metrics:
            return 0.0

        return activated_metrics.completed_count / signup_metrics.entered_count


@dataclass
class DropOffAnalysis:
    """Analysis of drop-off at a specific stage."""
    stage: FunnelStage
    drop_off_rate: float
    avg_time_before_drop: float  # seconds
    common_last_actions: List[str]
    user_segments: Dict[str, float]  # segment -> drop-off rate


@dataclass
class OnboardingJourney:
    """A single user's onboarding journey."""
    user_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    current_stage: FunnelStage = FunnelStage.SIGNUP
    stage_timestamps: Dict[FunnelStage, datetime] = field(default_factory=dict)
    interactions_per_stage: Dict[FunnelStage, int] = field(default_factory=dict)
    is_complete: bool = False
    dropped_at_stage: Optional[FunnelStage] = None

    @property
    def total_duration_seconds(self) -> float:
        """Total time from start to completion or current time."""
        end = self.completed_at or datetime.utcnow()
        return (end - self.started_at).total_seconds()

    @property
    def stages_completed(self) -> int:
        """Number of stages completed."""
        return len(self.stage_timestamps)


class OnboardingFunnelAnalyzer:
    """
    Analyzes onboarding funnel performance.

    Features:
    - Cohort-based analysis
    - Stage-by-stage conversion tracking
    - Drop-off detection and analysis
    - Time-to-completion metrics
    """

    # Standard funnel stage order
    STAGE_ORDER = [
        FunnelStage.SIGNUP,
        FunnelStage.PROFILE_COMPLETE,
        FunnelStage.WORKSPACE_CREATED,
        FunnelStage.FIRST_TASK,
        FunnelStage.TUTORIAL_COMPLETE,
        FunnelStage.ACTIVATED,
    ]

    def __init__(self):
        self.cohorts: Dict[str, OnboardingCohort] = {}
        self.journeys: Dict[str, OnboardingJourney] = {}

    def create_cohort(
        self,
        cohort_id: str,
        start_date: datetime,
        end_date: datetime,
        user_ids: List[str],
    ) -> OnboardingCohort:
        """
        Create a new cohort for analysis.

        Args:
            cohort_id: Unique identifier for the cohort
            start_date: Cohort start date
            end_date: Cohort end date
            user_ids: List of user IDs in this cohort

        Returns:
            Created OnboardingCohort
        """
        cohort = OnboardingCohort(
            cohort_id=cohort_id,
            start_date=start_date,
            end_date=end_date,
            user_ids=user_ids,
        )

        # Initialize stage metrics
        for stage in self.STAGE_ORDER:
            cohort.stage_metrics[stage] = FunnelMetrics(stage=stage)

        self.cohorts[cohort_id] = cohort
        return cohort

    def analyze_cohort(
        self,
        cohort_id: str,
        events: List[Dict[str, Any]],
    ) -> OnboardingCohort:
        """
        Analyze a cohort's funnel performance from events.

        Args:
            cohort_id: Cohort to analyze
            events: List of onboarding events with user_id, event_name, timestamp

        Returns:
            Updated OnboardingCohort with metrics
        """
        cohort = self.cohorts.get(cohort_id)
        if not cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        # Build user journeys from events
        user_journeys: Dict[str, OnboardingJourney] = {}

        for event in events:
            user_id = event.get("user_id")
            if user_id not in cohort.user_ids:
                continue

            if user_id not in user_journeys:
                user_journeys[user_id] = OnboardingJourney(
                    user_id=user_id,
                    started_at=datetime.fromisoformat(event["timestamp"]),
                )

            journey = user_journeys[user_id]
            self._process_event(journey, event)

        # Compute stage metrics
        stage_times: Dict[FunnelStage, List[float]] = {s: [] for s in self.STAGE_ORDER}

        for journey in user_journeys.values():
            for i, stage in enumerate(self.STAGE_ORDER):
                if stage in journey.stage_timestamps:
                    cohort.stage_metrics[stage].entered_count += 1
                    cohort.stage_metrics[stage].completed_count += 1

                    # Compute time in stage
                    if i > 0:
                        prev_stage = self.STAGE_ORDER[i - 1]
                        if prev_stage in journey.stage_timestamps:
                            time_in_stage = (
                                journey.stage_timestamps[stage] -
                                journey.stage_timestamps[prev_stage]
                            ).total_seconds()
                            stage_times[stage].append(time_in_stage)
                else:
                    # User dropped before this stage
                    if i > 0 and self.STAGE_ORDER[i - 1] in journey.stage_timestamps:
                        cohort.stage_metrics[stage].dropped_count += 1
                    break

        # Compute time percentiles
        for stage, times in stage_times.items():
            if times:
                sorted_times = sorted(times)
                cohort.stage_metrics[stage].median_time_seconds = statistics.median(times)
                p90_idx = int(len(sorted_times) * 0.9)
                cohort.stage_metrics[stage].p90_time_seconds = sorted_times[p90_idx]

        # Compute conversion rates
        for stage in self.STAGE_ORDER:
            cohort.stage_metrics[stage].compute_conversion()

        return cohort

    def _process_event(
        self,
        journey: OnboardingJourney,
        event: Dict[str, Any],
    ) -> None:
        """Process a single event and update the journey."""
        event_name = event.get("event_name", "")
        timestamp = datetime.fromisoformat(event["timestamp"])

        # Map event names to stages
        stage_map = {
            "onboarding_started": FunnelStage.SIGNUP,
            "profile_completed": FunnelStage.PROFILE_COMPLETE,
            "workspace_created": FunnelStage.WORKSPACE_CREATED,
            "first_task_created": FunnelStage.FIRST_TASK,
            "tutorial_completed": FunnelStage.TUTORIAL_COMPLETE,
            "onboarding_completed": FunnelStage.ACTIVATED,
        }

        stage = stage_map.get(event_name)
        if stage:
            journey.stage_timestamps[stage] = timestamp
            journey.current_stage = stage

            if stage == FunnelStage.ACTIVATED:
                journey.is_complete = True
                journey.completed_at = timestamp

        # Track interactions
        if journey.current_stage:
            current = journey.interactions_per_stage.get(journey.current_stage, 0)
            journey.interactions_per_stage[journey.current_stage] = current + 1

    def identify_drop_offs(
        self,
        cohort_id: str,
        threshold: float = 0.2,
    ) -> List[DropOffAnalysis]:
        """
        Identify stages with significant drop-off.

        Args:
            cohort_id: Cohort to analyze
            threshold: Drop-off rate threshold to flag (default 20%)

        Returns:
            List of DropOffAnalysis for problematic stages
        """
        cohort = self.cohorts.get(cohort_id)
        if not cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        drop_offs = []

        for i, stage in enumerate(self.STAGE_ORDER[1:], 1):
            prev_stage = self.STAGE_ORDER[i - 1]
            prev_metrics = cohort.stage_metrics[prev_stage]
            curr_metrics = cohort.stage_metrics[stage]

            if prev_metrics.completed_count > 0:
                drop_off_rate = 1.0 - (
                    curr_metrics.completed_count / prev_metrics.completed_count
                )

                if drop_off_rate >= threshold:
                    drop_offs.append(DropOffAnalysis(
                        stage=stage,
                        drop_off_rate=drop_off_rate,
                        avg_time_before_drop=prev_metrics.p90_time_seconds,
                        common_last_actions=[],  # Would need event analysis
                        user_segments={},  # Would need segmentation data
                    ))

        return drop_offs

    def compare_cohorts(
        self,
        cohort_ids: List[str],
    ) -> Dict[str, Dict[FunnelStage, float]]:
        """
        Compare conversion rates across cohorts.

        Args:
            cohort_ids: List of cohort IDs to compare

        Returns:
            Dict mapping cohort_id to stage conversion rates
        """
        comparison = {}

        for cohort_id in cohort_ids:
            cohort = self.cohorts.get(cohort_id)
            if not cohort:
                continue

            comparison[cohort_id] = {
                stage: metrics.conversion_rate
                for stage, metrics in cohort.stage_metrics.items()
            }

        return comparison

    def get_funnel_summary(
        self,
        cohort_id: str,
    ) -> Dict[str, Any]:
        """
        Get a summary of funnel performance.

        Args:
            cohort_id: Cohort to summarize

        Returns:
            Summary dict with key metrics
        """
        cohort = self.cohorts.get(cohort_id)
        if not cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        # Find the biggest drop-off
        max_drop_stage = None
        max_drop_rate = 0.0

        for i, stage in enumerate(self.STAGE_ORDER[1:], 1):
            prev_stage = self.STAGE_ORDER[i - 1]
            prev_count = cohort.stage_metrics[prev_stage].completed_count
            curr_count = cohort.stage_metrics[stage].completed_count

            if prev_count > 0:
                drop_rate = 1.0 - (curr_count / prev_count)
                if drop_rate > max_drop_rate:
                    max_drop_rate = drop_rate
                    max_drop_stage = stage

        return {
            "cohort_id": cohort_id,
            "cohort_size": cohort.size,
            "date_range": {
                "start": cohort.start_date.isoformat(),
                "end": cohort.end_date.isoformat(),
            },
            "overall_completion_rate": cohort.overall_completion_rate,
            "biggest_drop_off": {
                "stage": max_drop_stage.value if max_drop_stage else None,
                "rate": max_drop_rate,
            },
            "stage_metrics": {
                stage.value: {
                    "entered": metrics.entered_count,
                    "completed": metrics.completed_count,
                    "conversion_rate": metrics.conversion_rate,
                    "median_time_seconds": metrics.median_time_seconds,
                }
                for stage, metrics in cohort.stage_metrics.items()
            },
        }

    def calculate_time_to_value(
        self,
        journeys: List[OnboardingJourney],
        value_stage: FunnelStage = FunnelStage.FIRST_TASK,
    ) -> Dict[str, float]:
        """
        Calculate time-to-value metrics.

        Args:
            journeys: List of user journeys
            value_stage: Stage considered as "first value"

        Returns:
            Dict with time metrics (median, p75, p90)
        """
        times = []

        for journey in journeys:
            if value_stage in journey.stage_timestamps:
                time_to_value = (
                    journey.stage_timestamps[value_stage] - journey.started_at
                ).total_seconds()
                times.append(time_to_value)

        if not times:
            return {"median": 0, "p75": 0, "p90": 0, "count": 0}

        sorted_times = sorted(times)
        return {
            "median": statistics.median(times),
            "p75": sorted_times[int(len(sorted_times) * 0.75)],
            "p90": sorted_times[int(len(sorted_times) * 0.90)],
            "count": len(times),
        }
