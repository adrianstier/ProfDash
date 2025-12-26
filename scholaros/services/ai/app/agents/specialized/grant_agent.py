"""Grant Agent for grant discovery and writing assistance."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.agents.base import AgentCapability, AgentPlan, AgentResult, AgentTool, BaseAgent
from app.agents.types import AgentContext, AgentHandoff, AgentStatus, AgentType, SuggestedAction


# =============================================================================
# Grant Agent Response Models
# =============================================================================

class FitScoreResult(BaseModel):
    """Result of grant fit analysis."""
    score: int  # 0-100
    summary: str
    strengths: list[str]
    gaps: list[str]
    suggestions: list[str]
    eligibility_met: bool
    risk_factors: list[str] = []


class SpecificAimsDraft(BaseModel):
    """Draft of NIH-style specific aims."""
    opening_paragraph: str
    gap_statement: str
    hypothesis: str
    aims: list[dict[str, str]]
    impact_statement: str


class DeadlineAnalysis(BaseModel):
    """Analysis of grant deadlines."""
    upcoming_deadlines: list[dict[str, Any]]
    preparation_timeline: list[dict[str, str]]
    risk_assessment: str


# =============================================================================
# Grant Agent Tools
# =============================================================================

class AnalyzeFitTool(AgentTool):
    """Analyze fit between researcher profile and grant opportunity."""

    name: str = "analyze_fit"
    description: str = "Analyze how well a grant opportunity matches researcher's profile and expertise"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "opportunity": {
                "type": "object",
                "description": "Grant opportunity details"
            },
            "profile": {
                "type": "object",
                "description": "Researcher profile and expertise"
            }
        },
        "required": ["opportunity", "profile"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> FitScoreResult:
        return FitScoreResult(
            score=0,
            summary="",
            strengths=[],
            gaps=[],
            suggestions=[],
            eligibility_met=True
        )


class DraftSpecificAimsTool(AgentTool):
    """Draft NIH-style specific aims page."""

    name: str = "draft_specific_aims"
    description: str = "Generate a draft specific aims page based on research goals"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "research_area": {"type": "string"},
            "hypothesis": {"type": "string"},
            "num_aims": {"type": "integer", "default": 3},
            "grant_type": {"type": "string", "default": "R01"}
        },
        "required": ["research_area"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> SpecificAimsDraft:
        return SpecificAimsDraft(
            opening_paragraph="",
            gap_statement="",
            hypothesis="",
            aims=[],
            impact_statement=""
        )


class AnalyzeDeadlinesTool(AgentTool):
    """Analyze and track grant deadlines."""

    name: str = "analyze_deadlines"
    description: str = "Analyze upcoming deadlines and create preparation timeline"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "opportunity_ids": {
                "type": "array",
                "items": {"type": "string"}
            },
            "include_recurring": {"type": "boolean", "default": True}
        }
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> DeadlineAnalysis:
        return DeadlineAnalysis(
            upcoming_deadlines=[],
            preparation_timeline=[],
            risk_assessment=""
        )


# =============================================================================
# Grant Agent
# =============================================================================

class GrantAgent(BaseAgent):
    """
    Agent specialized in grant discovery and proposal writing.

    Capabilities:
    - Search and discover funding opportunities
    - Analyze fit between opportunities and researcher profile
    - Track deadlines and create preparation timelines
    - Draft proposal sections (specific aims, budget justification)
    - Check eligibility requirements
    """

    agent_type = AgentType.GRANT
    name = "Grant Assistant"
    description = "Helps you find grants, assess fit, and write proposals"

    system_prompt = """You are the Grant Assistant for ScholarOS, an academic productivity platform.
Your role is to help academics find funding and write successful grant proposals.

## Your Capabilities
- Search for relevant funding opportunities
- Analyze fit between opportunities and researcher profile
- Calculate fit scores based on research alignment and eligibility
- Track deadlines and create preparation timelines
- Draft proposal sections (specific aims, significance, budget justification)
- Check eligibility requirements

## Major Funding Agencies
- NIH (National Institutes of Health): R01, R21, R03, K awards, etc.
- NSF (National Science Foundation): CAREER, Standard grants, etc.
- DOE (Department of Energy)
- DOD (Department of Defense)
- Private foundations (Sloan, HHMI, etc.)

## NIH Grant Types
- R01: Traditional research project (up to 5 years, ~$250K-500K/year)
- R21: Exploratory/developmental (2 years, ~$275K total)
- R03: Small grants (2 years, ~$50K/year)
- K99/R00: Pathway to Independence
- F31/F32: Fellowships

## Fit Score Factors (0-100)
- Research area alignment (40%)
- Eligibility match (25%)
- Career stage appropriateness (15%)
- Funding history relevance (10%)
- Timeline feasibility (10%)

## Proposal Best Practices
1. Specific Aims Page - Most critical page
   - Hook: Why this problem matters
   - Gap: What's missing in current knowledge
   - Hypothesis: Clear, testable statement
   - Aims: 2-3 specific, achievable aims
   - Impact: Significance if successful

2. Budget Considerations
   - Personnel (often 60-70%)
   - Equipment and supplies
   - Travel (conferences, collaborations)
   - Indirect costs (institutional rate)

3. Common Mistakes to Avoid
   - Overly ambitious scope
   - Unclear significance
   - Weak preliminary data
   - Budget misalignment

## Guidelines
1. Be realistic about funding probability
2. Consider the full timeline from search to submission
3. Account for internal review processes
4. Suggest backup options when fit is marginal
5. Highlight both opportunities and concerns honestly

Be encouraging but honest about competitiveness."""

    capabilities = [
        AgentCapability(
            name="search_opportunities",
            description="Search for funding opportunities matching research interests"
        ),
        AgentCapability(
            name="analyze_fit",
            description="Analyze fit between opportunity and researcher profile"
        ),
        AgentCapability(
            name="track_deadlines",
            description="Track deadlines and create preparation timeline"
        ),
        AgentCapability(
            name="draft_specific_aims",
            description="Draft NIH-style specific aims page"
        ),
        AgentCapability(
            name="check_eligibility",
            description="Verify eligibility for a funding opportunity"
        ),
        AgentCapability(
            name="budget_assistance",
            description="Help with budget planning and justification"
        ),
    ]

    tools = [
        AnalyzeFitTool(),
        DraftSpecificAimsTool(),
        AnalyzeDeadlinesTool(),
    ]

    temperature = 0.4
    max_tokens = 4000

    def _get_routing_keywords(self) -> list[str]:
        """Keywords for routing decisions."""
        return [
            "grant", "funding", "proposal", "nih", "nsf", "r01", "r21",
            "specific aims", "budget", "eligibility", "deadline",
            "opportunity", "application", "submission", "award",
            "fellowship", "career", "k99", "f31"
        ]

    def should_handoff(self, request: str, context: AgentContext) -> AgentHandoff | None:
        """Check if request should be handed to another agent."""
        request_lower = request.lower()

        # Handoff to writing agent for extensive drafting
        if any(kw in request_lower for kw in ["write full", "complete draft", "significance section", "innovation"]):
            return AgentHandoff(
                from_agent=self.agent_type,
                to_agent=AgentType.WRITING,
                reason="Request involves extensive writing beyond specific aims",
                context={"original_request": request, "grant_context": True},
                preserve_history=True
            )

        # Handoff to research agent for literature support
        if any(kw in request_lower for kw in ["find papers", "literature", "preliminary data", "citations"]):
            return AgentHandoff(
                from_agent=self.agent_type,
                to_agent=AgentType.RESEARCH,
                reason="Request involves literature/research support",
                context={"original_request": request, "grant_context": True},
                preserve_history=True
            )

        return None

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        """Create a plan for handling the grant request."""
        request_lower = request.lower()

        steps = []
        required_tools = []

        if any(kw in request_lower for kw in ["fit", "match", "suitable", "good for me"]):
            steps.append("Analyze fit between opportunity and profile")
            required_tools.append("analyze_fit")

        if any(kw in request_lower for kw in ["specific aims", "aims page"]):
            steps.append("Draft specific aims page")
            required_tools.append("draft_specific_aims")

        if any(kw in request_lower for kw in ["deadline", "timeline", "when", "prepare"]):
            steps.append("Analyze deadlines and create timeline")
            required_tools.append("analyze_deadlines")

        if any(kw in request_lower for kw in ["search", "find", "discover", "opportunities"]):
            steps.append("Search for relevant funding opportunities")

        if not steps:
            steps.append("Provide grant-related guidance")

        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Assist with grants: {request[:100]}",
            steps=steps,
            required_tools=required_tools,
            estimated_complexity=min(len(steps) + 2, 5)
        )

    async def execute(
        self,
        request: str,
        context: AgentContext,
        plan: AgentPlan | None = None
    ) -> AgentResult:
        """Execute the grant-related request."""
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            # Build context about user's profile and grants
            grant_context = ""
            if context.user_profile:
                grant_context += f"\nResearcher Profile:"
                if context.user_profile.get("keywords"):
                    grant_context += f"\n- Research areas: {', '.join(context.user_profile.get('keywords', []))}"
                if context.user_profile.get("institution"):
                    grant_context += f"\n- Institution: {context.user_profile.get('institution')}"
                if context.user_profile.get("title"):
                    grant_context += f"\n- Position: {context.user_profile.get('title')}"

            prompt = f"""User Request: {request}
{grant_context}

Please help with this grant-related request. Be specific and actionable.
If analyzing fit, provide a clear score and rationale.
If drafting content, follow NIH conventions and best practices.
If discussing deadlines, create a realistic preparation timeline."""

            response, tool_calls = await self._call_llm(prompt, context)

            tool_results = []
            for tc in tool_calls:
                result = await self.execute_tool(tc, context)
                tool_results.append(result)

            suggested_actions = self._build_suggested_actions(request)

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

    def _build_suggested_actions(self, request: str) -> list[SuggestedAction]:
        """Build suggested follow-up actions."""
        request_lower = request.lower()
        actions = []

        if "fit" in request_lower or "opportunity" in request_lower:
            actions.append(SuggestedAction(
                label="Add to watchlist",
                action="add_to_watchlist",
                params={}
            ))

        actions.append(SuggestedAction(
            label="View grants",
            action="navigate",
            params={"route": "/grants"}
        ))

        actions.append(SuggestedAction(
            label="Create grant project",
            action="create_project",
            params={"type": "grant"}
        ))

        return actions
