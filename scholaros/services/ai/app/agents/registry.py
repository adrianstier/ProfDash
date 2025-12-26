"""Agent Registry for managing and routing to agents."""

import logging
from typing import TYPE_CHECKING

from app.agents.types import AgentContext, AgentType

if TYPE_CHECKING:
    from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Registry for managing agent instances.

    Handles:
    - Agent registration and lookup
    - Agent routing based on request content
    - Agent lifecycle management
    """

    def __init__(self):
        self._agents: dict[AgentType, "BaseAgent"] = {}
        self._initialized = False

    def register(self, agent: "BaseAgent") -> None:
        """Register an agent instance."""
        if agent.agent_type in self._agents:
            logger.warning(f"Replacing existing agent: {agent.agent_type.value}")

        self._agents[agent.agent_type] = agent
        logger.info(f"Registered agent: {agent.agent_type.value} ({agent.name})")

    def unregister(self, agent_type: AgentType) -> None:
        """Unregister an agent."""
        if agent_type in self._agents:
            del self._agents[agent_type]
            logger.info(f"Unregistered agent: {agent_type.value}")

    def get(self, agent_type: AgentType) -> "BaseAgent | None":
        """Get an agent by type."""
        return self._agents.get(agent_type)

    def get_all(self) -> list["BaseAgent"]:
        """Get all registered agents."""
        return list(self._agents.values())

    def list_types(self) -> list[AgentType]:
        """List all registered agent types."""
        return list(self._agents.keys())

    async def route_request(
        self,
        request: str,
        context: AgentContext,
        exclude: list[AgentType] | None = None
    ) -> tuple["BaseAgent | None", float]:
        """
        Route a request to the most appropriate agent.

        Args:
            request: The user's request
            context: Current context
            exclude: Agent types to exclude from consideration

        Returns:
            (best_agent, confidence_score) or (None, 0.0) if no match
        """
        exclude = exclude or []
        best_agent = None
        best_confidence = 0.0

        for agent_type, agent in self._agents.items():
            if agent_type in exclude:
                continue

            can_handle, confidence = await agent.can_handle(request, context)

            if can_handle and confidence > best_confidence:
                best_agent = agent
                best_confidence = confidence

        return best_agent, best_confidence

    async def initialize_agents(self) -> None:
        """Initialize all registered agents."""
        if self._initialized:
            return

        # Import and register all agent implementations
        from app.agents.specialized.task_agent import TaskAgent
        from app.agents.specialized.project_agent import ProjectAgent
        from app.agents.specialized.grant_agent import GrantAgent
        from app.agents.specialized.research_agent import ResearchAgent
        from app.agents.specialized.calendar_agent import CalendarAgent
        from app.agents.specialized.writing_agent import WritingAgent
        from app.agents.specialized.personnel_agent import PersonnelAgent
        from app.agents.specialized.planner_agent import PlannerAgent

        agents = [
            TaskAgent(),
            ProjectAgent(),
            GrantAgent(),
            ResearchAgent(),
            CalendarAgent(),
            WritingAgent(),
            PersonnelAgent(),
            PlannerAgent(),
        ]

        for agent in agents:
            self.register(agent)

        self._initialized = True
        logger.info(f"Initialized {len(agents)} agents")

    def get_agent_info(self) -> list[dict]:
        """Get information about all registered agents."""
        return [
            {
                "type": agent.agent_type.value,
                "name": agent.name,
                "description": agent.description,
                "capabilities": [cap.name for cap in agent.capabilities],
                "tools": [tool.name for tool in agent.tools],
            }
            for agent in self._agents.values()
        ]


# Global registry instance
agent_registry = AgentRegistry()


def get_agent_registry() -> AgentRegistry:
    """Get the global agent registry."""
    return agent_registry
