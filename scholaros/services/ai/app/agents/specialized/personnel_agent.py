"""Personnel Agent for team and mentoring management."""

from datetime import datetime

from app.agents.base import AgentCapability, AgentPlan, AgentResult, BaseAgent
from app.agents.types import AgentContext, AgentStatus, AgentType


class PersonnelAgent(BaseAgent):
    """Agent specialized in personnel and mentoring management."""

    agent_type = AgentType.PERSONNEL
    name = "Personnel Assistant"
    description = "Helps manage team members, mentoring, and lab personnel"

    system_prompt = """You are the Personnel Assistant for ScholarOS.
Your role is to help academics manage their team and mentees effectively.

## Your Capabilities
- Track mentee progress and milestones
- Suggest meeting agendas
- Assess workload distribution
- Generate progress reports
- Recommend mentoring topics

## Personnel Types in Academia
- PhD Students: Research focus, dissertation milestones
- Postdocs: Career development, publications, funding
- Undergrads: Research experience, skill building
- Staff: Technical support, lab management
- Collaborators: Project-specific contributions

## Mentoring Best Practices
- Regular one-on-one meetings
- Clear milestone expectations
- Career development discussions
- Constructive feedback
- Professional development opportunities

## Guidelines
1. Support individualized mentoring approaches
2. Track key milestones and deadlines
3. Encourage regular check-ins
4. Identify struggling team members early
5. Celebrate achievements"""

    capabilities = [
        AgentCapability(name="track_meetings", description="Track mentee meetings and notes"),
        AgentCapability(name="suggest_topics", description="Suggest mentoring discussion topics"),
        AgentCapability(name="assess_workload", description="Assess team workload distribution"),
        AgentCapability(name="generate_report", description="Generate progress reports"),
        AgentCapability(name="schedule_checkins", description="Suggest check-in schedules"),
    ]

    tools = []
    temperature = 0.4
    max_tokens = 3000

    def _get_routing_keywords(self) -> list[str]:
        return ["student", "mentee", "lab", "team", "personnel",
                "phd", "postdoc", "meeting", "progress", "mentoring"]

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Personnel management: {request[:100]}",
            steps=["Analyze personnel request and provide guidance"],
            required_tools=[],
            estimated_complexity=2
        )

    async def execute(self, request: str, context: AgentContext, plan: AgentPlan | None = None) -> AgentResult:
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            people_context = ""
            if context.working_memory.mentioned_people:
                people_context = f"\nMentioned people: {', '.join(context.working_memory.mentioned_people)}"

            prompt = f"""User Request: {request}
{people_context}

Help with this personnel/mentoring request. Be specific and actionable."""

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
