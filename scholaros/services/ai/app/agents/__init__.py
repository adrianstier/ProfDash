"""Multi-Agent Framework for ScholarOS."""

from app.agents.base import BaseAgent, AgentResult, AgentPlan
from app.agents.registry import AgentRegistry, agent_registry
from app.agents.orchestrator import AgentOrchestrator, orchestrator
from app.agents.types import (
    AgentType,
    AgentStatus,
    AgentMessage,
    AgentContext,
    ToolCall,
    ToolResult,
    WorkflowStep,
    WorkflowDefinition,
)

__all__ = [
    # Base classes
    "BaseAgent",
    "AgentResult",
    "AgentPlan",
    # Registry
    "AgentRegistry",
    "agent_registry",
    # Orchestrator
    "AgentOrchestrator",
    "orchestrator",
    # Types
    "AgentType",
    "AgentStatus",
    "AgentMessage",
    "AgentContext",
    "ToolCall",
    "ToolResult",
    "WorkflowStep",
    "WorkflowDefinition",
]
