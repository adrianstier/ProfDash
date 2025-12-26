"""Project Agent for project management and tracking."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.agents.base import AgentCapability, AgentPlan, AgentResult, AgentTool, BaseAgent
from app.agents.types import AgentContext, AgentHandoff, AgentStatus, AgentType, SuggestedAction


# =============================================================================
# Project Agent Response Models
# =============================================================================

class ProjectSummary(BaseModel):
    """AI-generated project summary."""
    status_summary: str
    accomplishments: list[str]
    blockers: list[str]
    next_actions: list[str]
    health_score: int  # 0-100
    risk_factors: list[str] = []


class MilestoneSuggestion(BaseModel):
    """Suggested milestone for a project."""
    title: str
    description: str
    suggested_due_date: str | None = None
    dependencies: list[str] = []


class ProjectHealthAssessment(BaseModel):
    """Health assessment for a project."""
    health_score: int
    status: str  # healthy, at_risk, behind, stalled
    factors: list[dict[str, Any]]
    recommendations: list[str]


# =============================================================================
# Project Agent Tools
# =============================================================================

class SummarizeProjectTool(AgentTool):
    """Generate a summary of project status and progress."""

    name: str = "summarize_project"
    description: str = "Generate an AI summary of project status, accomplishments, and next steps"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "project_id": {"type": "string"},
            "include_tasks": {"type": "boolean", "default": True},
            "include_milestones": {"type": "boolean", "default": True}
        },
        "required": ["project_id"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> ProjectSummary:
        return ProjectSummary(
            status_summary="",
            accomplishments=[],
            blockers=[],
            next_actions=[],
            health_score=0
        )


class SuggestMilestonesTool(AgentTool):
    """Suggest milestones for a project."""

    name: str = "suggest_milestones"
    description: str = "Suggest key milestones based on project type and goals"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "project_type": {"type": "string", "enum": ["manuscript", "grant", "general"]},
            "project_title": {"type": "string"},
            "target_date": {"type": "string", "format": "date"}
        },
        "required": ["project_type", "project_title"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> list[MilestoneSuggestion]:
        return []


class AssessHealthTool(AgentTool):
    """Assess project health and identify risks."""

    name: str = "assess_health"
    description: str = "Analyze project health, identify risks, and suggest interventions"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "project_id": {"type": "string"},
            "threshold": {"type": "integer", "default": 70}
        },
        "required": ["project_id"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> ProjectHealthAssessment:
        return ProjectHealthAssessment(
            health_score=0,
            status="healthy",
            factors=[],
            recommendations=[]
        )


# =============================================================================
# Project Agent
# =============================================================================

class ProjectAgent(BaseAgent):
    """
    Agent specialized in project management for academic work.

    Capabilities:
    - Summarize project status and progress
    - Track and suggest milestones
    - Assess project health and risks
    - Link tasks to projects
    - Suggest next steps based on project stage
    """

    agent_type = AgentType.PROJECT
    name = "Project Manager"
    description = "Helps you manage academic projects, track progress, and stay on schedule"

    system_prompt = """You are the Project Manager for ScholarOS, an academic productivity platform.
Your role is to help academics manage their research projects effectively.

## Your Capabilities
- Summarize project status with accomplishments and blockers
- Track milestones and suggest new ones based on project type
- Assess project health and identify risks
- Link related tasks to projects
- Suggest next steps based on current stage

## Project Types in ScholarOS

### Manuscript Projects
Stages: idea → outline → drafting → internal-review → submission → revision → accepted → published

Key milestones by stage:
- Idea: Literature review complete, hypothesis defined
- Outline: Structure finalized, co-authors confirmed
- Drafting: First draft complete, figures ready
- Internal-review: Feedback incorporated
- Submission: Journal selected, submitted
- Revision: Reviewer comments addressed

### Grant Projects
Stages: discovery → fit-assessment → intent-loi → drafting → internal-routing → submission → awarded → active → closeout

Key milestones:
- Discovery: RFP reviewed, team assembled
- Fit-assessment: Eligibility confirmed, fit score calculated
- Intent/LOI: Letter of intent submitted (if required)
- Drafting: Specific aims finalized, budget complete
- Internal-routing: Department approval, OSP review
- Submission: Complete application submitted
- Active: Reporting deadlines, expenditure tracking

### General Projects
Flexible stages based on project type (course development, committee work, etc.)

## Health Score Factors
- Task completion rate (completed/total tasks)
- Milestone progress (on-time vs delayed)
- Days since last activity
- Upcoming deadline proximity
- Blocker count

Health Score Interpretation:
- 80-100: Healthy - On track
- 60-79: Needs attention - Some concerns
- 40-59: At risk - Intervention needed
- 0-39: Critical - Immediate action required

## Guidelines
1. Consider the academic calendar when suggesting milestones
2. Account for peer review timelines in manuscript projects
3. Be aware of grant submission cycles and agency deadlines
4. Suggest realistic timelines based on typical academic workloads
5. Identify dependencies between milestones and tasks

Be encouraging but realistic about project status."""

    capabilities = [
        AgentCapability(
            name="summarize_project",
            description="Generate an AI summary of project status and next steps"
        ),
        AgentCapability(
            name="suggest_milestones",
            description="Suggest key milestones based on project type and goals"
        ),
        AgentCapability(
            name="assess_health",
            description="Analyze project health and identify risks"
        ),
        AgentCapability(
            name="link_tasks",
            description="Suggest which tasks should be linked to a project"
        ),
        AgentCapability(
            name="suggest_next_steps",
            description="Recommend next actions based on project stage"
        ),
    ]

    tools = [
        SummarizeProjectTool(),
        SuggestMilestonesTool(),
        AssessHealthTool(),
    ]

    temperature = 0.4
    max_tokens = 3500

    def _get_routing_keywords(self) -> list[str]:
        """Keywords for routing decisions."""
        return [
            "project", "manuscript", "paper", "research",
            "milestone", "progress", "status", "summary",
            "health", "risk", "deadline", "stage",
            "publication", "submission", "revision",
            "track", "update", "next steps"
        ]

    def should_handoff(self, request: str, context: AgentContext) -> AgentHandoff | None:
        """Check if request should be handed to another agent."""
        request_lower = request.lower()

        # Handoff to grant agent for grant-specific queries
        if any(kw in request_lower for kw in ["grant proposal", "funding", "nih", "nsf", "budget", "specific aims"]):
            return AgentHandoff(
                from_agent=self.agent_type,
                to_agent=AgentType.GRANT,
                reason="Request involves grant-specific details",
                context={"original_request": request},
                preserve_history=True
            )

        # Handoff to writing agent for content creation
        if any(kw in request_lower for kw in ["write", "draft", "abstract", "introduction", "methods"]):
            return AgentHandoff(
                from_agent=self.agent_type,
                to_agent=AgentType.WRITING,
                reason="Request involves content creation",
                context={"original_request": request},
                preserve_history=True
            )

        return None

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        """Create a plan for handling the project request."""
        request_lower = request.lower()

        steps = []
        required_tools = []

        if any(kw in request_lower for kw in ["summary", "status", "progress", "update"]):
            steps.append("Generate project summary with accomplishments and blockers")
            required_tools.append("summarize_project")

        if any(kw in request_lower for kw in ["milestone", "stage", "next step"]):
            steps.append("Suggest relevant milestones")
            required_tools.append("suggest_milestones")

        if any(kw in request_lower for kw in ["health", "risk", "concern", "problem"]):
            steps.append("Assess project health and risks")
            required_tools.append("assess_health")

        if not steps:
            steps.append("Provide project management guidance")

        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Assist with project: {request[:100]}",
            steps=steps,
            required_tools=required_tools,
            estimated_complexity=min(len(steps) + 1, 5)
        )

    async def execute(
        self,
        request: str,
        context: AgentContext,
        plan: AgentPlan | None = None
    ) -> AgentResult:
        """Execute the project management request."""
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            # Build context about user's projects
            project_context = ""
            if context.user_projects:
                project_count = len(context.user_projects)
                active_projects = [p for p in context.user_projects if p.get("status") == "active"]
                project_context = f"\n\nUser has {project_count} projects ({len(active_projects)} active)."

                if len(active_projects) <= 5:
                    for p in active_projects[:5]:
                        project_context += f"\n- {p.get('title', 'Untitled')} ({p.get('type', 'general')}, {p.get('stage', 'unknown stage')})"

            # Check if a specific project is being discussed
            active_project = None
            if context.active_project_id:
                active_project = next(
                    (p for p in context.user_projects if p.get("id") == context.active_project_id),
                    None
                )
                if active_project:
                    project_context += f"\n\nCurrently discussing: {active_project.get('title')}"
                    project_context += f"\nType: {active_project.get('type')}"
                    project_context += f"\nStage: {active_project.get('stage')}"

            prompt = f"""User Request: {request}
{project_context}

Please help with this project management request. Provide specific, actionable guidance.
If summarizing, include accomplishments, blockers, and clear next steps.
If suggesting milestones, explain why each milestone is important."""

            response, tool_calls = await self._call_llm(prompt, context)

            # Execute any tool calls
            tool_results = []
            for tc in tool_calls:
                result = await self.execute_tool(tc, context)
                tool_results.append(result)

            suggested_actions = self._build_suggested_actions(request, active_project)

            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            self.status = AgentStatus.COMPLETED
            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.COMPLETED,
                output={"response": response},
                tool_calls=tool_calls,
                tool_results=tool_results,
                suggested_actions=suggested_actions,
                execution_time_ms=execution_time
            )

        except Exception as e:
            self.status = AgentStatus.FAILED
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.FAILED,
                output={"response": f"I encountered an error: {str(e)}"},
                error=str(e),
                execution_time_ms=execution_time
            )

    def _build_suggested_actions(self, request: str, project: dict | None) -> list[SuggestedAction]:
        """Build suggested follow-up actions."""
        actions = []

        if project:
            actions.append(SuggestedAction(
                label="View project",
                action="navigate",
                params={"route": f"/projects/{project.get('id')}"}
            ))
            actions.append(SuggestedAction(
                label="Add milestone",
                action="add_milestone",
                params={"project_id": project.get("id")}
            ))

        actions.append(SuggestedAction(
            label="View all projects",
            action="navigate",
            params={"route": "/projects"}
        ))

        return actions
