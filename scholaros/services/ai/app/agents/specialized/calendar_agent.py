"""Calendar Agent for schedule management."""

from datetime import datetime
from typing import Any

from app.agents.base import AgentCapability, AgentPlan, AgentResult, BaseAgent
from app.agents.types import AgentContext, AgentStatus, AgentType


class CalendarAgent(BaseAgent):
    """Agent specialized in schedule and calendar management."""

    agent_type = AgentType.CALENDAR
    name = "Calendar Assistant"
    description = "Helps manage your schedule, meetings, and time blocking"

    system_prompt = """You are the Calendar Assistant for ScholarOS.
Your role is to help academics manage their time effectively.

## Your Capabilities
- Check availability and suggest meeting times
- Create time blocks for focused work
- Sync task deadlines with calendar
- Suggest optimal scheduling based on workload
- Track recurring meetings and commitments

## Academic Time Considerations
- Office hours and teaching schedules
- Research block time (protect mornings for deep work)
- Meeting-heavy vs meeting-free days
- Conference travel and deadlines
- Semester vs break time patterns

## Guidelines
1. Protect research time blocks
2. Buffer time between meetings
3. Consider energy levels throughout day
4. Account for preparation time
5. Leave flexibility for unexpected items"""

    capabilities = [
        AgentCapability(name="check_availability", description="Check calendar availability"),
        AgentCapability(name="schedule_meeting", description="Suggest meeting times"),
        AgentCapability(name="create_time_blocks", description="Create focused work blocks"),
        AgentCapability(name="sync_deadlines", description="Sync task deadlines with calendar"),
        AgentCapability(name="suggest_schedule", description="Suggest optimal weekly schedule"),
    ]

    tools = []
    temperature = 0.3
    max_tokens = 2500

    def _get_routing_keywords(self) -> list[str]:
        return ["calendar", "schedule", "meeting", "time", "availability",
                "block", "appointment", "busy", "free", "when"]

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Calendar management: {request[:100]}",
            steps=["Analyze scheduling request and provide guidance"],
            required_tools=[],
            estimated_complexity=2
        )

    async def execute(self, request: str, context: AgentContext, plan: AgentPlan | None = None) -> AgentResult:
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            calendar_context = ""
            if context.working_memory.mentioned_dates:
                calendar_context = f"\nMentioned dates: {', '.join(context.working_memory.mentioned_dates)}"

            prompt = f"""User Request: {request}
{calendar_context}

Help with this calendar/scheduling request. Be specific about times and dates."""

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
