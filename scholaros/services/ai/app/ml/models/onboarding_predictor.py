"""
Onboarding Completion Prediction Model

Predicts whether a user will complete onboarding within 7 days.

Use Cases:
1. Early identification of at-risk users for intervention
2. Understanding which factors drive completion
3. A/B test analysis for onboarding improvements

Model Type: Binary Classification (Logistic Regression baseline, XGBoost for production)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import numpy as np
from datetime import datetime, timedelta


@dataclass
class ModelConfig:
    """Configuration for the prediction model."""
    name: str = "onboarding_completion_predictor"
    version: str = "1.0.0"
    target_column: str = "completed_within_7_days"
    prediction_horizon_days: int = 7
    min_training_samples: int = 500
    test_size: float = 0.2
    random_state: int = 42


@dataclass
class FeatureDefinition:
    """Definition for a single feature."""
    name: str
    description: str
    feature_type: str  # "numeric", "categorical", "boolean"
    sql_expression: Optional[str] = None


# Feature definitions for the model
FEATURES: List[FeatureDefinition] = [
    # Signup context features
    FeatureDefinition(
        name="signup_hour",
        description="Hour of day when user signed up (0-23)",
        feature_type="numeric",
        sql_expression="EXTRACT(HOUR FROM created_at)",
    ),
    FeatureDefinition(
        name="signup_day_of_week",
        description="Day of week when user signed up (0=Sunday)",
        feature_type="categorical",
        sql_expression="EXTRACT(DOW FROM created_at)",
    ),
    FeatureDefinition(
        name="is_invited_user",
        description="Whether user was invited by existing user",
        feature_type="boolean",
        sql_expression="EXISTS(SELECT 1 FROM workspace_invites WHERE email = profiles.email)",
    ),

    # Early behavior features
    FeatureDefinition(
        name="minutes_to_first_action",
        description="Minutes between signup and first meaningful action",
        feature_type="numeric",
        sql_expression="""
            EXTRACT(EPOCH FROM (
                COALESCE(onboarding_started_at, created_at + interval '999 days') - created_at
            )) / 60
        """,
    ),
    FeatureDefinition(
        name="started_onboarding",
        description="Whether user started the onboarding flow",
        feature_type="boolean",
        sql_expression="onboarding_started_at IS NOT NULL",
    ),
    FeatureDefinition(
        name="max_step_reached_day_1",
        description="Highest onboarding step reached on day 1",
        feature_type="numeric",
        sql_expression="""
            CASE WHEN onboarding_started_at < created_at + interval '1 day'
                 THEN onboarding_step ELSE 0 END
        """,
    ),

    # Profile completeness features
    FeatureDefinition(
        name="has_full_name",
        description="Whether user provided full name",
        feature_type="boolean",
        sql_expression="full_name IS NOT NULL AND LENGTH(full_name) > 0",
    ),
    FeatureDefinition(
        name="has_institution",
        description="Whether user provided institution",
        feature_type="boolean",
        sql_expression="institution IS NOT NULL AND LENGTH(institution) > 0",
    ),
    FeatureDefinition(
        name="profile_completeness_score",
        description="Number of profile fields filled (0-4)",
        feature_type="numeric",
        sql_expression="""
            (CASE WHEN full_name IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN institution IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN department IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN title IS NOT NULL THEN 1 ELSE 0 END)
        """,
    ),
]


@dataclass
class OnboardingIntervention:
    """Recommended intervention for at-risk users."""
    action: str
    message: str
    priority: str  # "high", "medium", "low"


@dataclass
class PredictionResult:
    """Result of a prediction."""
    user_id: str
    completion_probability: float
    risk_category: str  # "high_risk", "medium_risk", "low_risk"
    top_risk_factors: List[str] = field(default_factory=list)
    recommended_interventions: List[OnboardingIntervention] = field(default_factory=list)


class OnboardingCompletionPredictor:
    """
    Predicts probability of onboarding completion.

    Usage:
        predictor = OnboardingCompletionPredictor()
        predictor.train(training_data)
        predictions = predictor.predict(new_users)
        predictor.explain(user_id)
    """

    def __init__(self, config: Optional[ModelConfig] = None):
        self.config = config or ModelConfig()
        self.model = None
        self.scaler = None
        self.feature_names = [f.name for f in FEATURES]
        self._is_trained = False

        # Default feature weights for rule-based predictions (before ML training)
        self._default_weights = {
            "started_onboarding": 0.3,
            "has_full_name": 0.15,
            "has_institution": 0.1,
            "profile_completeness_score": 0.15,
            "minutes_to_first_action": -0.1,
            "max_step_reached_day_1": 0.2,
        }

    def prepare_features(self, user_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Prepare feature vector from user data.

        Args:
            user_data: Dictionary containing user attributes

        Returns:
            Dictionary of feature name to normalized value
        """
        features = {}

        # Numeric features
        features["signup_hour"] = user_data.get("signup_hour", 12) / 24.0
        features["minutes_to_first_action"] = min(
            user_data.get("minutes_to_first_action", 60) / 60.0, 10.0
        ) / 10.0
        features["max_step_reached_day_1"] = user_data.get("max_step_reached_day_1", 0) / 5.0
        features["profile_completeness_score"] = user_data.get("profile_completeness_score", 0) / 4.0

        # Boolean features
        features["started_onboarding"] = 1.0 if user_data.get("started_onboarding") else 0.0
        features["has_full_name"] = 1.0 if user_data.get("has_full_name") else 0.0
        features["has_institution"] = 1.0 if user_data.get("has_institution") else 0.0
        features["is_invited_user"] = 1.0 if user_data.get("is_invited_user") else 0.0

        # Categorical features (simplified - day of week as cyclic)
        dow = user_data.get("signup_day_of_week", 1)
        features["signup_dow_sin"] = np.sin(2 * np.pi * dow / 7)
        features["signup_dow_cos"] = np.cos(2 * np.pi * dow / 7)

        return features

    def predict_rule_based(self, user_data: Dict[str, Any]) -> float:
        """
        Rule-based prediction (used before ML model is trained).

        Args:
            user_data: Dictionary containing user attributes

        Returns:
            Probability of completion (0-1)
        """
        score = 0.3  # Base probability

        # Apply weights
        if user_data.get("started_onboarding"):
            score += 0.25

        step_reached = user_data.get("max_step_reached_day_1", 0)
        score += step_reached * 0.08  # Each step adds 8%

        if user_data.get("has_full_name"):
            score += 0.1
        if user_data.get("has_institution"):
            score += 0.05

        # Time to first action penalty
        minutes = user_data.get("minutes_to_first_action", 60)
        if minutes > 60:
            score -= 0.1
        elif minutes < 5:
            score += 0.05

        # Invited users more likely to complete
        if user_data.get("is_invited_user"):
            score += 0.1

        return max(0.05, min(0.95, score))

    def predict(self, user_data: Dict[str, Any]) -> PredictionResult:
        """
        Predict completion probability for a user.

        Args:
            user_data: Dictionary containing user attributes including 'user_id'

        Returns:
            PredictionResult with probability and recommendations
        """
        user_id = user_data.get("user_id", "unknown")

        # Use rule-based prediction if model not trained
        if not self._is_trained:
            probability = self.predict_rule_based(user_data)
        else:
            features = self.prepare_features(user_data)
            # Would use self.model.predict_proba() here
            probability = self.predict_rule_based(user_data)

        # Determine risk category
        if probability < 0.3:
            risk_category = "high_risk"
        elif probability < 0.7:
            risk_category = "medium_risk"
        else:
            risk_category = "low_risk"

        # Identify risk factors
        risk_factors = self._identify_risk_factors(user_data)

        # Generate interventions
        interventions = self._get_interventions(user_data, risk_category)

        return PredictionResult(
            user_id=user_id,
            completion_probability=probability,
            risk_category=risk_category,
            top_risk_factors=risk_factors,
            recommended_interventions=interventions,
        )

    def _identify_risk_factors(self, user_data: Dict[str, Any]) -> List[str]:
        """Identify top risk factors for non-completion."""
        risk_factors = []

        if not user_data.get("started_onboarding"):
            risk_factors.append("Has not started onboarding")

        if user_data.get("minutes_to_first_action", 60) > 60:
            risk_factors.append("Slow to take first action (>1 hour)")

        if not user_data.get("has_full_name"):
            risk_factors.append("Profile incomplete (no name)")

        step = user_data.get("max_step_reached_day_1", 0)
        if step < 2:
            risk_factors.append(f"Low progress (step {step}/5)")

        return risk_factors[:3]  # Top 3 factors

    def _get_interventions(
        self,
        user_data: Dict[str, Any],
        risk_category: str
    ) -> List[OnboardingIntervention]:
        """Generate recommended interventions based on user state."""
        interventions = []

        if not user_data.get("started_onboarding"):
            interventions.append(OnboardingIntervention(
                action="nudge_start_onboarding",
                message="Send reminder email to start onboarding",
                priority="high",
            ))

        if user_data.get("profile_completeness_score", 0) < 2:
            interventions.append(OnboardingIntervention(
                action="encourage_profile_completion",
                message="Highlight benefits of completing profile",
                priority="medium",
            ))

        if user_data.get("minutes_to_first_action", 60) > 60:
            interventions.append(OnboardingIntervention(
                action="quick_win_suggestion",
                message="Send quick-start guide email",
                priority="high" if risk_category == "high_risk" else "medium",
            ))

        step = user_data.get("max_step_reached_day_1", 0)
        if step > 0 and step < 5:
            interventions.append(OnboardingIntervention(
                action="progress_reminder",
                message=f"Encourage completion (stuck at step {step})",
                priority="medium",
            ))

        return interventions

    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train the model on historical data.

        Args:
            training_data: List of user data dictionaries with 'completed' label

        Returns:
            Dictionary with training metrics
        """
        if len(training_data) < self.config.min_training_samples:
            return {
                "success": False,
                "error": f"Insufficient training samples ({len(training_data)} < {self.config.min_training_samples})",
            }

        # In production, would use sklearn or similar
        # For MVP, just mark as trained and continue using rule-based
        self._is_trained = True

        # Calculate basic metrics from training data
        completed_count = sum(1 for d in training_data if d.get("completed"))
        completion_rate = completed_count / len(training_data)

        return {
            "success": True,
            "n_samples": len(training_data),
            "completion_rate": completion_rate,
            "model_type": "rule_based",  # Would be "logistic" or "gbm" with sklearn
            "version": self.config.version,
        }

    def get_feature_importance(self) -> List[Dict[str, Any]]:
        """Get feature importance rankings."""
        # For rule-based model, return predefined weights
        return [
            {"feature": name, "importance": abs(weight), "direction": "positive" if weight > 0 else "negative"}
            for name, weight in sorted(
                self._default_weights.items(),
                key=lambda x: abs(x[1]),
                reverse=True
            )
        ]
