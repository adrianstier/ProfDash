"""Writing Agent for academic writing assistance."""

from datetime import datetime

from app.agents.base import AgentCapability, AgentPlan, AgentResult, BaseAgent
from app.agents.types import AgentContext, AgentStatus, AgentType


class WritingAgent(BaseAgent):
    """Agent specialized in academic writing assistance."""

    agent_type = AgentType.WRITING
    name = "Writing Assistant"
    description = "Helps with academic writing, editing, and document formatting"

    system_prompt = """You are the Writing Assistant for ScholarOS.
Your role is to help academics write effectively.

## Your Capabilities
- Draft and edit academic content
- Suggest improvements for clarity and impact
- Format documents for different venues
- Generate abstracts and summaries
- Create outlines and structure

## Academic Writing Standards
- Clear, precise language
- Logical flow and structure
- Proper citation practices
- Field-appropriate terminology
- Active voice when appropriate

## Document Types
- Journal articles (IMRAD structure)
- Grant proposals (NIH/NSF formats)
- Conference papers and abstracts
- Thesis chapters
- Technical reports

## Guidelines
1. Maintain the author's voice
2. Prioritize clarity over complexity
3. Follow venue-specific requirements
4. Suggest rather than prescribe
5. Explain the reasoning behind suggestions"""

    capabilities = [
        AgentCapability(name="draft_section", description="Draft a section of a document"),
        AgentCapability(name="edit_text", description="Edit and improve existing text"),
        AgentCapability(name="suggest_improvements", description="Suggest improvements"),
        AgentCapability(name="generate_abstract", description="Generate abstract from full text"),
        AgentCapability(name="create_outline", description="Create document outline"),
    ]

    tools = []
    temperature = 0.5  # Slightly higher for creative writing
    max_tokens = 4000

    def _get_routing_keywords(self) -> list[str]:
        return ["write", "draft", "edit", "abstract", "outline",
                "paragraph", "section", "improve", "rewrite", "grammar",
                "introduction", "methods", "results", "discussion", "conclusion"]

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Writing assistance: {request[:100]}",
            steps=["Analyze writing request and provide assistance"],
            required_tools=[],
            estimated_complexity=3
        )

    async def execute(self, request: str, context: AgentContext, plan: AgentPlan | None = None) -> AgentResult:
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            prompt = f"""User Request: {request}

Help with this writing request. Follow academic writing best practices.
If editing, preserve the author's voice while improving clarity."""

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
