"""
Analytics Module

Provides analytics and experimentation capabilities for ScholarOS:
- Onboarding funnel analysis and prediction
- Feature validation framework with statistical testing
- A/B testing utilities
"""

from .onboarding import (
    OnboardingFunnelAnalyzer,
    OnboardingCohort,
    FunnelStage,
    FunnelMetrics,
)
from .validation import (
    FeatureValidator,
    ValidationResult,
    MetricDefinition,
    StatisticalTest,
)
from .ab_testing import (
    ABTestAnalyzer,
    ExperimentConfig,
    ExperimentResult,
    VariantMetrics,
)

__all__ = [
    # Onboarding
    "OnboardingFunnelAnalyzer",
    "OnboardingCohort",
    "FunnelStage",
    "FunnelMetrics",
    # Validation
    "FeatureValidator",
    "ValidationResult",
    "MetricDefinition",
    "StatisticalTest",
    # A/B Testing
    "ABTestAnalyzer",
    "ExperimentConfig",
    "ExperimentResult",
    "VariantMetrics",
]
