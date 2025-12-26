"""Type definitions for the Multi-Agent Framework."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentType(str, Enum):
    """Types of specialized agents."""
    TASK = "task"
    PROJECT = "project"
    GRANT = "grant"
    RESEARCH = "research"
    CALENDAR = "calendar"
    WRITING = "writing"
    PERSONNEL = "personnel"
    PLANNER = "planner"
    ORCHESTRATOR = "orchestrator"


class AgentStatus(str, Enum):
    """Agent execution status."""
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    AWAITING_FEEDBACK = "awaiting_feedback"
    COMPLETED = "completed"
    FAILED = "failed"


class MessageRole(str, Enum):
    """Message roles in conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ToolCall(BaseModel):
    """A tool call made by an agent."""
    id: str
    name: str
    arguments: dict[str, Any]


class ToolResult(BaseModel):
    """Result of a tool execution."""
    tool_call_id: str
    result: Any
    error: str | None = None
    execution_time_ms: int | None = None


class AgentMessage(BaseModel):
    """A message in an agent conversation."""
    id: str
    session_id: str
    role: MessageRole
    agent_type: AgentType | None = None
    content: str
    tool_calls: list[ToolCall] | None = None
    tool_results: list[ToolResult] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkingMemory(BaseModel):
    """Short-term memory for agent context."""
    mentioned_tasks: list[str] = Field(default_factory=list)
    mentioned_projects: list[str] = Field(default_factory=list)
    mentioned_people: list[str] = Field(default_factory=list)
    mentioned_dates: list[str] = Field(default_factory=list)
    current_goal: str | None = None
    user_intent: str | None = None
    relevant_documents: list[str] = Field(default_factory=list)
    intermediate_results: dict[str, Any] = Field(default_factory=dict)


class AgentContext(BaseModel):
    """Context passed to agents for execution."""
    session_id: str
    workspace_id: str
    user_id: str

    # Current state
    active_agent: AgentType | None = None
    active_task_id: str | None = None
    active_project_id: str | None = None

    # Conversation history
    messages: list[AgentMessage] = Field(default_factory=list)
    message_count: int = 0

    # Memory
    working_memory: WorkingMemory = Field(default_factory=WorkingMemory)

    # User data context
    user_tasks: list[dict[str, Any]] = Field(default_factory=list)
    user_projects: list[dict[str, Any]] = Field(default_factory=list)
    user_profile: dict[str, Any] = Field(default_factory=dict)


class WorkflowCondition(BaseModel):
    """Condition for workflow step execution."""
    type: Literal["always", "if", "unless"]
    expression: str | None = None
    value: Any | None = None


class WorkflowStep(BaseModel):
    """A step in a multi-agent workflow."""
    id: str
    name: str
    agent: AgentType
    action: str
    input: dict[str, Any]
    depends_on: list[str] = Field(default_factory=list)
    condition: WorkflowCondition | None = None
    timeout: int | None = None
    retries: int = 0
    on_error: Literal["fail", "skip", "fallback"] = "fail"
    fallback_agent: AgentType | None = None


class WorkflowDefinition(BaseModel):
    """Definition of a multi-agent workflow."""
    id: str
    name: str
    description: str
    version: str = "1.0"
    steps: list[WorkflowStep]
    error_handling: Literal["fail_fast", "continue", "retry", "fallback"] = "fail_fast"
    timeout: int | None = None


class WorkflowStepResult(BaseModel):
    """Result of a workflow step execution."""
    step_id: str
    status: Literal["pending", "running", "completed", "failed", "skipped"]
    output: dict[str, Any] | None = None
    error: str | None = None
    execution_time_ms: int = 0
    agent_type: AgentType


class WorkflowExecution(BaseModel):
    """State of a workflow execution."""
    id: str
    workflow_id: str
    session_id: str
    status: Literal["pending", "running", "completed", "failed"]
    current_step: str | None = None
    step_results: dict[str, WorkflowStepResult] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    error: str | None = None


class InterAgentMessage(BaseModel):
    """Message between agents."""
    id: str
    sender: AgentType
    recipient: AgentType | Literal["orchestrator", "all"]
    message_type: Literal["request", "response", "broadcast", "handoff", "status"]
    content: dict[str, Any]
    context: AgentContext
    priority: int = 5
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentHandoff(BaseModel):
    """Handoff control from one agent to another."""
    from_agent: AgentType
    to_agent: AgentType
    reason: str
    context: dict[str, Any]
    preserve_history: bool = True


class SuggestedAction(BaseModel):
    """An action suggested by an agent."""
    label: str
    action: str
    params: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    """Request for agent chat."""
    session_id: str | None = None
    message: str
    context: dict[str, Any] = Field(default_factory=dict)
    agent_type: AgentType | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    """Response from agent chat."""
    session_id: str
    message_id: str
    content: str
    agent_type: AgentType
    tool_calls: list[ToolCall] = Field(default_factory=list)
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExecuteTaskRequest(BaseModel):
    """Request to execute an agent task."""
    agent_type: AgentType
    task_type: str
    input: dict[str, Any]
    async_execution: bool = False


class ExecuteTaskResponse(BaseModel):
    """Response from task execution."""
    task_id: str
    status: Literal["pending", "running", "completed", "failed"]
    result: dict[str, Any] | None = None
    error: str | None = None


class OrchestrateRequest(BaseModel):
    """Request for workflow orchestration."""
    workflow: WorkflowDefinition
    input: dict[str, Any] = Field(default_factory=dict)


class OrchestrateResponse(BaseModel):
    """Response from workflow orchestration."""
    execution_id: str
    status: Literal["pending", "running", "completed", "failed"]
    results: dict[str, WorkflowStepResult] = Field(default_factory=dict)
    error: str | None = None


class FeedbackRequest(BaseModel):
    """Request to submit feedback on agent output."""
    session_id: str
    message_id: str
    feedback_type: Literal["thumbs_up", "thumbs_down", "correction", "suggestion", "rating"]
    rating: int | None = None
    comment: str | None = None
    correction: str | None = None
