"""
Feature Validation Framework

Statistical validation for feature launches:
- Metric comparison with baseline
- Multiple comparison correction (Bonferroni)
- Power analysis and sample size estimation
- Anomaly detection for metric degradation
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable, Tuple
from enum import Enum
import math
import statistics


class StatisticalTest(Enum):
    """Available statistical tests."""
    T_TEST = "t_test"
    MANN_WHITNEY = "mann_whitney"
    CHI_SQUARE = "chi_square"
    PROPORTION_Z = "proportion_z"


class MetricType(Enum):
    """Types of metrics."""
    CONTINUOUS = "continuous"
    PROPORTION = "proportion"
    COUNT = "count"
    RATE = "rate"


@dataclass
class MetricDefinition:
    """Definition of a metric to validate."""
    name: str
    metric_type: MetricType
    expected_direction: str  # "increase", "decrease", "neutral"
    minimum_detectable_effect: float  # Relative change (e.g., 0.05 = 5%)
    baseline_value: Optional[float] = None
    baseline_std: Optional[float] = None
    is_primary: bool = False
    description: str = ""


@dataclass
class ValidationResult:
    """Result of a single metric validation."""
    metric_name: str
    baseline_value: float
    treatment_value: float
    absolute_change: float
    relative_change: float
    p_value: float
    adjusted_p_value: float  # After Bonferroni correction
    is_significant: bool
    confidence_interval: Tuple[float, float]
    sample_size_baseline: int
    sample_size_treatment: int
    test_used: StatisticalTest
    passed: bool  # True if metric meets expectations
    notes: str = ""


@dataclass
class FeatureValidationReport:
    """Complete validation report for a feature."""
    feature_name: str
    validation_date: datetime
    metrics: List[ValidationResult]
    overall_passed: bool
    primary_metrics_passed: bool
    guardrail_metrics_passed: bool
    sample_size_adequate: bool
    recommendations: List[str]
    raw_data_summary: Dict[str, Any] = field(default_factory=dict)


class FeatureValidator:
    """
    Validates feature launches with statistical rigor.

    Features:
    - Multiple metric validation
    - Bonferroni correction for multiple comparisons
    - Power analysis
    - Guardrail metric monitoring
    """

    DEFAULT_ALPHA = 0.05
    DEFAULT_POWER = 0.80

    def __init__(
        self,
        alpha: float = DEFAULT_ALPHA,
        power: float = DEFAULT_POWER,
    ):
        """
        Initialize the validator.

        Args:
            alpha: Significance level (default 0.05)
            power: Statistical power target (default 0.80)
        """
        self.alpha = alpha
        self.power = power
        self.metrics: Dict[str, MetricDefinition] = {}
        self.guardrails: Dict[str, MetricDefinition] = {}

    def register_metric(
        self,
        name: str,
        metric_type: MetricType,
        expected_direction: str,
        minimum_detectable_effect: float,
        is_primary: bool = False,
        baseline_value: Optional[float] = None,
        baseline_std: Optional[float] = None,
        description: str = "",
    ) -> None:
        """
        Register a metric for validation.

        Args:
            name: Metric name
            metric_type: Type of metric
            expected_direction: Expected change direction
            minimum_detectable_effect: Minimum relative change to detect
            is_primary: Whether this is a primary success metric
            baseline_value: Historical baseline value
            baseline_std: Historical standard deviation
            description: Metric description
        """
        self.metrics[name] = MetricDefinition(
            name=name,
            metric_type=metric_type,
            expected_direction=expected_direction,
            minimum_detectable_effect=minimum_detectable_effect,
            is_primary=is_primary,
            baseline_value=baseline_value,
            baseline_std=baseline_std,
            description=description,
        )

    def register_guardrail(
        self,
        name: str,
        metric_type: MetricType,
        threshold: float,
        baseline_value: Optional[float] = None,
        description: str = "",
    ) -> None:
        """
        Register a guardrail metric (must not degrade).

        Args:
            name: Metric name
            metric_type: Type of metric
            threshold: Maximum acceptable degradation (relative)
            baseline_value: Historical baseline value
            description: Metric description
        """
        self.guardrails[name] = MetricDefinition(
            name=name,
            metric_type=metric_type,
            expected_direction="neutral",
            minimum_detectable_effect=threshold,
            baseline_value=baseline_value,
            description=description,
        )

    def validate(
        self,
        feature_name: str,
        baseline_data: Dict[str, List[float]],
        treatment_data: Dict[str, List[float]],
    ) -> FeatureValidationReport:
        """
        Validate a feature launch.

        Args:
            feature_name: Name of the feature being validated
            baseline_data: Dict mapping metric names to baseline values
            treatment_data: Dict mapping metric names to treatment values

        Returns:
            FeatureValidationReport with all results
        """
        results: List[ValidationResult] = []
        total_tests = len(self.metrics) + len(self.guardrails)
        adjusted_alpha = self.alpha / total_tests if total_tests > 0 else self.alpha

        # Validate primary and secondary metrics
        for metric_name, metric_def in self.metrics.items():
            if metric_name not in baseline_data or metric_name not in treatment_data:
                continue

            result = self._validate_metric(
                metric_def,
                baseline_data[metric_name],
                treatment_data[metric_name],
                adjusted_alpha,
            )
            results.append(result)

        # Validate guardrail metrics
        guardrail_results: List[ValidationResult] = []
        for metric_name, metric_def in self.guardrails.items():
            if metric_name not in baseline_data or metric_name not in treatment_data:
                continue

            result = self._validate_guardrail(
                metric_def,
                baseline_data[metric_name],
                treatment_data[metric_name],
                adjusted_alpha,
            )
            guardrail_results.append(result)
            results.append(result)

        # Determine overall status
        primary_results = [r for r in results if self.metrics.get(r.metric_name, MetricDefinition("", MetricType.CONTINUOUS, "", 0)).is_primary]
        primary_passed = all(r.passed for r in primary_results) if primary_results else True
        guardrails_passed = all(r.passed for r in guardrail_results)

        # Check sample sizes
        min_sample = min(
            min(len(baseline_data.get(m, [])), len(treatment_data.get(m, [])))
            for m in list(self.metrics.keys()) + list(self.guardrails.keys())
            if m in baseline_data and m in treatment_data
        ) if baseline_data and treatment_data else 0

        sample_adequate = min_sample >= self._estimate_required_sample_size()

        # Generate recommendations
        recommendations = self._generate_recommendations(
            results, primary_passed, guardrails_passed, sample_adequate
        )

        return FeatureValidationReport(
            feature_name=feature_name,
            validation_date=datetime.utcnow(),
            metrics=results,
            overall_passed=primary_passed and guardrails_passed,
            primary_metrics_passed=primary_passed,
            guardrail_metrics_passed=guardrails_passed,
            sample_size_adequate=sample_adequate,
            recommendations=recommendations,
        )

    def _validate_metric(
        self,
        metric_def: MetricDefinition,
        baseline_values: List[float],
        treatment_values: List[float],
        adjusted_alpha: float,
    ) -> ValidationResult:
        """Validate a single metric."""
        baseline_mean = statistics.mean(baseline_values)
        treatment_mean = statistics.mean(treatment_values)

        absolute_change = treatment_mean - baseline_mean
        relative_change = absolute_change / baseline_mean if baseline_mean != 0 else 0

        # Perform appropriate test
        if metric_def.metric_type == MetricType.PROPORTION:
            p_value, ci = self._proportion_z_test(baseline_values, treatment_values)
            test_used = StatisticalTest.PROPORTION_Z
        else:
            p_value, ci = self._t_test(baseline_values, treatment_values)
            test_used = StatisticalTest.T_TEST

        is_significant = p_value < adjusted_alpha

        # Determine if metric passed
        passed = self._check_metric_passed(
            metric_def, relative_change, is_significant
        )

        return ValidationResult(
            metric_name=metric_def.name,
            baseline_value=baseline_mean,
            treatment_value=treatment_mean,
            absolute_change=absolute_change,
            relative_change=relative_change,
            p_value=p_value,
            adjusted_p_value=min(p_value * (len(self.metrics) + len(self.guardrails)), 1.0),
            is_significant=is_significant,
            confidence_interval=ci,
            sample_size_baseline=len(baseline_values),
            sample_size_treatment=len(treatment_values),
            test_used=test_used,
            passed=passed,
        )

    def _validate_guardrail(
        self,
        metric_def: MetricDefinition,
        baseline_values: List[float],
        treatment_values: List[float],
        adjusted_alpha: float,
    ) -> ValidationResult:
        """Validate a guardrail metric (must not degrade)."""
        result = self._validate_metric(
            metric_def, baseline_values, treatment_values, adjusted_alpha
        )

        # Guardrail passes if there's no significant degradation
        threshold = metric_def.minimum_detectable_effect
        degraded = result.relative_change < -threshold and result.is_significant

        result.passed = not degraded
        if degraded:
            result.notes = f"Guardrail violated: {result.relative_change:.2%} degradation"

        return result

    def _check_metric_passed(
        self,
        metric_def: MetricDefinition,
        relative_change: float,
        is_significant: bool,
    ) -> bool:
        """Check if a metric meets its expected outcome."""
        if metric_def.expected_direction == "increase":
            return relative_change > 0 and (
                not is_significant or relative_change >= metric_def.minimum_detectable_effect
            )
        elif metric_def.expected_direction == "decrease":
            return relative_change < 0 and (
                not is_significant or abs(relative_change) >= metric_def.minimum_detectable_effect
            )
        else:  # neutral
            return abs(relative_change) < metric_def.minimum_detectable_effect

    def _t_test(
        self,
        group1: List[float],
        group2: List[float],
    ) -> Tuple[float, Tuple[float, float]]:
        """
        Perform Welch's t-test.

        Returns (p_value, confidence_interval)
        """
        n1, n2 = len(group1), len(group2)
        if n1 < 2 or n2 < 2:
            return 1.0, (0.0, 0.0)

        mean1 = statistics.mean(group1)
        mean2 = statistics.mean(group2)
        var1 = statistics.variance(group1)
        var2 = statistics.variance(group2)

        # Welch's t-test
        se = math.sqrt(var1 / n1 + var2 / n2)
        if se == 0:
            return 1.0, (mean2 - mean1, mean2 - mean1)

        t_stat = (mean2 - mean1) / se

        # Approximate degrees of freedom (Welch-Satterthwaite)
        num = (var1 / n1 + var2 / n2) ** 2
        denom = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)
        df = num / denom if denom > 0 else 1

        # Approximate p-value using normal distribution (for large samples)
        # In production, use scipy.stats.t.sf
        p_value = 2 * (1 - self._normal_cdf(abs(t_stat)))

        # 95% CI for difference
        margin = 1.96 * se
        ci = (mean2 - mean1 - margin, mean2 - mean1 + margin)

        return p_value, ci

    def _proportion_z_test(
        self,
        group1: List[float],
        group2: List[float],
    ) -> Tuple[float, Tuple[float, float]]:
        """
        Perform two-proportion z-test.

        Assumes values are 0 or 1.
        Returns (p_value, confidence_interval)
        """
        n1, n2 = len(group1), len(group2)
        if n1 == 0 or n2 == 0:
            return 1.0, (0.0, 0.0)

        p1 = sum(group1) / n1
        p2 = sum(group2) / n2

        # Pooled proportion
        p_pool = (sum(group1) + sum(group2)) / (n1 + n2)

        # Standard error
        se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
        if se == 0:
            return 1.0, (p2 - p1, p2 - p1)

        z_stat = (p2 - p1) / se
        p_value = 2 * (1 - self._normal_cdf(abs(z_stat)))

        # 95% CI for difference
        se_ci = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
        margin = 1.96 * se_ci
        ci = (p2 - p1 - margin, p2 - p1 + margin)

        return p_value, ci

    def _normal_cdf(self, x: float) -> float:
        """Approximate standard normal CDF."""
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def _estimate_required_sample_size(self) -> int:
        """
        Estimate required sample size for the registered metrics.

        Uses the smallest MDE among primary metrics.
        """
        primary_metrics = [m for m in self.metrics.values() if m.is_primary]
        if not primary_metrics:
            return 100  # Default minimum

        min_mde = min(m.minimum_detectable_effect for m in primary_metrics)

        # Sample size formula for two-sample t-test
        # n = 2 * ((z_alpha + z_beta) / delta)^2 * sigma^2
        # Simplified approximation
        z_alpha = 1.96  # Two-sided alpha = 0.05
        z_beta = 0.84   # Power = 0.80

        # Assume standardized effect size
        n_per_group = int(2 * ((z_alpha + z_beta) / min_mde) ** 2)
        return max(n_per_group, 100)

    def _generate_recommendations(
        self,
        results: List[ValidationResult],
        primary_passed: bool,
        guardrails_passed: bool,
        sample_adequate: bool,
    ) -> List[str]:
        """Generate actionable recommendations from results."""
        recommendations = []

        if not sample_adequate:
            recommendations.append(
                "Sample size is below recommended threshold. "
                "Consider extending the validation period."
            )

        if not guardrails_passed:
            failed_guardrails = [r for r in results if not r.passed and r.metric_name in self.guardrails]
            for r in failed_guardrails:
                recommendations.append(
                    f"Guardrail '{r.metric_name}' violated with {r.relative_change:.2%} change. "
                    "Investigate root cause before proceeding."
                )

        if not primary_passed:
            failed_primary = [
                r for r in results
                if not r.passed and self.metrics.get(r.metric_name, MetricDefinition("", MetricType.CONTINUOUS, "", 0)).is_primary
            ]
            for r in failed_primary:
                recommendations.append(
                    f"Primary metric '{r.metric_name}' did not meet expectations "
                    f"(change: {r.relative_change:.2%}, p={r.p_value:.4f}). "
                    "Consider iterating on the feature."
                )

        if primary_passed and guardrails_passed and sample_adequate:
            recommendations.append(
                "All validation criteria met. Feature is ready for broader rollout."
            )

        return recommendations


def calculate_sample_size(
    baseline_rate: float,
    minimum_detectable_effect: float,
    alpha: float = 0.05,
    power: float = 0.80,
) -> int:
    """
    Calculate required sample size per group.

    Args:
        baseline_rate: Baseline conversion/success rate
        minimum_detectable_effect: Relative change to detect
        alpha: Significance level
        power: Statistical power

    Returns:
        Required sample size per group
    """
    # Z-scores
    z_alpha = 1.96 if alpha == 0.05 else 2.576  # Simplified
    z_beta = 0.84 if power == 0.80 else 1.28

    p1 = baseline_rate
    p2 = baseline_rate * (1 + minimum_detectable_effect)

    # Pooled proportion
    p_bar = (p1 + p2) / 2

    # Sample size formula
    numerator = (z_alpha * math.sqrt(2 * p_bar * (1 - p_bar)) +
                 z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    denominator = (p2 - p1) ** 2

    if denominator == 0:
        return 10000  # Very large effect needed

    n = int(math.ceil(numerator / denominator))
    return max(n, 100)
