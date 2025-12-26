"""Planner Agent for strategic planning and goal management."""

from datetime import datetime

from app.agents.base import AgentCapability, AgentPlan, AgentResult, BaseAgent
from app.agents.types import AgentContext, AgentHandoff, AgentStatus, AgentType


class PlannerAgent(BaseAgent):
    """
    Agent specialized in strategic planning and goal setting.
    Also serves as the fallback agent for general queries.
    """

    agent_type = AgentType.PLANNER
    name = "Planning Assistant"
    description = "Helps with goal setting, strategic planning, and general guidance"

    system_prompt = """You are the Planning Assistant for ScholarOS.
Your role is to help academics with strategic planning and when other agents aren't appropriate.

## Your Capabilities
- Set and break down long-term goals
- Create strategic plans for career development
- Analyze patterns and suggest improvements
- Generate weekly/monthly plans
- Provide general guidance when no specific agent fits

## Academic Career Considerations
- Research productivity (publications, grants)
- Teaching excellence
- Service and leadership
- Professional development
- Work-life balance

## Planning Horizons
- Daily: Task prioritization, time blocking
- Weekly: Progress review, upcoming deadlines
- Monthly: Milestone tracking, goal progress
- Quarterly: Strategic review, adjustments
- Annual: Career goals, development plans

## Guidelines
1. Balance short-term tasks with long-term goals
2. Consider the full academic lifecycle
3. Be realistic about capacity
4. Suggest prioritization when overwhelmed
5. Celebrate progress and milestones

When unsure which agent to use, provide helpful general guidance."""

    capabilities = [
        AgentCapability(name="create_goal", description="Create and track long-term goals"),
        AgentCapability(name="break_down_goal", description="Break goals into actionable steps"),
        AgentCapability(name="track_progress", description="Track progress toward goals"),
        AgentCapability(name="generate_plan", description="Generate weekly/monthly plans"),
        AgentCapability(name="analyze_patterns", description="Analyze productivity patterns"),
        AgentCapability(name="general_guidance", description="Provide general assistance"),
    ]

    tools = []
    temperature = 0.4
    max_tokens = 3500

    def _get_routing_keywords(self) -> list[str]:
        return ["plan", "goal", "strategy", "career", "long-term",
                "week", "month", "quarter", "year", "priorities",
                "help", "what should", "how do i", "advice"]

    def should_handoff(self, request: str, context: AgentContext) -> AgentHandoff | None:
        """Route specific requests to specialized agents."""
        request_lower = request.lower()

        # Check for specific agent domains
        handoff_map = [
            (["task", "todo", "action item", "extract from"], AgentType.TASK),
            (["project", "manuscript", "paper status"], AgentType.PROJECT),
            (["grant", "funding", "proposal", "nih", "nsf"], AgentType.GRANT),
            (["literature", "paper", "citation"], AgentType.RESEARCH),
            (["calendar", "schedule", "meeting", "availability"], AgentType.CALENDAR),
            (["write", "draft", "edit", "abstract"], AgentType.WRITING),
            (["student", "mentee", "lab member", "postdoc"], AgentType.PERSONNEL),
        ]

        for keywords, agent_type in handoff_map:
            if any(kw in request_lower for kw in keywords):
                return AgentHandoff(
                    from_agent=self.agent_type,
                    to_agent=agent_type,
                    reason=f"Request is more appropriate for {agent_type.value} agent",
                    context={"original_request": request},
                    preserve_history=True
                )

        return None

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Planning assistance: {request[:100]}",
            steps=["Analyze request and provide strategic guidance"],
            required_tools=[],
            estimated_complexity=2
        )

    async def execute(self, request: str, context: AgentContext, plan: AgentPlan | None = None) -> AgentResult:
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            # Provide comprehensive context
            full_context = ""
            if context.user_tasks:
                full_context += f"\nUser has {len(context.user_tasks)} tasks"
            if context.user_projects:
                full_context += f"\nUser has {len(context.user_projects)} projects"
            if context.working_memory.current_goal:
                full_context += f"\nCurrent goal: {context.working_memory.current_goal}"

            prompt = f"""User Request: {request}
{full_context}

Provide helpful, actionable guidance. If this request would be better handled by a specialized assistant
(tasks, projects, grants, research, calendar, writing, or personnel), mention that.
Otherwise, provide strategic planning support."""

            response, tool_calls = await self._call_llm(prompt, context)
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            self.status = AgentStatus.COMPLETED
            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.COMPLETED,
                output={"response": response},
                tool_calls=tool_calls,
                suggested_actions=[],
                execution_time_ms=execution_time
            )
        except Exception as e:
            self.status = AgentStatus.FAILED
            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.FAILED,
                output={"response": f"Error: {str(e)}"},
                error=str(e),
                execution_time_ms=0
            )
