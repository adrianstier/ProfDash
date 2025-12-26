"""Base agent class and core abstractions."""

import json
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.agents.types import (
    AgentContext,
    AgentHandoff,
    AgentStatus,
    AgentType,
    SuggestedAction,
    ToolCall,
    ToolResult,
)
from app.services.llm import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class AgentPlan(BaseModel):
    """A plan created by an agent before execution."""
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    goal: str
    steps: list[str]
    required_tools: list[str] = Field(default_factory=list)
    estimated_complexity: int = 1  # 1-5 scale
    requires_user_confirmation: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentResult(BaseModel):
    """Result of agent execution."""
    result_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    status: AgentStatus
    output: dict[str, Any]
    tool_calls: list[ToolCall] = Field(default_factory=list)
    tool_results: list[ToolResult] = Field(default_factory=list)
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    handoff: AgentHandoff | None = None
    error: str | None = None
    execution_time_ms: int = 0
    tokens_used: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentCapability(BaseModel):
    """A capability that an agent provides."""
    name: str
    description: str
    input_schema: dict[str, Any] | None = None
    output_schema: dict[str, Any] | None = None


class AgentTool(BaseModel):
    """A tool that an agent can use."""
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any] | None = None

    async def execute(self, input: dict[str, Any], context: AgentContext) -> Any:
        """Execute the tool. Override in subclass."""
        raise NotImplementedError("Tool execution must be implemented in subclass")


class BaseAgent(ABC):
    """Abstract base class for all ScholarOS agents."""

    agent_type: AgentType
    name: str
    description: str
    system_prompt: str
    capabilities: list[AgentCapability]
    tools: list[AgentTool]

    # LLM configuration
    temperature: float = 0.3
    max_tokens: int = 4000
    model: str | None = None

    def __init__(self, llm_service: LLMService | None = None):
        """Initialize the agent."""
        self.llm = llm_service or get_llm_service()
        self.status = AgentStatus.IDLE
        self._tool_registry: dict[str, AgentTool] = {}
        self._register_tools()

    def _register_tools(self) -> None:
        """Register agent's tools for lookup."""
        for tool in self.tools:
            self._tool_registry[tool.name] = tool

    def get_tool(self, name: str) -> AgentTool | None:
        """Get a tool by name."""
        return self._tool_registry.get(name)

    def get_tools_schema(self) -> list[dict[str, Any]]:
        """Get tool schemas for LLM function calling."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.input_schema,
                }
            }
            for tool in self.tools
        ]

    async def _call_llm(
        self,
        prompt: str,
        context: AgentContext,
        system_override: str | None = None,
        include_tools: bool = True,
    ) -> tuple[str, list[ToolCall]]:
        """
        Call the LLM with context and optional tool calling.

        Returns: (response_text, tool_calls)
        """
        # Build full system prompt with context
        system = system_override or self.system_prompt
        system = self._inject_context(system, context)

        # For now, use simple completion (can be extended for function calling)
        response = await self.llm.complete(
            prompt=prompt,
            system=system,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
        )

        # Parse tool calls from response if present
        tool_calls = self._parse_tool_calls(response)

        return response, tool_calls

    async def _call_llm_json(
        self,
        prompt: str,
        context: AgentContext,
        response_model: type | None = None,
    ) -> dict[str, Any]:
        """Call the LLM expecting a JSON response."""
        system = self._inject_context(self.system_prompt, context)

        result = await self.llm.complete_json(
            prompt=prompt,
            system=system,
            response_model=response_model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
        )

        if isinstance(result, BaseModel):
            return result.model_dump()
        return result

    def _inject_context(self, system_prompt: str, context: AgentContext) -> str:
        """Inject context information into the system prompt."""
        context_info = []

        if context.user_profile:
            context_info.append(f"User Profile: {json.dumps(context.user_profile)}")

        if context.user_tasks:
            context_info.append(f"User has {len(context.user_tasks)} tasks")

        if context.user_projects:
            context_info.append(f"User has {len(context.user_projects)} projects")

        if context.working_memory.current_goal:
            context_info.append(f"Current Goal: {context.working_memory.current_goal}")

        if context_info:
            return f"{system_prompt}\n\n## Context\n" + "\n".join(context_info)

        return system_prompt

    def _parse_tool_calls(self, response: str) -> list[ToolCall]:
        """
        Parse tool calls from LLM response.
        Format: [TOOL:tool_name]{...json args...}
        """
        tool_calls = []
        import re

        pattern = r'\[TOOL:(\w+)\]\s*(\{[^}]+\})'
        matches = re.findall(pattern, response)

        for i, (tool_name, args_str) in enumerate(matches):
            try:
                args = json.loads(args_str)
                tool_calls.append(ToolCall(
                    id=f"call_{uuid.uuid4().hex[:8]}",
                    name=tool_name,
                    arguments=args
                ))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool call arguments: {args_str}")

        return tool_calls

    async def execute_tool(
        self,
        tool_call: ToolCall,
        context: AgentContext
    ) -> ToolResult:
        """Execute a tool call."""
        tool = self.get_tool(tool_call.name)

        if not tool:
            return ToolResult(
                tool_call_id=tool_call.id,
                result=None,
                error=f"Unknown tool: {tool_call.name}"
            )

        start_time = datetime.utcnow()
        try:
            result = await tool.execute(tool_call.arguments, context)
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return ToolResult(
                tool_call_id=tool_call.id,
                result=result,
                execution_time_ms=execution_time
            )
        except Exception as e:
            logger.exception(f"Tool execution failed: {tool_call.name}")
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return ToolResult(
                tool_call_id=tool_call.id,
                result=None,
                error=str(e),
                execution_time_ms=execution_time
            )

    @abstractmethod
    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        """
        Create an execution plan for the request.

        Args:
            request: The user's request or task description
            context: Current agent context

        Returns:
            AgentPlan with steps to execute
        """
        pass

    @abstractmethod
    async def execute(
        self,
        request: str,
        context: AgentContext,
        plan: AgentPlan | None = None
    ) -> AgentResult:
        """
        Execute the request and return results.

        Args:
            request: The user's request
            context: Current agent context
            plan: Optional pre-created plan

        Returns:
            AgentResult with execution output
        """
        pass

    async def reflect(self, result: AgentResult, context: AgentContext) -> dict[str, Any]:
        """
        Analyze execution results and extract learnings.

        Args:
            result: The execution result to analyze
            context: Current context

        Returns:
            Dictionary with reflection insights
        """
        # Default implementation - can be overridden
        return {
            "success": result.status == AgentStatus.COMPLETED,
            "tools_used": [tc.name for tc in result.tool_calls],
            "suggestions_made": len(result.suggested_actions),
        }

    def should_handoff(self, request: str, context: AgentContext) -> AgentHandoff | None:
        """
        Determine if this request should be handed off to another agent.

        Returns:
            AgentHandoff if handoff needed, None otherwise
        """
        # Default: no handoff. Override in subclasses.
        return None

    async def can_handle(self, request: str, context: AgentContext) -> tuple[bool, float]:
        """
        Check if this agent can handle the request.

        Returns:
            (can_handle, confidence_score)
        """
        # Simple keyword matching - override for more sophisticated routing
        keywords = self._get_routing_keywords()

        request_lower = request.lower()
        matches = sum(1 for kw in keywords if kw in request_lower)
        confidence = min(matches / max(len(keywords), 1), 1.0)

        return confidence > 0.2, confidence

    def _get_routing_keywords(self) -> list[str]:
        """Get keywords for routing decisions. Override in subclasses."""
        return []

    def get_capabilities_prompt(self) -> str:
        """Get a formatted string of capabilities for prompts."""
        caps = [f"- {cap.name}: {cap.description}" for cap in self.capabilities]
        return "\n".join(caps)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} type={self.agent_type.value}>"
