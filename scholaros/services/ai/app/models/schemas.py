"""Pydantic schemas for request/response models."""

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


# Task Extraction Models
class ExtractTasksRequest(BaseModel):
    """Request to extract tasks from text."""

    text: str = Field(..., min_length=10, max_length=10000, description="Text to extract tasks from")
    context: Optional[str] = Field(
        None, max_length=500, description="Optional context about the text source"
    )


class ExtractedTask(BaseModel):
    """A task extracted from text."""

    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Literal["p1", "p2", "p3", "p4"] = Field(
        "p3", description="p1=urgent, p2=high, p3=medium, p4=low"
    )
    category: Literal[
        "research",
        "teaching",
        "grants",
        "grad-mentorship",
        "undergrad-mentorship",
        "admin",
        "misc",
    ] = Field("misc")
    due_date: Optional[date] = Field(None, description="Suggested due date if mentioned")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence score for this extraction"
    )


class ExtractTasksResponse(BaseModel):
    """Response containing extracted tasks."""

    tasks: list[ExtractedTask]
    source_summary: str = Field(..., description="Brief summary of the input text")


# Project Summary Models
class ProjectContext(BaseModel):
    """Context about a project for summarization."""

    title: str
    type: Literal["manuscript", "grant", "general"]
    status: str
    stage: Optional[str] = None
    summary: Optional[str] = None


class TaskContext(BaseModel):
    """Context about tasks for summarization."""

    title: str
    status: Literal["todo", "progress", "done"]
    priority: Literal["p1", "p2", "p3", "p4"]
    due_date: Optional[date] = None


class MilestoneContext(BaseModel):
    """Context about milestones for summarization."""

    title: str
    due_date: Optional[date] = None
    completed: bool = False


class NoteContext(BaseModel):
    """Context about notes for summarization."""

    content: str
    created_at: str


class ProjectSummaryRequest(BaseModel):
    """Request to generate a project summary."""

    project: ProjectContext
    tasks: list[TaskContext] = Field(default_factory=list)
    milestones: list[MilestoneContext] = Field(default_factory=list)
    recent_notes: list[NoteContext] = Field(default_factory=list, max_length=10)


class ProjectSummaryResponse(BaseModel):
    """Response containing project summary."""

    status_summary: str = Field(..., description="One-paragraph status overview")
    accomplishments: list[str] = Field(..., description="Key accomplishments")
    blockers: list[str] = Field(default_factory=list, description="Current blockers or risks")
    next_actions: list[str] = Field(..., description="Suggested next actions")
    health_score: int = Field(
        ..., ge=0, le=100, description="Project health score (0-100)"
    )


# Grant Fit Scoring Models
class ResearcherProfile(BaseModel):
    """Profile of the researcher for fit scoring."""

    keywords: list[str] = Field(default_factory=list, description="Research keywords/topics")
    recent_projects: list[str] = Field(
        default_factory=list, description="Titles of recent projects"
    )
    funding_history: list[str] = Field(
        default_factory=list, description="Previous funding agencies"
    )
    institution_type: Optional[str] = Field(
        None, description="e.g., R1, teaching college, etc."
    )


class GrantOpportunity(BaseModel):
    """Grant opportunity details for fit scoring."""

    title: str
    agency: Optional[str] = None
    description: Optional[str] = None
    eligibility: Optional[str] = None
    funding_amount: Optional[str] = None
    deadline: Optional[str] = None


class FitScoreRequest(BaseModel):
    """Request to score grant fit."""

    opportunity: GrantOpportunity
    profile: ResearcherProfile


class FitScoreResponse(BaseModel):
    """Response containing fit score and analysis."""

    score: int = Field(..., ge=0, le=100, description="Overall fit score")
    reasons: list[str] = Field(..., description="Why this is a good fit")
    gaps: list[str] = Field(default_factory=list, description="Missing qualifications or concerns")
    suggestions: list[str] = Field(
        default_factory=list, description="How to strengthen application"
    )
    summary: str = Field(..., description="One-sentence fit assessment")
