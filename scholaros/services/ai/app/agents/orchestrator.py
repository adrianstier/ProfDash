"""Agent Orchestrator for coordinating multi-agent workflows."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any

from app.agents.base import AgentPlan, AgentResult, BaseAgent
from app.agents.registry import AgentRegistry, get_agent_registry
from app.agents.types import (
    AgentContext,
    AgentStatus,
    AgentType,
    ChatRequest,
    ChatResponse,
    ExecuteTaskRequest,
    ExecuteTaskResponse,
    InterAgentMessage,
    OrchestrateRequest,
    OrchestrateResponse,
    SuggestedAction,
    ToolCall,
    WorkflowDefinition,
    WorkflowExecution,
    WorkflowStep,
    WorkflowStepResult,
)

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Central orchestrator for the multi-agent system.

    Responsibilities:
    - Route incoming requests to appropriate agents
    - Coordinate multi-agent workflows
    - Handle inter-agent communication
    - Manage workflow execution state
    - Aggregate results from multiple agents
    """

    def __init__(self, registry: AgentRegistry | None = None):
        self.registry = registry or get_agent_registry()
        self._active_workflows: dict[str, WorkflowExecution] = {}
        self._message_queue: list[InterAgentMessage] = []

    async def initialize(self) -> None:
        """Initialize the orchestrator and all agents."""
        await self.registry.initialize_agents()
        logger.info("Agent orchestrator initialized")

    # =========================================================================
    # Chat Interface
    # =========================================================================

    async def chat(
        self,
        request: ChatRequest,
        context: AgentContext
    ) -> ChatResponse:
        """
        Handle a chat message, routing to the appropriate agent.

        Args:
            request: The chat request
            context: Current context

        Returns:
            ChatResponse with agent's response
        """
        # If specific agent requested, use it
        if request.agent_type:
            agent = self.registry.get(request.agent_type)
            if not agent:
                raise ValueError(f"Unknown agent type: {request.agent_type}")
        else:
            # Route to best matching agent
            agent, confidence = await self.registry.route_request(
                request.message,
                context
            )

            if not agent:
                # Fallback to planner agent for general requests
                agent = self.registry.get(AgentType.PLANNER)
                if not agent:
                    raise RuntimeError("No agents available to handle request")

            logger.info(f"Routed request to {agent.agent_type.value} (confidence: {confidence:.2f})")

        # Check for handoff before executing
        handoff = agent.should_handoff(request.message, context)
        if handoff:
            target_agent = self.registry.get(handoff.to_agent)
            if target_agent:
                logger.info(f"Handoff from {agent.agent_type.value} to {target_agent.agent_type.value}")
                agent = target_agent

        # Execute with the selected agent
        try:
            result = await agent.execute(request.message, context)

            # Build response
            response = ChatResponse(
                session_id=context.session_id,
                message_id=result.result_id,
                content=result.output.get("response", str(result.output)),
                agent_type=agent.agent_type,
                tool_calls=result.tool_calls,
                suggested_actions=result.suggested_actions,
                metadata={
                    "execution_time_ms": result.execution_time_ms,
                    "tokens_used": result.tokens_used,
                    "status": result.status.value,
                }
            )

            # Handle cascading handoff
            if result.handoff:
                response.metadata["handoff"] = {
                    "to_agent": result.handoff.to_agent.value,
                    "reason": result.handoff.reason,
                }

            return response

        except Exception as e:
            logger.exception(f"Agent execution failed: {agent.agent_type.value}")
            return ChatResponse(
                session_id=context.session_id,
                message_id=str(uuid.uuid4()),
                content=f"I encountered an error processing your request: {str(e)}",
                agent_type=agent.agent_type,
                metadata={"error": str(e)}
            )

    # =========================================================================
    # Task Execution
    # =========================================================================

    async def execute_task(
        self,
        request: ExecuteTaskRequest,
        context: AgentContext
    ) -> ExecuteTaskResponse:
        """
        Execute a specific agent task.

        Args:
            request: The task execution request
            context: Current context

        Returns:
            ExecuteTaskResponse with task result
        """
        agent = self.registry.get(request.agent_type)
        if not agent:
            return ExecuteTaskResponse(
                task_id=str(uuid.uuid4()),
                status="failed",
                error=f"Unknown agent type: {request.agent_type}"
            )

        task_id = str(uuid.uuid4())

        if request.async_execution:
            # Return immediately and process in background
            asyncio.create_task(
                self._execute_task_async(task_id, agent, request, context)
            )
            return ExecuteTaskResponse(
                task_id=task_id,
                status="running"
            )

        # Synchronous execution
        try:
            result = await agent.execute(
                f"Execute {request.task_type}: {request.input}",
                context
            )

            return ExecuteTaskResponse(
                task_id=task_id,
                status="completed" if result.status == AgentStatus.COMPLETED else "failed",
                result=result.output,
                error=result.error
            )

        except Exception as e:
            logger.exception(f"Task execution failed: {request.task_type}")
            return ExecuteTaskResponse(
                task_id=task_id,
                status="failed",
                error=str(e)
            )

    async def _execute_task_async(
        self,
        task_id: str,
        agent: BaseAgent,
        request: ExecuteTaskRequest,
        context: AgentContext
    ) -> None:
        """Execute a task asynchronously (background)."""
        try:
            result = await agent.execute(
                f"Execute {request.task_type}: {request.input}",
                context
            )
            # Store result for later retrieval
            # TODO: Persist to database
            logger.info(f"Async task {task_id} completed with status: {result.status}")

        except Exception as e:
            logger.exception(f"Async task {task_id} failed")
            # TODO: Store error for retrieval

    # =========================================================================
    # Workflow Orchestration
    # =========================================================================

    async def orchestrate(
        self,
        request: OrchestrateRequest,
        context: AgentContext
    ) -> OrchestrateResponse:
        """
        Execute a multi-agent workflow.

        Args:
            request: The orchestration request with workflow definition
            context: Current context

        Returns:
            OrchestrateResponse with execution results
        """
        execution_id = str(uuid.uuid4())
        workflow = request.workflow

        # Initialize execution state
        execution = WorkflowExecution(
            id=execution_id,
            workflow_id=workflow.id,
            session_id=context.session_id,
            status="running",
            step_results={},
            started_at=datetime.utcnow()
        )
        self._active_workflows[execution_id] = execution

        try:
            # Build dependency graph
            step_order = self._topological_sort(workflow.steps)

            # Execute steps in order
            for step_id in step_order:
                step = next(s for s in workflow.steps if s.id == step_id)
                execution.current_step = step_id

                # Check dependencies
                if not self._dependencies_satisfied(step, execution):
                    if workflow.error_handling == "fail_fast":
                        raise RuntimeError(f"Dependencies not satisfied for step: {step_id}")
                    continue

                # Check condition
                if step.condition and not self._evaluate_condition(step.condition, execution, request.input):
                    execution.step_results[step_id] = WorkflowStepResult(
                        step_id=step_id,
                        status="skipped",
                        agent_type=step.agent
                    )
                    continue

                # Execute step
                step_result = await self._execute_workflow_step(
                    step,
                    execution,
                    context,
                    request.input
                )
                execution.step_results[step_id] = step_result

                # Handle step failure
                if step_result.status == "failed":
                    if step.on_error == "fail":
                        raise RuntimeError(f"Step failed: {step_id} - {step_result.error}")
                    elif step.on_error == "fallback" and step.fallback_agent:
                        # Retry with fallback agent
                        fallback_step = WorkflowStep(
                            id=f"{step_id}_fallback",
                            name=f"{step.name} (fallback)",
                            agent=step.fallback_agent,
                            action=step.action,
                            input=step.input
                        )
                        fallback_result = await self._execute_workflow_step(
                            fallback_step,
                            execution,
                            context,
                            request.input
                        )
                        execution.step_results[step_id] = fallback_result

            # Mark completed
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()

            return OrchestrateResponse(
                execution_id=execution_id,
                status="completed",
                results=execution.step_results
            )

        except Exception as e:
            logger.exception(f"Workflow execution failed: {workflow.id}")
            execution.status = "failed"
            execution.error = str(e)
            execution.completed_at = datetime.utcnow()

            return OrchestrateResponse(
                execution_id=execution_id,
                status="failed",
                results=execution.step_results,
                error=str(e)
            )

        finally:
            # Clean up
            del self._active_workflows[execution_id]

    async def _execute_workflow_step(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution,
        context: AgentContext,
        workflow_input: dict[str, Any]
    ) -> WorkflowStepResult:
        """Execute a single workflow step."""
        start_time = datetime.utcnow()

        agent = self.registry.get(step.agent)
        if not agent:
            return WorkflowStepResult(
                step_id=step.id,
                status="failed",
                error=f"Unknown agent: {step.agent}",
                execution_time_ms=0,
                agent_type=step.agent
            )

        # Resolve input references
        resolved_input = self._resolve_references(
            step.input,
            execution,
            workflow_input
        )

        # Build prompt from action and input
        prompt = f"Execute action '{step.action}' with parameters: {resolved_input}"

        try:
            # Execute with retries
            retries = step.retries
            last_error = None

            while retries >= 0:
                try:
                    result = await asyncio.wait_for(
                        agent.execute(prompt, context),
                        timeout=step.timeout or 300  # Default 5 min timeout
                    )

                    if result.status == AgentStatus.COMPLETED:
                        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                        return WorkflowStepResult(
                            step_id=step.id,
                            status="completed",
                            output=result.output,
                            execution_time_ms=execution_time,
                            agent_type=step.agent
                        )

                    last_error = result.error or "Agent execution failed"
                    retries -= 1

                except asyncio.TimeoutError:
                    last_error = "Step timed out"
                    retries -= 1

            # All retries exhausted
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return WorkflowStepResult(
                step_id=step.id,
                status="failed",
                error=last_error,
                execution_time_ms=execution_time,
                agent_type=step.agent
            )

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return WorkflowStepResult(
                step_id=step.id,
                status="failed",
                error=str(e),
                execution_time_ms=execution_time,
                agent_type=step.agent
            )

    def _topological_sort(self, steps: list[WorkflowStep]) -> list[str]:
        """Sort workflow steps by dependencies."""
        # Build adjacency list
        graph: dict[str, list[str]] = {s.id: s.depends_on for s in steps}
        in_degree: dict[str, int] = {s.id: len(s.depends_on) for s in steps}

        # Find steps with no dependencies
        queue = [sid for sid, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            current = queue.pop(0)
            result.append(current)

            for step_id, deps in graph.items():
                if current in deps:
                    in_degree[step_id] -= 1
                    if in_degree[step_id] == 0:
                        queue.append(step_id)

        if len(result) != len(steps):
            raise ValueError("Circular dependency detected in workflow steps")

        return result

    def _dependencies_satisfied(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> bool:
        """Check if all dependencies are satisfied."""
        for dep_id in step.depends_on:
            if dep_id not in execution.step_results:
                return False
            if execution.step_results[dep_id].status not in ["completed", "skipped"]:
                return False
        return True

    def _evaluate_condition(
        self,
        condition: Any,
        execution: WorkflowExecution,
        input: dict[str, Any]
    ) -> bool:
        """Evaluate a workflow condition."""
        if condition.type == "always":
            return True

        # Simple expression evaluation
        # TODO: Implement more sophisticated expression parsing
        if condition.expression:
            # Check if expression references a step result
            if condition.expression.startswith("steps."):
                parts = condition.expression.split(".")
                step_id = parts[1]
                if step_id in execution.step_results:
                    result = execution.step_results[step_id]
                    if condition.type == "if":
                        return result.status == "completed"
                    else:  # unless
                        return result.status != "completed"
            return True

        return True

    def _resolve_references(
        self,
        input: dict[str, Any],
        execution: WorkflowExecution,
        workflow_input: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Resolve references in step input.

        Supports:
        - {{input.key}} - Reference workflow input
        - {{steps.step_id.output.key}} - Reference previous step output
        - {{prev.key}} - Reference previous step output (shorthand)
        """
        import re

        def resolve_value(value: Any) -> Any:
            if isinstance(value, str):
                # Check for template pattern
                pattern = r'\{\{([^}]+)\}\}'

                def replacer(match: re.Match) -> str:
                    ref = match.group(1).strip()

                    if ref.startswith("input."):
                        key = ref[6:]
                        return str(workflow_input.get(key, ""))

                    elif ref.startswith("steps."):
                        parts = ref.split(".")
                        step_id = parts[1]
                        if step_id in execution.step_results:
                            result = execution.step_results[step_id]
                            if result.output:
                                # Navigate through output
                                current = result.output
                                for part in parts[3:]:  # Skip "steps.id.output"
                                    if isinstance(current, dict):
                                        current = current.get(part)
                                    else:
                                        break
                                return str(current) if current else ""
                        return ""

                    elif ref.startswith("prev."):
                        # Get last completed step
                        for step_id in reversed(list(execution.step_results.keys())):
                            result = execution.step_results[step_id]
                            if result.status == "completed" and result.output:
                                key = ref[5:]
                                return str(result.output.get(key, ""))
                        return ""

                    return match.group(0)

                return re.sub(pattern, replacer, value)

            elif isinstance(value, dict):
                return {k: resolve_value(v) for k, v in value.items()}

            elif isinstance(value, list):
                return [resolve_value(item) for item in value]

            return value

        return resolve_value(input)

    # =========================================================================
    # Inter-Agent Communication
    # =========================================================================

    async def send_message(self, message: InterAgentMessage) -> None:
        """Send a message between agents."""
        self._message_queue.append(message)

        if message.recipient == "all":
            # Broadcast to all agents
            for agent in self.registry.get_all():
                # Agents would implement receive_message if needed
                pass

        elif message.recipient != "orchestrator":
            # Send to specific agent
            agent = self.registry.get(message.recipient)
            if agent:
                # Agent would implement receive_message if needed
                pass

    async def process_messages(self) -> None:
        """Process queued inter-agent messages."""
        while self._message_queue:
            message = self._message_queue.pop(0)
            # Process message
            logger.debug(f"Processing message from {message.sender} to {message.recipient}")

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def get_workflow_status(self, execution_id: str) -> WorkflowExecution | None:
        """Get the status of a running workflow."""
        return self._active_workflows.get(execution_id)

    def get_agent_info(self) -> list[dict]:
        """Get information about all available agents."""
        return self.registry.get_agent_info()


# Global orchestrator instance
orchestrator = AgentOrchestrator()


def get_orchestrator() -> AgentOrchestrator:
    """Get the global orchestrator instance."""
    return orchestrator
