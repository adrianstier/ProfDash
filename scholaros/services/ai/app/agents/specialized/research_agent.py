"""Research Agent for literature and research support."""

from datetime import datetime
from typing import Any

from app.agents.base import AgentCapability, AgentPlan, AgentResult, AgentTool, BaseAgent
from app.agents.types import AgentContext, AgentStatus, AgentType, SuggestedAction


class ResearchAgent(BaseAgent):
    """Agent specialized in research and literature support."""

    agent_type = AgentType.RESEARCH
    name = "Research Assistant"
    description = "Helps with literature search, paper summaries, and research planning"

    system_prompt = """You are the Research Assistant for ScholarOS, an academic productivity platform.
Your role is to help academics with literature review and research support.

## Your Capabilities
- Search and summarize academic literature
- Identify related work and citations
- Find gaps in current research
- Suggest methodology approaches
- Generate citation information

## Guidelines
1. Be thorough but focused in literature analysis
2. Highlight methodology strengths and limitations
3. Identify potential collaborators based on research areas
4. Suggest high-impact journals for different fields
5. Help identify novelty and contribution"""

    capabilities = [
        AgentCapability(name="search_literature", description="Search for relevant academic papers"),
        AgentCapability(name="summarize_paper", description="Summarize academic papers"),
        AgentCapability(name="find_related_work", description="Find related research and citations"),
        AgentCapability(name="identify_gaps", description="Identify gaps in current literature"),
        AgentCapability(name="suggest_methodology", description="Suggest research methodologies"),
    ]

    tools = []
    temperature = 0.3
    max_tokens = 4000

    def _get_routing_keywords(self) -> list[str]:
        return ["literature", "paper", "citation", "research", "methodology",
                "study", "findings", "abstract", "review", "related work"]

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Research support: {request[:100]}",
            steps=["Analyze research request and provide guidance"],
            required_tools=[],
            estimated_complexity=2
        )

    async def execute(self, request: str, context: AgentContext, plan: AgentPlan | None = None) -> AgentResult:
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            prompt = f"""User Request: {request}

Please help with this research-related request. Provide thorough, academic-quality guidance."""

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
