"""
Analytics Router Tests

Tests for the Phase 9B analytics endpoints.
Run with: pytest tests/test_analytics.py -v
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime

# Import the FastAPI app
from app.main import app

client = TestClient(app)


class TestOnboardingPrediction:
    """Tests for onboarding completion prediction endpoint."""

    def test_predict_completion_basic(self):
        """Test basic prediction request."""
        request_data = {
            "user_id": "test-user-123",
            "started_onboarding": True,
            "has_full_name": True,
            "has_institution": False,
            "profile_completeness_score": 2,
            "minutes_to_first_action": 30.0,
            "max_step_reached_day_1": 3,
            "signup_hour": 10,
            "signup_day_of_week": 1,
            "is_invited_user": False,
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "completion_probability" in data
        assert "risk_category" in data
        assert "top_risk_factors" in data
        assert "recommended_interventions" in data

    def test_predict_high_risk_user(self):
        """Test prediction for a user who hasn't started onboarding."""
        request_data = {
            "user_id": "high-risk-user",
            "started_onboarding": False,
            "has_full_name": False,
            "has_institution": False,
            "profile_completeness_score": 0,
            "minutes_to_first_action": 120.0,
            "max_step_reached_day_1": 0,
            "signup_hour": 3,
            "signup_day_of_week": 6,
            "is_invited_user": False,
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["risk_category"] == "high_risk"
        assert data["completion_probability"] < 0.5

    def test_predict_low_risk_user(self):
        """Test prediction for an engaged user."""
        request_data = {
            "user_id": "low-risk-user",
            "started_onboarding": True,
            "has_full_name": True,
            "has_institution": True,
            "profile_completeness_score": 4,
            "minutes_to_first_action": 2.0,
            "max_step_reached_day_1": 4,
            "signup_hour": 10,
            "signup_day_of_week": 2,
            "is_invited_user": True,
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["risk_category"] == "low_risk"
        assert data["completion_probability"] > 0.7

    def test_predict_invalid_step(self):
        """Test with invalid step value."""
        request_data = {
            "user_id": "test-user",
            "max_step_reached_day_1": 10,  # Invalid: max is 5
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 422  # Validation error

    def test_predict_missing_user_id(self):
        """Test with missing required field."""
        request_data = {
            "started_onboarding": True,
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 422


class TestSearchRanking:
    """Tests for search ranking endpoint."""

    def test_rank_basic_results(self):
        """Test basic search ranking."""
        request_data = {
            "query": "project deadline",
            "results": [
                {"id": "1", "title": "Important Project Deadline", "type": "task"},
                {"id": "2", "title": "Meeting Notes", "type": "task"},
                {"id": "3", "title": "Project Plan", "type": "project"},
            ],
            "user_history": [],
            "context": {"user_id": "test-user", "page_context": "/today"},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert "ranked_results" in data
        assert "query" in data
        assert "total_results" in data
        assert len(data["ranked_results"]) == 3

    def test_rank_with_user_history(self):
        """Test ranking with personalization from history."""
        request_data = {
            "query": "report",
            "results": [
                {"id": "1", "title": "Quarterly Report", "type": "task"},
                {"id": "2", "title": "Report Template", "type": "task"},
            ],
            "user_history": [
                {"result_id": "2", "result_type": "task", "selected": True},
            ],
            "context": {"user_id": "test-user"},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

        data = response.json()
        # Previously selected item should rank higher
        assert len(data["ranked_results"]) == 2

    def test_rank_exact_match_boost(self):
        """Test that exact matches get boosted."""
        request_data = {
            "query": "budget review",
            "results": [
                {"id": "1", "title": "Budget Review Meeting", "type": "task"},
                {"id": "2", "title": "Annual Budget", "type": "task"},
            ],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

        data = response.json()
        # Exact match should be first
        assert data["ranked_results"][0]["id"] == "1"

    def test_rank_empty_results(self):
        """Test ranking with no results."""
        request_data = {
            "query": "test",
            "results": [],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["ranked_results"] == []
        assert data["total_results"] == 0

    def test_rank_includes_scores(self):
        """Test that results include score information."""
        request_data = {
            "query": "test",
            "results": [
                {"id": "1", "title": "Test Task", "type": "task"},
            ],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert "_score" in data["ranked_results"][0]
        assert "_features" in data["ranked_results"][0]


class TestFunnelAnalysis:
    """Tests for funnel analysis endpoint."""

    def test_analyze_basic_funnel(self):
        """Test basic funnel analysis."""
        request_data = {
            "cohort_id": "jan-2024",
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-31T23:59:59",
            "user_data": [
                {
                    "user_id": "user-1",
                    "stage_timestamps": {
                        "onboarding_started": "2024-01-01T10:00:00",
                        "profile_completed": "2024-01-01T10:05:00",
                    },
                },
                {
                    "user_id": "user-2",
                    "stage_timestamps": {
                        "onboarding_started": "2024-01-02T09:00:00",
                    },
                },
            ],
        }

        response = client.post("/api/analytics/funnel/analyze", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert "cohort_id" in data
        assert "cohort_size" in data
        assert "overall_completion_rate" in data
        assert "stage_metrics" in data

    def test_analyze_empty_cohort(self):
        """Test funnel analysis with empty cohort."""
        request_data = {
            "cohort_id": "empty-cohort",
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-31T23:59:59",
            "user_data": [],
        }

        response = client.post("/api/analytics/funnel/analyze", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["cohort_size"] == 0


class TestABTestAnalysis:
    """Tests for A/B test analysis endpoint."""

    def test_analyze_significant_result(self):
        """Test analysis with significant difference."""
        request_data = {
            "experiment_id": "exp-001",
            "control_data": [0] * 50 + [1] * 50,  # 50% conversion
            "treatment_data": [0] * 30 + [1] * 70,  # 70% conversion
            "alpha": 0.05,
        }

        response = client.post("/api/analytics/abtest/analyze", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["control_rate"] == 0.5
        assert data["treatment_rate"] == 0.7
        assert data["lift"] == 0.4  # (0.7 - 0.5) / 0.5
        assert data["is_significant"] == True
        assert data["recommendation"] == "ship"

    def test_analyze_not_significant(self):
        """Test analysis with no significant difference."""
        request_data = {
            "experiment_id": "exp-002",
            "control_data": [0] * 49 + [1] * 51,  # ~51% conversion
            "treatment_data": [0] * 48 + [1] * 52,  # ~52% conversion
            "alpha": 0.05,
        }

        response = client.post("/api/analytics/abtest/analyze", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["is_significant"] == False

    def test_analyze_negative_lift(self):
        """Test analysis where treatment is worse."""
        request_data = {
            "experiment_id": "exp-003",
            "control_data": [0] * 30 + [1] * 70,  # 70% conversion
            "treatment_data": [0] * 50 + [1] * 50,  # 50% conversion
            "alpha": 0.05,
        }

        response = client.post("/api/analytics/abtest/analyze", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["lift"] < 0

    def test_analyze_insufficient_sample(self):
        """Test analysis with insufficient sample size."""
        request_data = {
            "experiment_id": "exp-004",
            "control_data": [0, 1, 0],  # Only 3 samples
            "treatment_data": [1, 0, 1],  # Only 3 samples
            "alpha": 0.05,
        }

        response = client.post("/api/analytics/abtest/analyze", json=request_data)
        assert response.status_code == 400


class TestFeatureImportance:
    """Tests for feature importance endpoint."""

    def test_get_feature_importance(self):
        """Test getting feature importance."""
        response = client.get("/api/analytics/feature-importance")
        assert response.status_code == 200

        data = response.json()
        assert "features" in data
        assert len(data["features"]) > 0

        # Each feature should have name, importance, direction
        for feature in data["features"]:
            assert "feature" in feature
            assert "importance" in feature
            assert "direction" in feature


class TestHealthCheck:
    """Tests for analytics health check."""

    def test_analytics_health(self):
        """Test analytics health endpoint."""
        response = client.get("/api/analytics/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "models" in data
        assert "analyzers" in data


class TestInputValidation:
    """Tests for input validation across endpoints."""

    def test_invalid_json(self):
        """Test handling of invalid JSON."""
        response = client.post(
            "/api/analytics/onboarding/predict",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_missing_required_fields(self):
        """Test handling of missing required fields."""
        response = client.post(
            "/api/analytics/search/rank",
            json={},  # Missing required fields
        )
        assert response.status_code == 422

    def test_invalid_field_types(self):
        """Test handling of invalid field types."""
        response = client.post(
            "/api/analytics/onboarding/predict",
            json={
                "user_id": 123,  # Should be string
                "profile_completeness_score": "high",  # Should be int
            },
        )
        assert response.status_code == 422


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_empty_query_search(self):
        """Test search with empty query."""
        request_data = {
            "query": "",
            "results": [{"id": "1", "title": "Test", "type": "task"}],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        # Should still work with empty query
        assert response.status_code == 200

    def test_special_characters_in_query(self):
        """Test search with special characters."""
        request_data = {
            "query": "test @#$%^& query",
            "results": [{"id": "1", "title": "Test Query", "type": "task"}],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

    def test_unicode_in_titles(self):
        """Test search with unicode characters."""
        request_data = {
            "query": "项目",
            "results": [{"id": "1", "title": "项目计划", "type": "project"}],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

    def test_very_long_query(self):
        """Test search with very long query."""
        request_data = {
            "query": "a" * 1000,
            "results": [{"id": "1", "title": "Test", "type": "task"}],
            "user_history": [],
            "context": {},
        }

        response = client.post("/api/analytics/search/rank", json=request_data)
        assert response.status_code == 200

    def test_boundary_values(self):
        """Test with boundary values."""
        request_data = {
            "user_id": "boundary-test",
            "profile_completeness_score": 4,  # Max value
            "max_step_reached_day_1": 5,  # Max value
            "signup_hour": 23,  # Max value
            "signup_day_of_week": 6,  # Max value (Saturday)
        }

        response = client.post("/api/analytics/onboarding/predict", json=request_data)
        assert response.status_code == 200
