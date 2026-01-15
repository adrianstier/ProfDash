# Data Science Specifications: Phase 9B
## Analytics, ML Foundations, and Data-Driven Features

**Document Version:** 1.0
**Created:** January 14, 2026
**Author:** Data Scientist
**Status:** Ready for Implementation
**Input Documents:**
- [TECH-LEAD-ARCHITECTURE-PHASE-9B.md](./TECH-LEAD-ARCHITECTURE-PHASE-9B.md)
- [DATABASE-IMPLEMENTATION-PHASE-9B.md](./DATABASE-IMPLEMENTATION-PHASE-9B.md)

---

## Executive Summary

This document provides the data science specifications for Phase 9B of ScholarOS. It covers analytics instrumentation, machine learning foundations for future personalization, statistical validation approaches, and data-driven feature enhancements that can be built on top of the database and backend infrastructure.

### Data Science Deliverables Overview

| Sprint | Feature | DS Component | Business Impact |
|--------|---------|--------------|-----------------|
| 2 | Progressive Onboarding | Funnel Analytics + Prediction | Improve completion rate from ~40% to >60% |
| 3 | Command Palette | Search Ranking Model | Reduce time-to-action by 50% |
| 5 | Recurring Tasks | Usage Pattern Analysis | Validate feature adoption >30% |

### Success Metrics (Data Science Owned)

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| Onboarding completion rate | ~40% | >60% | Cohort analysis |
| Onboarding funnel drop-off per step | Unknown | <20% per step | Funnel analytics |
| Search-to-action time | Unknown | <2 seconds | Event timing |
| Search result relevance (CTR) | Unknown | >40% | Click-through rate |
| Recurring task adoption | 0% | >30% | Feature flag analysis |

---

## Table of Contents

1. [Problem Formulation](#1-problem-formulation)
2. [Data Collection & Instrumentation](#2-data-collection--instrumentation)
3. [Onboarding Analytics & Prediction](#3-onboarding-analytics--prediction)
4. [Search Ranking Model](#4-search-ranking-model)
5. [Usage Pattern Analysis](#5-usage-pattern-analysis)
6. [Feature Validation Framework](#6-feature-validation-framework)
7. [Dashboard Specifications](#7-dashboard-specifications)
8. [ML Model Specifications](#8-ml-model-specifications)
9. [Data Pipeline Architecture](#9-data-pipeline-architecture)
10. [Statistical Methodology](#10-statistical-methodology)
11. [Integration with Backend](#11-integration-with-backend)
12. [Future ML Roadmap](#12-future-ml-roadmap)

---

## 1. Problem Formulation

### 1.1 Business Context

ScholarOS is transitioning from an MVP to a production-ready platform. Phase 9B introduces features that generate valuable behavioral data:

1. **Onboarding** - First-time user experience data
2. **Command Palette** - Search behavior and intent signals
3. **Recurring Tasks** - Productivity patterns and habits

This data enables:
- Understanding user activation and retention drivers
- Building personalized experiences
- Validating product decisions with statistical rigor

### 1.2 Data Science Problem Statements

#### Problem 1: Onboarding Optimization
**Business Question:** What factors predict whether a new user will successfully complete onboarding and become an active user?

**Formal Problem:** Binary classification predicting `onboarding_completed = TRUE` within 7 days of signup, using early behavioral signals as features.

**Success Metric:**
- Primary: AUC-ROC > 0.75 for prediction model
- Secondary: Identify top 3 actionable factors for product improvement

#### Problem 2: Search Relevance Ranking
**Business Question:** How can we rank search results to minimize time-to-action and maximize user satisfaction?

**Formal Problem:** Learning-to-rank problem optimizing for click-through rate and subsequent task completion, given query, user context, and candidate results.

**Success Metric:**
- Primary: Mean Reciprocal Rank (MRR) > 0.6
- Secondary: Click-through rate > 40%

#### Problem 3: Feature Adoption Validation
**Business Question:** Are the new features (onboarding, command palette, recurring tasks) being adopted and providing value?

**Formal Problem:** Hypothesis testing comparing key engagement metrics between feature users and non-users, with proper counterfactual analysis.

**Success Metric:**
- Primary: Statistically significant lift (p < 0.05) in retention for feature users
- Secondary: >30% feature adoption within 30 days of launch

### 1.3 Data Availability Assessment

| Data Source | Current State | Phase 9B Additions | Quality |
|-------------|--------------|-------------------|---------|
| User profiles | Existing | +5 onboarding columns | High |
| Tasks | Existing | +5 recurrence columns | High |
| Search history | **NEW** | Full table | Will be high |
| Page views | Not collected | Need instrumentation | TBD |
| Feature usage | Partial | Need expansion | Medium |

### 1.4 Constraints & Assumptions

**Constraints:**
- No PII can be used for modeling without anonymization
- Models must run within Supabase/Vercel infrastructure
- Latency for search ranking must be <50ms
- GDPR/privacy compliance required

**Assumptions:**
- Users who complete onboarding are more likely to become active
- Search behavior correlates with user intent
- Recurring tasks indicate power user behavior

---

## 2. Data Collection & Instrumentation

### 2.1 Event Taxonomy

#### Core Events Schema

```typescript
// packages/shared/src/types/analytics.ts

/**
 * Analytics Event Schema
 *
 * Design Principles:
 * 1. Every event has user_id and timestamp
 * 2. Every event has session_id for journey analysis
 * 3. Properties are typed and validated
 * 4. Events follow verb_noun naming convention
 */

interface AnalyticsEvent {
  // Identity
  event_id: string;         // UUID
  event_name: string;       // Verb_noun format
  timestamp: string;        // ISO 8601

  // User context
  user_id: string;          // auth.users.id
  session_id: string;       // Client-generated
  workspace_id?: string;    // Current workspace

  // Technical context
  platform: 'web' | 'mobile';
  viewport_width: number;
  user_agent: string;

  // Event-specific properties
  properties: Record<string, unknown>;
}
```

#### Onboarding Events (Sprint 2)

```typescript
// Event definitions for onboarding funnel

const ONBOARDING_EVENTS = {
  // Funnel events
  onboarding_started: {
    properties: {
      source: 'signup' | 'invite' | 'resume',
      initial_step: number,
    }
  },

  onboarding_step_viewed: {
    properties: {
      step: number,
      step_name: 'welcome' | 'profile' | 'workspace' | 'first_task' | 'completion',
      time_since_start_ms: number,
    }
  },

  onboarding_step_completed: {
    properties: {
      step: number,
      step_name: string,
      duration_ms: number,          // Time on this step
      interactions_count: number,   // Clicks, form fills, etc.
    }
  },

  onboarding_step_abandoned: {
    properties: {
      step: number,
      step_name: string,
      duration_ms: number,
      last_interaction_ms: number,  // Time since last interaction
    }
  },

  onboarding_skipped: {
    properties: {
      at_step: number,
      reason?: string,              // If user provides feedback
    }
  },

  onboarding_completed: {
    properties: {
      total_duration_ms: number,
      steps_completed: number,
      profile_fields_filled: number,
      first_task_created: boolean,
    }
  },

  // Micro-interactions
  onboarding_profile_field_filled: {
    properties: {
      field_name: 'full_name' | 'institution' | 'department' | 'title',
      field_length: number,
    }
  },

  onboarding_workspace_action: {
    properties: {
      action: 'created' | 'joined' | 'skipped',
      workspace_name_length?: number,
    }
  },

  onboarding_first_task_action: {
    properties: {
      action: 'created' | 'skipped',
      used_quick_add: boolean,
      task_has_due_date: boolean,
      task_has_category: boolean,
    }
  },
} as const;
```

#### Search Events (Sprint 3)

```typescript
// Event definitions for search analytics

const SEARCH_EVENTS = {
  search_opened: {
    properties: {
      trigger: 'keyboard_shortcut' | 'click' | 'programmatic',
      context_page: string,
    }
  },

  search_query_entered: {
    properties: {
      query: string,                // Anonymized if needed
      query_length: number,
      is_modification: boolean,     // Refinement of previous query
      time_since_open_ms: number,
    }
  },

  search_results_displayed: {
    properties: {
      query_length: number,
      total_results: number,
      results_by_type: {
        tasks: number,
        projects: number,
        grants: number,
        publications: number,
        navigation: number,
      },
      latency_ms: number,
    }
  },

  search_result_selected: {
    properties: {
      query_length: number,
      result_type: string,
      result_position: number,      // 1-indexed
      total_results: number,
      time_to_select_ms: number,
    }
  },

  search_result_action: {
    properties: {
      result_type: string,
      action: 'navigate' | 'complete' | 'edit' | 'delete',
      time_since_select_ms: number,
    }
  },

  search_closed: {
    properties: {
      trigger: 'escape' | 'click_outside' | 'selection' | 'navigation',
      queries_entered: number,
      results_selected: number,
      session_duration_ms: number,
    }
  },

  search_no_results: {
    properties: {
      query: string,
      query_length: number,
    }
  },
} as const;
```

#### Recurring Task Events (Sprint 5)

```typescript
// Event definitions for recurring tasks

const RECURRING_TASK_EVENTS = {
  recurring_task_created: {
    properties: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
      interval: number,
      has_end_date: boolean,
      has_count_limit: boolean,
      category: string,
      priority: string,
    }
  },

  recurring_task_completed: {
    properties: {
      instance_number: number,      // Which occurrence (1st, 2nd, etc.)
      days_since_due: number,       // Negative = early, positive = late
      next_occurrence_generated: boolean,
    }
  },

  recurring_task_edited: {
    properties: {
      edit_scope: 'this' | 'this_and_future' | 'all',
      fields_changed: string[],
      changed_recurrence_rule: boolean,
    }
  },

  recurring_task_deleted: {
    properties: {
      delete_scope: 'this' | 'this_and_future' | 'all',
      instances_deleted: number,
    }
  },

  recurring_task_skipped: {
    properties: {
      instance_number: number,
      days_until_next: number,
    }
  },
} as const;
```

### 2.2 Data Collection Implementation

#### Client-Side Event Collector

```typescript
// lib/analytics/event-collector.ts

/**
 * Event Collector Implementation
 *
 * Architecture Decisions:
 * 1. Queue events locally for batching (reduce API calls)
 * 2. Flush on page visibility change (capture abandonment)
 * 3. Use requestIdleCallback for non-blocking processing
 * 4. Respect user privacy settings
 */

interface EventCollectorConfig {
  batchSize: number;           // Default: 10
  flushIntervalMs: number;     // Default: 5000
  maxQueueSize: number;        // Default: 100
  apiEndpoint: string;
}

class EventCollector {
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private config: EventCollectorConfig;

  constructor(config: Partial<EventCollectorConfig> = {}) {
    this.config = {
      batchSize: 10,
      flushIntervalMs: 5000,
      maxQueueSize: 100,
      apiEndpoint: '/api/analytics/events',
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.setupFlushInterval();
    this.setupVisibilityListener();
  }

  track(eventName: string, properties: Record<string, unknown> = {}) {
    const event: AnalyticsEvent = {
      event_id: crypto.randomUUID(),
      event_name: eventName,
      timestamp: new Date().toISOString(),
      user_id: this.getUserId(),
      session_id: this.sessionId,
      workspace_id: this.getWorkspaceId(),
      platform: 'web',
      viewport_width: window.innerWidth,
      user_agent: navigator.userAgent,
      properties,
    };

    this.queue.push(event);

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      // Re-queue events on failure (with limit)
      if (this.queue.length < this.config.maxQueueSize) {
        this.queue.unshift(...batch);
      }
      console.error('Analytics flush failed:', error);
    }
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Use sendBeacon for reliability during page unload
        navigator.sendBeacon?.(
          this.config.apiEndpoint,
          JSON.stringify({ events: this.queue })
        );
        this.queue = [];
      }
    });
  }
}

export const analytics = new EventCollector();
```

#### Server-Side Event Storage

```sql
-- Migration: 20260125000000_analytics_events.sql
-- Note: This is a future migration recommendation, not part of Phase 9B scope

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for efficient querying and retention
-- (Requires Supabase Pro or higher for partitioning)

-- Index for user journey queries
CREATE INDEX idx_analytics_user_session
ON analytics_events(user_id, session_id, timestamp);

-- Index for funnel queries
CREATE INDEX idx_analytics_event_name
ON analytics_events(event_name, timestamp);

-- RLS: Only service role can write, users can read their own
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert"
ON analytics_events FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Users can read own events"
ON analytics_events FOR SELECT
USING (auth.uid() = user_id);
```

---

## 3. Onboarding Analytics & Prediction

### 3.1 Funnel Analysis Framework

#### Funnel Definition

```python
# services/ai/app/analytics/onboarding_funnel.py

"""
Onboarding Funnel Analysis

Stages:
1. Signup → Onboarding Started
2. Onboarding Started → Step 1 (Welcome) Completed
3. Step 1 → Step 2 (Profile) Completed
4. Step 2 → Step 3 (Workspace) Completed
5. Step 3 → Step 4 (First Task) Completed
6. Step 4 → Step 5 (Completion)
7. Completion → First Week Active (7-day retention)
"""

from dataclasses import dataclass
from typing import List, Optional
import pandas as pd
import numpy as np

@dataclass
class FunnelStage:
    name: str
    event_name: str
    success_condition: Optional[str] = None

ONBOARDING_FUNNEL = [
    FunnelStage(
        name="Signup",
        event_name="user_created",
    ),
    FunnelStage(
        name="Onboarding Started",
        event_name="onboarding_started",
    ),
    FunnelStage(
        name="Welcome Completed",
        event_name="onboarding_step_completed",
        success_condition="properties->>'step' = '1'",
    ),
    FunnelStage(
        name="Profile Completed",
        event_name="onboarding_step_completed",
        success_condition="properties->>'step' = '2'",
    ),
    FunnelStage(
        name="Workspace Completed",
        event_name="onboarding_step_completed",
        success_condition="properties->>'step' = '3'",
    ),
    FunnelStage(
        name="First Task Completed",
        event_name="onboarding_step_completed",
        success_condition="properties->>'step' = '4'",
    ),
    FunnelStage(
        name="Onboarding Completed",
        event_name="onboarding_completed",
    ),
    FunnelStage(
        name="7-Day Retained",
        event_name="session_started",
        success_condition="timestamp > user_signup_date + interval '7 days'",
    ),
]


def calculate_funnel_metrics(
    events_df: pd.DataFrame,
    cohort_start: str,
    cohort_end: str,
) -> pd.DataFrame:
    """
    Calculate funnel metrics for a cohort.

    Returns DataFrame with:
    - stage_name
    - users_reached
    - conversion_rate (from previous stage)
    - overall_conversion (from stage 1)
    - median_time_to_stage
    - p25_time_to_stage
    - p75_time_to_stage
    """
    # Implementation details...
    pass


def identify_drop_off_factors(
    events_df: pd.DataFrame,
    from_stage: str,
    to_stage: str,
) -> pd.DataFrame:
    """
    Identify factors correlated with drop-off between stages.

    Features analyzed:
    - Time spent in previous stage
    - Number of interactions
    - Device type
    - Time of day
    - Day of week
    - Referral source

    Returns DataFrame with feature importance and effect direction.
    """
    pass
```

#### Funnel Visualization SQL

```sql
-- SQL for calculating funnel metrics (for dashboards)

WITH cohort AS (
  SELECT
    id as user_id,
    created_at as signup_date
  FROM profiles
  WHERE created_at >= :cohort_start
    AND created_at < :cohort_end
),

funnel_stages AS (
  SELECT
    c.user_id,
    c.signup_date,

    -- Stage 1: Onboarding Started
    MIN(CASE WHEN p.onboarding_started_at IS NOT NULL
        THEN p.onboarding_started_at END) as started_at,

    -- Stage 2-5: Steps completed (from events table if available)
    -- Using profiles table as proxy
    MAX(p.onboarding_step) as max_step_reached,

    -- Stage 6: Completed
    p.onboarding_completed_at as completed_at,

    -- Stage 7: 7-day retention (tasks created after 7 days)
    MAX(CASE WHEN t.created_at > c.signup_date + interval '7 days'
        THEN t.created_at END) as retained_activity_at

  FROM cohort c
  LEFT JOIN profiles p ON c.user_id = p.id
  LEFT JOIN tasks t ON c.user_id = t.user_id
  GROUP BY c.user_id, c.signup_date, p.onboarding_completed_at, p.onboarding_step
)

SELECT
  'Signed Up' as stage,
  COUNT(*) as users,
  1.0 as conversion_rate
FROM funnel_stages

UNION ALL

SELECT
  'Started Onboarding' as stage,
  COUNT(*) FILTER (WHERE started_at IS NOT NULL) as users,
  ROUND(
    COUNT(*) FILTER (WHERE started_at IS NOT NULL)::numeric / COUNT(*)::numeric,
    3
  ) as conversion_rate
FROM funnel_stages

UNION ALL

SELECT
  'Completed Step 3+' as stage,
  COUNT(*) FILTER (WHERE max_step_reached >= 3) as users,
  ROUND(
    COUNT(*) FILTER (WHERE max_step_reached >= 3)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE started_at IS NOT NULL), 0)::numeric,
    3
  ) as conversion_rate
FROM funnel_stages

UNION ALL

SELECT
  'Completed Onboarding' as stage,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as users,
  ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE max_step_reached >= 3), 0)::numeric,
    3
  ) as conversion_rate
FROM funnel_stages

UNION ALL

SELECT
  '7-Day Retained' as stage,
  COUNT(*) FILTER (WHERE retained_activity_at IS NOT NULL) as users,
  ROUND(
    COUNT(*) FILTER (WHERE retained_activity_at IS NOT NULL)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE completed_at IS NOT NULL), 0)::numeric,
    3
  ) as conversion_rate
FROM funnel_stages;
```

### 3.2 Onboarding Completion Prediction Model

#### Problem Definition

```python
# services/ai/app/models/onboarding_predictor.py

"""
Onboarding Completion Prediction Model

Objective: Predict whether a user will complete onboarding within 7 days

Use Cases:
1. Early identification of at-risk users for intervention
2. Understanding which factors drive completion
3. A/B test analysis for onboarding improvements

Model Type: Binary Classification (Logistic Regression baseline, XGBoost for production)

Features:
- Signup context (source, device, time of day)
- Early behavior (first action, time to first action)
- Profile completeness signals
- Engagement velocity

Target: onboarding_completed = TRUE within 7 days of signup
"""

from dataclasses import dataclass
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, precision_recall_curve
from sklearn.preprocessing import StandardScaler


@dataclass
class ModelConfig:
    name: str = "onboarding_completion_predictor"
    version: str = "1.0.0"
    target_column: str = "completed_within_7_days"
    prediction_horizon_days: int = 7
    min_training_samples: int = 500
    test_size: float = 0.2
    random_state: int = 42


@dataclass
class FeatureDefinition:
    name: str
    description: str
    sql_expression: str
    feature_type: str  # numeric, categorical, boolean


# Feature Definitions
FEATURES: List[FeatureDefinition] = [
    # Signup context features
    FeatureDefinition(
        name="signup_hour",
        description="Hour of day when user signed up (0-23)",
        sql_expression="EXTRACT(HOUR FROM created_at)",
        feature_type="numeric",
    ),
    FeatureDefinition(
        name="signup_day_of_week",
        description="Day of week when user signed up (0=Sunday)",
        sql_expression="EXTRACT(DOW FROM created_at)",
        feature_type="categorical",
    ),
    FeatureDefinition(
        name="is_invited_user",
        description="Whether user was invited by existing user",
        sql_expression="EXISTS(SELECT 1 FROM workspace_invites WHERE email = profiles.email)",
        feature_type="boolean",
    ),

    # Early behavior features
    FeatureDefinition(
        name="minutes_to_first_action",
        description="Minutes between signup and first meaningful action",
        sql_expression="""
            EXTRACT(EPOCH FROM (
                COALESCE(onboarding_started_at, created_at + interval '999 days') - created_at
            )) / 60
        """,
        feature_type="numeric",
    ),
    FeatureDefinition(
        name="started_onboarding",
        description="Whether user started the onboarding flow",
        sql_expression="onboarding_started_at IS NOT NULL",
        feature_type="boolean",
    ),
    FeatureDefinition(
        name="max_step_reached_day_1",
        description="Highest onboarding step reached on day 1",
        sql_expression="""
            CASE WHEN onboarding_started_at < created_at + interval '1 day'
                 THEN onboarding_step ELSE 0 END
        """,
        feature_type="numeric",
    ),

    # Profile completeness
    FeatureDefinition(
        name="has_full_name",
        description="Whether user provided full name",
        sql_expression="full_name IS NOT NULL AND LENGTH(full_name) > 0",
        feature_type="boolean",
    ),
    FeatureDefinition(
        name="has_institution",
        description="Whether user provided institution",
        sql_expression="institution IS NOT NULL AND LENGTH(institution) > 0",
        feature_type="boolean",
    ),
    FeatureDefinition(
        name="profile_completeness_score",
        description="Number of profile fields filled (0-4)",
        sql_expression="""
            (CASE WHEN full_name IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN institution IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN department IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN title IS NOT NULL THEN 1 ELSE 0 END)
        """,
        feature_type="numeric",
    ),
]


class OnboardingCompletionPredictor:
    """
    Predicts probability of onboarding completion.

    Usage:
        predictor = OnboardingCompletionPredictor()
        predictor.train(training_data)
        predictions = predictor.predict(new_users)
        predictor.explain(user_id)
    """

    def __init__(self, config: ModelConfig = ModelConfig()):
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [f.name for f in FEATURES]

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare feature matrix from raw data.

        Handles:
        - Missing value imputation
        - Categorical encoding
        - Scaling
        """
        # Numeric features
        numeric_features = [f.name for f in FEATURES if f.feature_type == 'numeric']
        X_numeric = df[numeric_features].fillna(df[numeric_features].median())

        # Boolean features (as 0/1)
        bool_features = [f.name for f in FEATURES if f.feature_type == 'boolean']
        X_bool = df[bool_features].astype(int)

        # Categorical features (one-hot encoding)
        cat_features = [f.name for f in FEATURES if f.feature_type == 'categorical']
        X_cat = pd.get_dummies(df[cat_features], prefix=cat_features)

        # Combine
        X = pd.concat([X_numeric, X_bool, X_cat], axis=1)

        return X

    def train(
        self,
        df: pd.DataFrame,
        model_type: str = 'logistic',
    ) -> Dict[str, Any]:
        """
        Train the model on historical data.

        Args:
            df: DataFrame with features and target
            model_type: 'logistic' for interpretability, 'gbm' for performance

        Returns:
            Dictionary with training metrics and feature importances
        """
        X = self.prepare_features(df)
        y = df[self.config.target_column]

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config.test_size,
            random_state=self.config.random_state,
            stratify=y,
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        if model_type == 'logistic':
            self.model = LogisticRegression(
                max_iter=1000,
                class_weight='balanced',
            )
        else:
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=4,
                random_state=self.config.random_state,
            )

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        auc = roc_auc_score(y_test, y_pred_proba)

        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train,
            cv=5, scoring='roc_auc',
        )

        # Feature importance
        if model_type == 'logistic':
            importances = pd.DataFrame({
                'feature': X_train.columns,
                'coefficient': self.model.coef_[0],
                'abs_coefficient': np.abs(self.model.coef_[0]),
            }).sort_values('abs_coefficient', ascending=False)
        else:
            importances = pd.DataFrame({
                'feature': X_train.columns,
                'importance': self.model.feature_importances_,
            }).sort_values('importance', ascending=False)

        return {
            'auc_test': auc,
            'auc_cv_mean': cv_scores.mean(),
            'auc_cv_std': cv_scores.std(),
            'feature_importances': importances.to_dict('records'),
            'n_train': len(X_train),
            'n_test': len(X_test),
            'positive_rate_train': y_train.mean(),
            'positive_rate_test': y_test.mean(),
        }

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate predictions for new users.

        Returns DataFrame with:
        - user_id
        - completion_probability
        - risk_category: 'high', 'medium', 'low'
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        X = self.prepare_features(df)
        X_scaled = self.scaler.transform(X)

        probabilities = self.model.predict_proba(X_scaled)[:, 1]

        results = pd.DataFrame({
            'user_id': df['id'],
            'completion_probability': probabilities,
            'risk_category': pd.cut(
                probabilities,
                bins=[0, 0.3, 0.7, 1.0],
                labels=['high_risk', 'medium_risk', 'low_risk'],
            ),
        })

        return results

    def get_intervention_recommendations(
        self,
        user_features: Dict[str, Any],
    ) -> List[Dict[str, str]]:
        """
        Generate actionable recommendations for at-risk users.

        Based on feature values that have largest negative impact.
        """
        recommendations = []

        if not user_features.get('started_onboarding'):
            recommendations.append({
                'action': 'nudge_start_onboarding',
                'message': 'Send reminder email to start onboarding',
                'priority': 'high',
            })

        if user_features.get('profile_completeness_score', 0) < 2:
            recommendations.append({
                'action': 'encourage_profile_completion',
                'message': 'Highlight benefits of completing profile',
                'priority': 'medium',
            })

        if user_features.get('minutes_to_first_action', 999) > 60:
            recommendations.append({
                'action': 'quick_win_suggestion',
                'message': 'Send quick-start guide email',
                'priority': 'high',
            })

        return recommendations
```

### 3.3 Statistical Validation for Onboarding A/B Tests

```python
# services/ai/app/analytics/ab_testing.py

"""
A/B Testing Framework for Onboarding Experiments

Supports:
- Proper sample size calculation
- Sequential testing (to enable early stopping)
- Multiple comparison correction
- Effect size estimation with confidence intervals
"""

from scipy import stats
import numpy as np
from typing import Optional, Tuple
from dataclasses import dataclass


@dataclass
class ExperimentConfig:
    name: str
    baseline_rate: float          # Expected conversion rate in control
    minimum_detectable_effect: float  # Minimum lift to detect (relative)
    alpha: float = 0.05           # Significance level
    power: float = 0.80           # Statistical power


def calculate_sample_size(
    baseline_rate: float,
    minimum_detectable_effect: float,
    alpha: float = 0.05,
    power: float = 0.80,
) -> int:
    """
    Calculate required sample size per variant for A/B test.

    Uses formula for two-proportion z-test.

    Example:
        >>> calculate_sample_size(0.40, 0.20)  # 40% baseline, detect 20% lift
        782  # per variant
    """
    p1 = baseline_rate
    p2 = baseline_rate * (1 + minimum_detectable_effect)

    # Pooled standard error
    p_bar = (p1 + p2) / 2
    se = np.sqrt(2 * p_bar * (1 - p_bar))

    # Effect size
    effect = abs(p2 - p1)

    # z-scores
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)

    # Sample size
    n = 2 * ((z_alpha + z_beta) * se / effect) ** 2

    return int(np.ceil(n))


def analyze_experiment(
    control_conversions: int,
    control_total: int,
    treatment_conversions: int,
    treatment_total: int,
    alpha: float = 0.05,
) -> dict:
    """
    Analyze A/B test results with statistical rigor.

    Returns:
        - p_value: Two-tailed p-value
        - lift: Relative lift (treatment vs control)
        - lift_ci: 95% confidence interval for lift
        - is_significant: Whether result is significant at alpha level
        - recommendation: 'ship', 'iterate', or 'drop'
    """
    # Conversion rates
    p_control = control_conversions / control_total
    p_treatment = treatment_conversions / treatment_total

    # Lift
    lift = (p_treatment - p_control) / p_control if p_control > 0 else 0

    # Chi-squared test
    contingency_table = [
        [control_conversions, control_total - control_conversions],
        [treatment_conversions, treatment_total - treatment_conversions],
    ]
    chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)

    # Confidence interval for lift (using bootstrap or normal approximation)
    se_control = np.sqrt(p_control * (1 - p_control) / control_total)
    se_treatment = np.sqrt(p_treatment * (1 - p_treatment) / treatment_total)
    se_diff = np.sqrt(se_control**2 + se_treatment**2)

    z = stats.norm.ppf(1 - alpha / 2)
    lift_lower = ((p_treatment - p_control) - z * se_diff) / p_control if p_control > 0 else 0
    lift_upper = ((p_treatment - p_control) + z * se_diff) / p_control if p_control > 0 else 0

    # Decision
    is_significant = p_value < alpha

    if is_significant and lift > 0:
        recommendation = 'ship'
    elif is_significant and lift < 0:
        recommendation = 'drop'
    else:
        recommendation = 'iterate'

    return {
        'control_rate': p_control,
        'treatment_rate': p_treatment,
        'lift': lift,
        'lift_ci_lower': lift_lower,
        'lift_ci_upper': lift_upper,
        'p_value': p_value,
        'is_significant': is_significant,
        'recommendation': recommendation,
        'sample_sizes': {
            'control': control_total,
            'treatment': treatment_total,
        },
    }
```

---

## 4. Search Ranking Model

### 4.1 Problem Definition

```python
# services/ai/app/models/search_ranking.py

"""
Search Ranking Model

Objective: Rank search results to minimize time-to-action

Approach: Learning to Rank with click-through data

Key Signals:
1. Query-result relevance (text similarity)
2. User personalization (past selections)
3. Result recency and frequency
4. Result type matching user intent
"""

from dataclasses import dataclass
from typing import List, Optional
import numpy as np


@dataclass
class SearchResult:
    id: str
    type: str  # 'task', 'project', 'grant', 'publication', 'navigation'
    title: str
    score: float = 0.0  # Base relevance score
    features: dict = None  # Ranking features


@dataclass
class SearchContext:
    user_id: str
    workspace_id: str
    query: str
    timestamp: str
    page_context: str  # Current page user is on
```

### 4.2 Feature Engineering for Ranking

```python
# services/ai/app/models/search_features.py

"""
Search Ranking Features

Feature Categories:
1. Query-Document Relevance
2. User Personalization
3. Temporal Signals
4. Contextual Signals
"""

from typing import Dict, List
import re
import numpy as np


def compute_ranking_features(
    query: str,
    result: SearchResult,
    user_history: List[Dict],
    context: SearchContext,
) -> Dict[str, float]:
    """
    Compute features for a single query-result pair.

    Returns dictionary of feature name -> value.
    """
    features = {}

    # === Query-Document Relevance ===

    # Exact match in title
    features['title_exact_match'] = float(
        query.lower() in result.title.lower()
    )

    # Token overlap (Jaccard similarity)
    query_tokens = set(query.lower().split())
    title_tokens = set(result.title.lower().split())
    features['title_token_overlap'] = len(query_tokens & title_tokens) / len(query_tokens | title_tokens) if query_tokens | title_tokens else 0

    # Character n-gram similarity (for typo tolerance)
    features['char_ngram_similarity'] = _compute_ngram_similarity(query, result.title, n=3)

    # Title length (shorter titles often more relevant)
    features['title_length'] = len(result.title)
    features['title_word_count'] = len(result.title.split())

    # === User Personalization ===

    # User has selected this exact result before
    user_selections = [h['result_id'] for h in user_history if h.get('selected')]
    features['user_previously_selected'] = float(result.id in user_selections)

    # User frequently selects this result type
    type_counts = {}
    for h in user_history:
        if h.get('selected'):
            type_counts[h.get('result_type', '')] = type_counts.get(h.get('result_type', ''), 0) + 1
    total_selections = sum(type_counts.values())
    features['user_type_preference'] = type_counts.get(result.type, 0) / total_selections if total_selections > 0 else 0.25

    # === Temporal Signals ===

    # Result recency (if applicable)
    if hasattr(result, 'updated_at'):
        from datetime import datetime, timedelta
        updated_at = datetime.fromisoformat(result.updated_at)
        now = datetime.now()
        days_ago = (now - updated_at).days
        features['days_since_update'] = days_ago
        features['updated_this_week'] = float(days_ago <= 7)
    else:
        features['days_since_update'] = 365  # Default for static results
        features['updated_this_week'] = 0

    # === Contextual Signals ===

    # Result type matches current page context
    context_type_map = {
        '/today': ['task'],
        '/projects': ['project'],
        '/grants': ['grant'],
        '/publications': ['publication'],
    }
    expected_types = context_type_map.get(context.page_context, [])
    features['type_matches_context'] = float(result.type in expected_types)

    # Result type indicator (one-hot)
    for result_type in ['task', 'project', 'grant', 'publication', 'navigation']:
        features[f'type_{result_type}'] = float(result.type == result_type)

    return features


def _compute_ngram_similarity(s1: str, s2: str, n: int = 3) -> float:
    """Compute character n-gram Jaccard similarity."""
    def get_ngrams(s, n):
        s = s.lower()
        return set(s[i:i+n] for i in range(len(s) - n + 1))

    ngrams1 = get_ngrams(s1, n)
    ngrams2 = get_ngrams(s2, n)

    if not ngrams1 or not ngrams2:
        return 0.0

    intersection = len(ngrams1 & ngrams2)
    union = len(ngrams1 | ngrams2)

    return intersection / union if union > 0 else 0.0
```

### 4.3 Ranking Model Training

```python
# services/ai/app/models/search_ranker.py

"""
Search Ranking Model

Uses LambdaMART (gradient boosted trees optimized for ranking).

For simplicity and interpretability in MVP, using a linear scoring model
with tuned weights.
"""

import numpy as np
from typing import List, Dict
from dataclasses import dataclass


@dataclass
class RankingWeights:
    """Manually tuned weights for MVP ranking model."""
    title_exact_match: float = 5.0
    title_token_overlap: float = 3.0
    char_ngram_similarity: float = 1.5
    user_previously_selected: float = 2.0
    user_type_preference: float = 1.0
    updated_this_week: float = 0.5
    type_matches_context: float = 1.5
    # Penalties
    title_length: float = -0.01  # Slight penalty for long titles
    days_since_update: float = -0.005


class SearchRanker:
    """
    Ranks search results based on relevance and personalization.

    MVP: Linear scoring model with manually tuned weights
    Future: Train LambdaMART on click-through data
    """

    def __init__(self, weights: RankingWeights = None):
        self.weights = weights or RankingWeights()

    def score(self, features: Dict[str, float]) -> float:
        """Compute ranking score from features."""
        score = 0.0

        for feature_name, weight in vars(self.weights).items():
            if feature_name in features:
                score += weight * features[feature_name]

        return score

    def rank(
        self,
        results: List[SearchResult],
        features_list: List[Dict[str, float]],
    ) -> List[SearchResult]:
        """
        Rank results by computed scores.

        Returns results sorted by score descending.
        """
        scored_results = []

        for result, features in zip(results, features_list):
            result.score = self.score(features)
            scored_results.append(result)

        return sorted(scored_results, key=lambda r: r.score, reverse=True)


class SearchRankingMetrics:
    """
    Evaluation metrics for search ranking quality.
    """

    @staticmethod
    def mean_reciprocal_rank(rankings: List[int]) -> float:
        """
        Calculate MRR from a list of positions where the "correct" result appeared.

        rankings: List of 1-indexed positions (e.g., [1, 3, 2, 1] means
                  correct result was at position 1, 3, 2, 1 for 4 queries)

        Returns: MRR score (0 to 1, higher is better)
        """
        if not rankings:
            return 0.0

        reciprocal_ranks = [1.0 / r for r in rankings if r > 0]
        return np.mean(reciprocal_ranks) if reciprocal_ranks else 0.0

    @staticmethod
    def precision_at_k(
        relevant: List[str],
        retrieved: List[str],
        k: int,
    ) -> float:
        """
        Calculate precision@k.

        relevant: List of relevant result IDs
        retrieved: List of retrieved result IDs in rank order
        k: Number of top results to consider
        """
        retrieved_k = retrieved[:k]
        relevant_retrieved = len(set(relevant) & set(retrieved_k))
        return relevant_retrieved / k if k > 0 else 0.0
```

### 4.4 Integration with Search API

```typescript
// lib/search/search-ranking.ts

/**
 * Search Ranking Integration
 *
 * Integrates ranking model with search API.
 *
 * Flow:
 * 1. Fetch raw results from database
 * 2. Compute features for each result
 * 3. Score and rank results
 * 4. Return ranked results to client
 */

interface RankingFeatures {
  titleExactMatch: number;
  titleTokenOverlap: number;
  userPreviouslySelected: number;
  userTypePreference: number;
  typeMatchesContext: number;
  updatedThisWeek: number;
}

const RANKING_WEIGHTS = {
  titleExactMatch: 5.0,
  titleTokenOverlap: 3.0,
  userPreviouslySelected: 2.0,
  userTypePreference: 1.0,
  typeMatchesContext: 1.5,
  updatedThisWeek: 0.5,
};

export function computeRankingScore(features: RankingFeatures): number {
  let score = 0;

  for (const [feature, weight] of Object.entries(RANKING_WEIGHTS)) {
    const featureValue = features[feature as keyof RankingFeatures] ?? 0;
    score += weight * featureValue;
  }

  return score;
}

export function rankSearchResults<T extends { id: string; title: string }>(
  results: T[],
  query: string,
  userHistory: Array<{ result_id: string; selected: boolean; result_type: string }>,
  context: { pageContext: string },
): T[] {
  const scoredResults = results.map(result => {
    const features = computeFeatures(result, query, userHistory, context);
    const score = computeRankingScore(features);
    return { ...result, _score: score };
  });

  return scoredResults.sort((a, b) => b._score - a._score);
}

function computeFeatures<T extends { id: string; title: string }>(
  result: T,
  query: string,
  userHistory: Array<{ result_id: string; selected: boolean; result_type: string }>,
  context: { pageContext: string },
): RankingFeatures {
  // Exact match
  const titleExactMatch = result.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

  // Token overlap
  const queryTokens = new Set(query.toLowerCase().split(/\s+/));
  const titleTokens = new Set(result.title.toLowerCase().split(/\s+/));
  const overlap = [...queryTokens].filter(t => titleTokens.has(t)).length;
  const union = new Set([...queryTokens, ...titleTokens]).size;
  const titleTokenOverlap = union > 0 ? overlap / union : 0;

  // User history
  const selectedIds = userHistory.filter(h => h.selected).map(h => h.result_id);
  const userPreviouslySelected = selectedIds.includes(result.id) ? 1 : 0;

  // Type preference
  const typeCounts: Record<string, number> = {};
  userHistory.filter(h => h.selected).forEach(h => {
    typeCounts[h.result_type] = (typeCounts[h.result_type] || 0) + 1;
  });
  const totalSelections = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  const resultType = (result as any).type || 'unknown';
  const userTypePreference = totalSelections > 0
    ? (typeCounts[resultType] || 0) / totalSelections
    : 0.25;

  // Context matching
  const contextTypeMap: Record<string, string[]> = {
    '/today': ['task'],
    '/projects': ['project'],
    '/grants': ['grant'],
  };
  const expectedTypes = contextTypeMap[context.pageContext] || [];
  const typeMatchesContext = expectedTypes.includes(resultType) ? 1 : 0;

  // Recency (placeholder - would need actual timestamp)
  const updatedThisWeek = 0; // TODO: Compute from result.updated_at

  return {
    titleExactMatch,
    titleTokenOverlap,
    userPreviouslySelected,
    userTypePreference,
    typeMatchesContext,
    updatedThisWeek,
  };
}
```

---

## 5. Usage Pattern Analysis

### 5.1 Recurring Task Analysis Framework

```python
# services/ai/app/analytics/recurring_tasks.py

"""
Recurring Task Usage Pattern Analysis

Goals:
1. Understand how users create recurring tasks
2. Identify common recurrence patterns
3. Measure completion rates for recurring vs one-time tasks
4. Analyze edit/delete patterns for recurring series
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from collections import Counter


def analyze_recurring_task_adoption(
    tasks_df: pd.DataFrame,
    users_df: pd.DataFrame,
) -> Dict:
    """
    Analyze adoption of recurring tasks feature.

    Returns:
        - adoption_rate: % of users who created at least one recurring task
        - recurring_task_rate: % of all tasks that are recurring
        - average_recurring_per_user: Mean recurring tasks per adopter
        - adoption_by_user_tenure: Adoption rate by days since signup
    """
    # Users with at least one recurring task
    recurring_users = tasks_df[tasks_df['is_recurring'] == True]['user_id'].unique()
    all_users = users_df['id'].unique()

    adoption_rate = len(recurring_users) / len(all_users) if len(all_users) > 0 else 0

    # Recurring task rate
    total_tasks = len(tasks_df)
    recurring_tasks = len(tasks_df[tasks_df['is_recurring'] == True])
    recurring_task_rate = recurring_tasks / total_tasks if total_tasks > 0 else 0

    # Average per adopter
    recurring_per_user = (
        tasks_df[tasks_df['is_recurring'] == True]
        .groupby('user_id')
        .size()
        .mean()
    )

    return {
        'adoption_rate': adoption_rate,
        'recurring_task_rate': recurring_task_rate,
        'average_recurring_per_user': recurring_per_user,
        'total_recurring_tasks': recurring_tasks,
        'total_adopters': len(recurring_users),
    }


def analyze_recurrence_patterns(tasks_df: pd.DataFrame) -> Dict:
    """
    Analyze common recurrence patterns.

    Parses RRULE strings to extract frequency distributions.
    """
    recurring_tasks = tasks_df[tasks_df['is_recurring'] == True].copy()

    # Parse frequency from RRULE
    def extract_frequency(rrule: str) -> str:
        if pd.isna(rrule):
            return 'unknown'
        if 'FREQ=DAILY' in rrule:
            return 'daily'
        elif 'FREQ=WEEKLY' in rrule:
            return 'weekly'
        elif 'FREQ=MONTHLY' in rrule:
            return 'monthly'
        elif 'FREQ=YEARLY' in rrule:
            return 'yearly'
        return 'unknown'

    recurring_tasks['frequency'] = recurring_tasks['recurrence_rule'].apply(extract_frequency)

    frequency_distribution = recurring_tasks['frequency'].value_counts(normalize=True).to_dict()

    # Analyze weekday preferences for weekly tasks
    def extract_weekdays(rrule: str) -> List[str]:
        if pd.isna(rrule) or 'BYDAY=' not in rrule:
            return []
        # Extract BYDAY value
        import re
        match = re.search(r'BYDAY=([A-Z,]+)', rrule)
        if match:
            return match.group(1).split(',')
        return []

    weekly_tasks = recurring_tasks[recurring_tasks['frequency'] == 'weekly']
    weekday_counts = Counter()
    for rrule in weekly_tasks['recurrence_rule']:
        weekdays = extract_weekdays(rrule)
        weekday_counts.update(weekdays)

    return {
        'frequency_distribution': frequency_distribution,
        'popular_weekdays': dict(weekday_counts.most_common(7)),
        'total_recurring_tasks': len(recurring_tasks),
    }


def analyze_completion_rates(tasks_df: pd.DataFrame) -> Dict:
    """
    Compare completion rates: recurring instances vs one-time tasks.

    Hypothesis: Recurring tasks may have higher completion rates due to habit formation.
    """
    # Identify recurring instances (has recurrence_parent_id)
    is_instance = tasks_df['recurrence_parent_id'].notna()

    # One-time tasks (not recurring and not an instance)
    is_one_time = ~tasks_df['is_recurring'] & ~is_instance

    # Completion rates
    instance_completion = (
        tasks_df[is_instance]['status'].isin(['done', 'completed']).mean()
        if is_instance.any() else 0
    )

    one_time_completion = (
        tasks_df[is_one_time]['status'].isin(['done', 'completed']).mean()
        if is_one_time.any() else 0
    )

    # Statistical test
    from scipy.stats import chi2_contingency

    instance_done = tasks_df[is_instance]['status'].isin(['done', 'completed']).sum()
    instance_not_done = is_instance.sum() - instance_done
    one_time_done = tasks_df[is_one_time]['status'].isin(['done', 'completed']).sum()
    one_time_not_done = is_one_time.sum() - one_time_done

    contingency = [
        [instance_done, instance_not_done],
        [one_time_done, one_time_not_done],
    ]

    try:
        chi2, p_value, dof, expected = chi2_contingency(contingency)
        is_significant = p_value < 0.05
    except ValueError:
        chi2, p_value, is_significant = None, None, None

    return {
        'instance_completion_rate': instance_completion,
        'one_time_completion_rate': one_time_completion,
        'lift': (instance_completion - one_time_completion) / one_time_completion if one_time_completion > 0 else None,
        'p_value': p_value,
        'is_statistically_significant': is_significant,
        'sample_sizes': {
            'recurring_instances': int(is_instance.sum()),
            'one_time_tasks': int(is_one_time.sum()),
        },
    }
```

---

## 6. Feature Validation Framework

### 6.1 Pre/Post Analysis Template

```python
# services/ai/app/analytics/feature_validation.py

"""
Feature Validation Framework

Provides templates for validating Phase 9B features:
1. Onboarding completion rate lift
2. Search engagement improvement
3. Recurring task adoption and retention impact
"""

from dataclasses import dataclass
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from scipy import stats


@dataclass
class ValidationResult:
    feature_name: str
    metric_name: str
    baseline_value: float
    current_value: float
    lift: float
    confidence_interval: tuple
    p_value: float
    is_significant: bool
    sample_size: int
    recommendation: str


class FeatureValidator:
    """
    Validates feature impact using pre/post analysis or cohort comparison.
    """

    def __init__(self, significance_level: float = 0.05):
        self.alpha = significance_level

    def validate_conversion_lift(
        self,
        feature_name: str,
        metric_name: str,
        pre_conversions: int,
        pre_total: int,
        post_conversions: int,
        post_total: int,
    ) -> ValidationResult:
        """
        Validate lift in a conversion metric (e.g., onboarding completion rate).

        Uses two-proportion z-test.
        """
        p_pre = pre_conversions / pre_total if pre_total > 0 else 0
        p_post = post_conversions / post_total if post_total > 0 else 0

        lift = (p_post - p_pre) / p_pre if p_pre > 0 else float('inf')

        # Two-proportion z-test
        p_pooled = (pre_conversions + post_conversions) / (pre_total + post_total)
        se = np.sqrt(p_pooled * (1 - p_pooled) * (1/pre_total + 1/post_total))

        z = (p_post - p_pre) / se if se > 0 else 0
        p_value = 2 * (1 - stats.norm.cdf(abs(z)))

        # Confidence interval for lift
        z_critical = stats.norm.ppf(1 - self.alpha / 2)
        se_diff = np.sqrt(
            p_pre * (1 - p_pre) / pre_total +
            p_post * (1 - p_post) / post_total
        )
        ci_lower = ((p_post - p_pre) - z_critical * se_diff) / p_pre if p_pre > 0 else 0
        ci_upper = ((p_post - p_pre) + z_critical * se_diff) / p_pre if p_pre > 0 else 0

        is_significant = p_value < self.alpha

        if is_significant and lift > 0:
            recommendation = "Feature is driving positive lift. Continue and optimize."
        elif is_significant and lift < 0:
            recommendation = "Feature is hurting metrics. Investigate and iterate."
        else:
            recommendation = "No significant effect detected. Need more data or larger effect."

        return ValidationResult(
            feature_name=feature_name,
            metric_name=metric_name,
            baseline_value=p_pre,
            current_value=p_post,
            lift=lift,
            confidence_interval=(ci_lower, ci_upper),
            p_value=p_value,
            is_significant=is_significant,
            sample_size=pre_total + post_total,
            recommendation=recommendation,
        )

    def validate_engagement_lift(
        self,
        feature_name: str,
        metric_name: str,
        pre_values: List[float],
        post_values: List[float],
    ) -> ValidationResult:
        """
        Validate lift in a continuous engagement metric (e.g., session duration).

        Uses Welch's t-test (unequal variances).
        """
        mean_pre = np.mean(pre_values)
        mean_post = np.mean(post_values)

        lift = (mean_post - mean_pre) / mean_pre if mean_pre > 0 else float('inf')

        # Welch's t-test
        t_stat, p_value = stats.ttest_ind(post_values, pre_values, equal_var=False)

        # Confidence interval
        se_pre = stats.sem(pre_values)
        se_post = stats.sem(post_values)
        se_diff = np.sqrt(se_pre**2 + se_post**2)

        t_critical = stats.t.ppf(1 - self.alpha / 2, df=min(len(pre_values), len(post_values)) - 1)
        ci_lower = ((mean_post - mean_pre) - t_critical * se_diff) / mean_pre if mean_pre > 0 else 0
        ci_upper = ((mean_post - mean_pre) + t_critical * se_diff) / mean_pre if mean_pre > 0 else 0

        is_significant = p_value < self.alpha

        if is_significant and lift > 0:
            recommendation = "Significant positive engagement lift detected."
        elif is_significant and lift < 0:
            recommendation = "Significant negative engagement impact detected."
        else:
            recommendation = "No significant effect. Consider longer observation period."

        return ValidationResult(
            feature_name=feature_name,
            metric_name=metric_name,
            baseline_value=mean_pre,
            current_value=mean_post,
            lift=lift,
            confidence_interval=(ci_lower, ci_upper),
            p_value=p_value,
            is_significant=is_significant,
            sample_size=len(pre_values) + len(post_values),
            recommendation=recommendation,
        )
```

### 6.2 Phase 9B Validation Specifications

```python
# services/ai/app/analytics/phase9b_validation.py

"""
Phase 9B Feature Validation Specifications

Each feature has defined:
1. Primary metric
2. Success threshold
3. Sample size requirements
4. Observation period
"""

from dataclasses import dataclass
from typing import List


@dataclass
class ValidationSpec:
    feature_name: str
    sprint: int
    primary_metric: str
    baseline_estimate: float
    success_threshold: float  # Minimum lift to declare success
    min_sample_size: int
    observation_days: int
    secondary_metrics: List[str]


PHASE_9B_VALIDATIONS = [
    ValidationSpec(
        feature_name="Progressive Onboarding",
        sprint=2,
        primary_metric="onboarding_completion_rate",
        baseline_estimate=0.40,  # 40% current estimate
        success_threshold=0.15,  # Need 15% relative lift (40% -> 46%)
        min_sample_size=500,     # Per cohort
        observation_days=30,
        secondary_metrics=[
            "onboarding_time_to_complete",
            "7_day_retention_rate",
            "first_task_creation_rate",
        ],
    ),
    ValidationSpec(
        feature_name="Command Palette",
        sprint=3,
        primary_metric="search_click_through_rate",
        baseline_estimate=None,  # No baseline (new feature)
        success_threshold=0.40,  # 40% CTR is success
        min_sample_size=1000,    # Search sessions
        observation_days=14,
        secondary_metrics=[
            "search_to_action_time_ms",
            "searches_per_user_per_day",
            "no_results_rate",
        ],
    ),
    ValidationSpec(
        feature_name="Recurring Tasks",
        sprint=5,
        primary_metric="recurring_task_adoption_rate",
        baseline_estimate=0,     # New feature
        success_threshold=0.30,  # 30% of active users
        min_sample_size=200,     # Active users
        observation_days=30,
        secondary_metrics=[
            "recurring_instance_completion_rate",
            "tasks_completed_per_user",
            "30_day_retention_rate",
        ],
    ),
]
```

---

## 7. Dashboard Specifications

### 7.1 Onboarding Analytics Dashboard

```sql
-- Dashboard Query: Onboarding Funnel (Last 30 Days)

WITH daily_cohorts AS (
  SELECT
    DATE(created_at) as cohort_date,
    id as user_id
  FROM profiles
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
),

funnel AS (
  SELECT
    c.cohort_date,
    c.user_id,
    p.onboarding_started_at IS NOT NULL as started,
    p.onboarding_step >= 2 as completed_profile,
    p.onboarding_step >= 3 as completed_workspace,
    p.onboarding_step >= 4 as completed_first_task,
    p.onboarding_completed as completed,
    p.onboarding_skipped as skipped
  FROM daily_cohorts c
  JOIN profiles p ON c.user_id = p.id
)

SELECT
  cohort_date,
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE started) as started,
  COUNT(*) FILTER (WHERE completed_profile) as completed_profile,
  COUNT(*) FILTER (WHERE completed_workspace) as completed_workspace,
  COUNT(*) FILTER (WHERE completed_first_task) as completed_first_task,
  COUNT(*) FILTER (WHERE completed) as completed,
  COUNT(*) FILTER (WHERE skipped) as skipped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / COUNT(*), 1) as completion_rate
FROM funnel
GROUP BY cohort_date
ORDER BY cohort_date DESC;
```

### 7.2 Search Analytics Dashboard

```sql
-- Dashboard Query: Search Performance (Last 7 Days)

WITH search_sessions AS (
  SELECT
    DATE(created_at) as search_date,
    user_id,
    query,
    result_type,
    selected,
    created_at
  FROM search_history
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)

SELECT
  search_date,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) as unique_searchers,
  COUNT(*) FILTER (WHERE selected = TRUE) as selections,
  ROUND(100.0 * COUNT(*) FILTER (WHERE selected = TRUE) / COUNT(*), 1) as ctr,
  COUNT(DISTINCT query) as unique_queries,

  -- Result type breakdown
  COUNT(*) FILTER (WHERE result_type = 'task') as task_results,
  COUNT(*) FILTER (WHERE result_type = 'project') as project_results,
  COUNT(*) FILTER (WHERE result_type = 'grant') as grant_results,
  COUNT(*) FILTER (WHERE result_type = 'navigation') as navigation_results

FROM search_sessions
GROUP BY search_date
ORDER BY search_date DESC;
```

### 7.3 Recurring Tasks Dashboard

```sql
-- Dashboard Query: Recurring Task Metrics

-- Adoption metrics
SELECT
  DATE(t.created_at) as date,
  COUNT(*) FILTER (WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL) as recurring_created,
  COUNT(DISTINCT user_id) FILTER (WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL) as users_creating,
  COUNT(*) FILTER (WHERE recurrence_parent_id IS NOT NULL) as instances_generated,
  COUNT(*) FILTER (WHERE recurrence_parent_id IS NOT NULL AND status IN ('done', 'completed')) as instances_completed
FROM tasks t
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(t.created_at)
ORDER BY date DESC;

-- Pattern distribution
SELECT
  CASE
    WHEN recurrence_rule LIKE '%FREQ=DAILY%' THEN 'daily'
    WHEN recurrence_rule LIKE '%FREQ=WEEKLY%' THEN 'weekly'
    WHEN recurrence_rule LIKE '%FREQ=MONTHLY%' THEN 'monthly'
    WHEN recurrence_rule LIKE '%FREQ=YEARLY%' THEN 'yearly'
    ELSE 'other'
  END as frequency,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM tasks
WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL
GROUP BY 1
ORDER BY count DESC;
```

---

## 8. ML Model Specifications

### 8.1 Model Card: Onboarding Completion Predictor

```yaml
# Model Card: Onboarding Completion Predictor

model_name: onboarding_completion_predictor
version: 1.0.0
type: binary_classification
framework: scikit-learn

intended_use:
  primary_use: Identify users at risk of not completing onboarding
  users: Product team, growth team
  out_of_scope: Individual user targeting without privacy review

training_data:
  source: profiles table + analytics events
  time_period: Last 90 days before model training
  samples: Minimum 500 completed + 500 not completed
  features: 10 features (see feature definitions)
  target: onboarding_completed within 7 days of signup

evaluation_metrics:
  primary: AUC-ROC
  secondary: [precision, recall, f1, log_loss]
  threshold: 0.5 for binary prediction

performance_thresholds:
  auc_roc: ">= 0.75"
  precision_at_recall_80: ">= 0.50"

fairness_considerations:
  - Model should not discriminate based on institution type
  - Performance should be consistent across signup sources
  - Regular fairness audits recommended

limitations:
  - Model trained on limited data during MVP phase
  - May not generalize to significantly different user populations
  - Requires retraining as onboarding flow changes

maintenance:
  retraining_frequency: monthly
  monitoring: daily prediction distribution monitoring
  alerts: Alert if prediction distribution shifts >2 std dev
```

### 8.2 Model Card: Search Ranking Model

```yaml
# Model Card: Search Ranking Model

model_name: search_ranking_model
version: 1.0.0
type: learning_to_rank (MVP: linear scoring)
framework: custom (TypeScript + Python)

intended_use:
  primary_use: Rank search results to maximize relevance
  users: All ScholarOS users via command palette
  out_of_scope: External search engine optimization

features:
  query_relevance:
    - title_exact_match
    - title_token_overlap
    - char_ngram_similarity
  personalization:
    - user_previously_selected
    - user_type_preference
  context:
    - type_matches_context
    - updated_this_week

evaluation_metrics:
  primary: Mean Reciprocal Rank (MRR)
  secondary: [CTR, precision@5, NDCG]

performance_thresholds:
  mrr: ">= 0.60"
  ctr: ">= 0.40"

latency_requirements:
  p50: "< 30ms"
  p99: "< 100ms"

limitations:
  - MVP uses manually tuned weights
  - Limited training data initially
  - May not capture complex query intent

maintenance:
  weight_tuning: quarterly based on click-through data
  monitoring: daily MRR and CTR tracking
  a_b_testing: Required for weight changes
```

---

## 9. Data Pipeline Architecture

### 9.1 Real-Time Analytics Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANALYTICS DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Client    │───▶│   API       │───▶│  Supabase   │───▶│  Dashboard  │  │
│  │   Events    │    │   Route     │    │  PostgreSQL │    │   Queries   │  │
│  │             │    │             │    │             │    │             │  │
│  │ (batched)   │    │ (validate)  │    │ (store)     │    │ (aggregate) │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                                     │                             │
│         │                                     ▼                             │
│         │                            ┌─────────────┐                       │
│         │                            │  ML Model   │                       │
│         │                            │  Training   │                       │
│         │                            │  (batch)    │                       │
│         │                            └─────────────┘                       │
│         │                                     │                             │
│         ▼                                     ▼                             │
│  ┌─────────────┐                     ┌─────────────┐                       │
│  │  sendBeacon │                     │  Model      │                       │
│  │  (unload)   │                     │  Serving    │                       │
│  └─────────────┘                     └─────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Batch Processing Pipeline (Future)

```python
# services/ai/app/pipelines/analytics_batch.py

"""
Batch Analytics Pipeline

Runs daily to:
1. Aggregate events into summary tables
2. Retrain ML models
3. Generate reports
4. Update dashboards

Note: For Phase 9B MVP, real-time queries are sufficient.
This pipeline would be implemented as usage scales.
"""

from datetime import datetime, timedelta
from typing import Dict


class AnalyticsBatchPipeline:
    """
    Daily batch pipeline for analytics processing.
    """

    def __init__(self, supabase_client, model_registry):
        self.db = supabase_client
        self.models = model_registry

    async def run_daily_pipeline(self, date: datetime) -> Dict:
        """
        Execute daily analytics pipeline.

        Steps:
        1. Aggregate yesterday's events
        2. Update funnel metrics
        3. Check model drift
        4. Retrain models if needed
        5. Generate daily report
        """
        results = {}

        # Step 1: Aggregate events
        results['event_aggregation'] = await self._aggregate_events(date)

        # Step 2: Update funnel metrics
        results['funnel_update'] = await self._update_funnel_metrics(date)

        # Step 3: Check model drift
        results['drift_check'] = await self._check_model_drift()

        # Step 4: Retrain if needed
        if results['drift_check']['needs_retrain']:
            results['retrain'] = await self._retrain_models()

        # Step 5: Generate report
        results['report'] = await self._generate_daily_report(date, results)

        return results

    async def _aggregate_events(self, date: datetime) -> Dict:
        """Aggregate events into summary tables."""
        # Implementation...
        pass

    async def _update_funnel_metrics(self, date: datetime) -> Dict:
        """Update funnel conversion metrics."""
        # Implementation...
        pass

    async def _check_model_drift(self) -> Dict:
        """Check if model predictions are drifting."""
        # Implementation...
        pass

    async def _retrain_models(self) -> Dict:
        """Retrain ML models with latest data."""
        # Implementation...
        pass

    async def _generate_daily_report(self, date: datetime, results: Dict) -> Dict:
        """Generate daily analytics report."""
        # Implementation...
        pass
```

---

## 10. Statistical Methodology

### 10.1 Sample Size Calculations

```python
# services/ai/app/analytics/sample_size.py

"""
Sample Size Calculations for Phase 9B Experiments
"""

# Onboarding Completion Rate Experiment
# Baseline: 40%
# MDE: 15% relative lift (40% -> 46%)
# Alpha: 0.05
# Power: 0.80

onboarding_sample_size = calculate_sample_size(
    baseline_rate=0.40,
    minimum_detectable_effect=0.15,
    alpha=0.05,
    power=0.80,
)
# Result: ~1,200 users per variant


# Search CTR Experiment (for ranking changes)
# Baseline: Assume 30% CTR
# MDE: 20% relative lift (30% -> 36%)
# Alpha: 0.05
# Power: 0.80

search_sample_size = calculate_sample_size(
    baseline_rate=0.30,
    minimum_detectable_effect=0.20,
    alpha=0.05,
    power=0.80,
)
# Result: ~650 searches per variant


# Recurring Task Adoption (feature flag rollout)
# Target: 30% adoption
# MDE: 10 percentage points (absolute)
# Observation: Count-based, not rate-based

recurring_task_observation = """
For adoption measurement:
- Monitor daily until 30% of active users have tried feature
- Weekly cohort analysis comparing adopters vs non-adopters on retention
- Target: 200+ adopters within 30 days for statistical power
"""
```

### 10.2 Multiple Testing Correction

```python
# services/ai/app/analytics/multiple_testing.py

"""
Multiple Testing Correction

When running multiple hypothesis tests, we need to correct for
the increased probability of false positives.

Phase 9B has 3 primary metrics (one per major feature).
Using Bonferroni correction for simplicity.
"""

from scipy import stats
import numpy as np


def bonferroni_correction(p_values: list, alpha: float = 0.05) -> dict:
    """
    Apply Bonferroni correction for multiple hypothesis tests.

    Args:
        p_values: List of p-values from individual tests
        alpha: Family-wise error rate

    Returns:
        Dict with adjusted alpha and significance results
    """
    n_tests = len(p_values)
    adjusted_alpha = alpha / n_tests

    results = []
    for i, p in enumerate(p_values):
        results.append({
            'test_index': i,
            'p_value': p,
            'adjusted_alpha': adjusted_alpha,
            'is_significant': p < adjusted_alpha,
        })

    return {
        'original_alpha': alpha,
        'n_tests': n_tests,
        'adjusted_alpha': adjusted_alpha,
        'results': results,
        'any_significant': any(r['is_significant'] for r in results),
    }


# Example for Phase 9B
# Testing 3 primary metrics:
# 1. Onboarding completion rate
# 2. Search CTR
# 3. Recurring task adoption rate

phase_9b_correction = bonferroni_correction(
    p_values=[0.03, 0.02, 0.04],  # Example p-values
    alpha=0.05,
)
# Adjusted alpha: 0.0167
# Need p < 0.0167 to declare significance
```

---

## 11. Integration with Backend

### 11.1 API Endpoints for Analytics

```typescript
// app/api/analytics/events/route.ts

/**
 * Analytics Event Ingestion API
 *
 * Receives batched events from client and stores in database.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_name: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
  session_id: z.string().min(1).max(100),
  workspace_id: z.string().uuid().optional(),
  properties: z.record(z.unknown()).default({}),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { events } = batchSchema.parse(body);

    // Add user_id to all events
    const eventsWithUser = events.map(event => ({
      ...event,
      user_id: user.id,
    }));

    // Insert events (table may not exist in MVP - use search_history as proxy)
    // In production, would insert to analytics_events table

    // For MVP: Just log and return success
    console.log(`[Analytics] Received ${events.length} events from user ${user.id}`);

    return NextResponse.json({
      success: true,
      events_received: events.length,
    });
  } catch (error) {
    console.error('[Analytics] Event ingestion error:', error);
    return NextResponse.json(
      { error: 'Invalid event data' },
      { status: 400 }
    );
  }
}
```

### 11.2 Analytics Hook for Components

```typescript
// lib/hooks/use-analytics.ts

/**
 * Analytics Hook
 *
 * Provides type-safe event tracking throughout the application.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useWorkspace } from '@/lib/hooks/use-workspace';

interface TrackOptions {
  immediate?: boolean;  // Skip batching
}

export function useAnalytics() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const sessionIdRef = useRef<string>(generateSessionId());
  const queueRef = useRef<AnalyticsEvent[]>([]);

  // Flush queue on unmount
  useEffect(() => {
    return () => {
      if (queueRef.current.length > 0) {
        navigator.sendBeacon?.(
          '/api/analytics/events',
          JSON.stringify({ events: queueRef.current })
        );
      }
    };
  }, []);

  const track = useCallback((
    eventName: string,
    properties: Record<string, unknown> = {},
    options: TrackOptions = {},
  ) => {
    if (!user) return;

    const event: AnalyticsEvent = {
      event_id: crypto.randomUUID(),
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: sessionIdRef.current,
      workspace_id: currentWorkspace?.id,
      properties,
    };

    if (options.immediate) {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }),
      });
    } else {
      queueRef.current.push(event);

      // Flush when queue is full
      if (queueRef.current.length >= 10) {
        const batch = queueRef.current.splice(0, 10);
        fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
        });
      }
    }
  }, [user, currentWorkspace]);

  // Typed event trackers
  const trackOnboarding = useCallback((
    event: keyof typeof ONBOARDING_EVENTS,
    properties: Record<string, unknown> = {},
  ) => {
    track(`onboarding_${event}`, properties);
  }, [track]);

  const trackSearch = useCallback((
    event: keyof typeof SEARCH_EVENTS,
    properties: Record<string, unknown> = {},
  ) => {
    track(`search_${event}`, properties);
  }, [track]);

  const trackRecurringTask = useCallback((
    event: keyof typeof RECURRING_TASK_EVENTS,
    properties: Record<string, unknown> = {},
  ) => {
    track(`recurring_task_${event}`, properties);
  }, [track]);

  return {
    track,
    trackOnboarding,
    trackSearch,
    trackRecurringTask,
  };
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## 12. Future ML Roadmap

### 12.1 Phase 10+ ML Opportunities

```markdown
## ML Opportunities Beyond Phase 9B

### Short-term (Phase 10)

1. **Personalized Task Prioritization**
   - Model: Multi-task learning for predicting task urgency
   - Features: Due date, category, past completion patterns
   - Impact: Improved Today/Upcoming views

2. **Smart Due Date Suggestions**
   - Model: Time-series forecasting for task completion
   - Features: Task type, user workload, historical patterns
   - Impact: Reduce overdue tasks

3. **Search Query Understanding**
   - Model: Intent classification (search vs navigate vs create)
   - Features: Query tokens, user context, session history
   - Impact: Better command palette UX

### Medium-term (Phase 11-12)

4. **Grant Recommendation System**
   - Model: Collaborative filtering + content-based hybrid
   - Features: User profile, past grants, publication history
   - Impact: Personalized grant discovery

5. **Workload Prediction**
   - Model: Time-series forecasting for task volume
   - Features: Historical patterns, calendar events, deadlines
   - Impact: Proactive workload management

6. **Document Understanding**
   - Model: NER + summarization for academic documents
   - Features: Document text, embeddings, metadata
   - Impact: Automated project tracking from papers

### Long-term (Phase 13+)

7. **Research Assistant Agent**
   - Model: LLM with RAG over user's documents
   - Features: All user content, external knowledge
   - Impact: AI-powered research support

8. **Collaboration Recommendations**
   - Model: Graph neural network for researcher networks
   - Features: Publication co-authorship, grant collaboration
   - Impact: Team formation suggestions
```

### 12.2 Data Collection Priorities

```markdown
## Data Collection Priorities for ML Roadmap

### Priority 1: Essential for Phase 9B
- [x] Onboarding funnel events
- [x] Search query and click data
- [x] Recurring task creation and completion

### Priority 2: Enables Phase 10 Features
- [ ] Task completion timestamps (for time prediction)
- [ ] User workload indicators (active task count)
- [ ] Detailed search session data (queries per session)

### Priority 3: Enables Long-term Features
- [ ] Document content and embeddings
- [ ] Grant application outcomes (awarded/rejected)
- [ ] Publication citation data
- [ ] Collaboration network data
```

---

## Appendix A: SQL Queries for Analytics

### A.1 Onboarding Cohort Analysis

```sql
-- Detailed cohort analysis for onboarding

WITH cohorts AS (
  SELECT
    DATE_TRUNC('week', created_at) AS cohort_week,
    id AS user_id,
    created_at AS signup_date
  FROM profiles
  WHERE created_at >= '2026-01-01'
),

metrics AS (
  SELECT
    c.cohort_week,
    c.user_id,
    p.onboarding_completed,
    p.onboarding_skipped,
    p.onboarding_step,
    EXTRACT(EPOCH FROM (p.onboarding_completed_at - c.signup_date)) / 3600 AS hours_to_complete,
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.user_id = c.user_id
        AND t.created_at > c.signup_date + INTERVAL '7 days'
    ) AS retained_7d
  FROM cohorts c
  JOIN profiles p ON c.user_id = p.id
)

SELECT
  cohort_week,
  COUNT(*) AS cohort_size,

  -- Onboarding metrics
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarding_completed) / COUNT(*), 1) AS completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarding_skipped) / COUNT(*), 1) AS skip_rate,
  ROUND(AVG(onboarding_step), 1) AS avg_step_reached,
  ROUND(AVG(hours_to_complete) FILTER (WHERE onboarding_completed), 1) AS avg_hours_to_complete,

  -- Retention metrics
  ROUND(100.0 * COUNT(*) FILTER (WHERE retained_7d) / COUNT(*), 1) AS retention_7d,
  ROUND(100.0 * COUNT(*) FILTER (WHERE retained_7d AND onboarding_completed) /
        NULLIF(COUNT(*) FILTER (WHERE onboarding_completed), 0), 1) AS retention_7d_completers,
  ROUND(100.0 * COUNT(*) FILTER (WHERE retained_7d AND NOT onboarding_completed) /
        NULLIF(COUNT(*) FILTER (WHERE NOT onboarding_completed), 0), 1) AS retention_7d_non_completers

FROM metrics
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

### A.2 Search Quality Metrics

```sql
-- Search quality metrics

WITH search_sessions AS (
  SELECT
    user_id,
    DATE(created_at) AS search_date,
    COUNT(*) AS queries,
    COUNT(*) FILTER (WHERE selected) AS selections,
    COUNT(DISTINCT query_normalized) AS unique_queries,
    MIN(created_at) AS session_start,
    MAX(created_at) AS session_end
  FROM search_history
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id, DATE(created_at)
)

SELECT
  search_date,
  COUNT(DISTINCT user_id) AS users,
  SUM(queries) AS total_queries,
  SUM(selections) AS total_selections,
  ROUND(100.0 * SUM(selections) / SUM(queries), 1) AS ctr,
  ROUND(AVG(queries), 1) AS avg_queries_per_user,
  ROUND(AVG(unique_queries), 1) AS avg_unique_queries_per_user,
  ROUND(AVG(EXTRACT(EPOCH FROM (session_end - session_start)) / 60), 1) AS avg_session_minutes
FROM search_sessions
GROUP BY search_date
ORDER BY search_date DESC;
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| AUC-ROC | Area Under the Receiver Operating Characteristic curve - measures classification model quality |
| CTR | Click-Through Rate - percentage of views that result in clicks |
| MRR | Mean Reciprocal Rank - average of 1/rank for correct results |
| MDE | Minimum Detectable Effect - smallest effect size an experiment can reliably detect |
| Cohort | Group of users who share a common characteristic (e.g., signup week) |
| Funnel | Sequence of steps users take toward a goal (e.g., onboarding) |
| Learning to Rank | ML approach for optimizing ranked lists |
| RRULE | Recurrence Rule - RFC 5545 standard for recurring events |

---

**Document Complete**

Data Scientist
January 14, 2026

---

*Implementation Notes:*
1. Analytics event collection is optional but strongly recommended
2. Start with dashboard queries; ML models can come later
3. Prioritize funnel visibility for onboarding over prediction models
4. Search ranking weights can be tuned manually before ML
5. Collect data from day one for future model training
