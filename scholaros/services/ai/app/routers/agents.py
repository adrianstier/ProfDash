"""API routes for multi-agent framework."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.orchestrator import AgentOrchestrator, get_orchestrator
from app.agents.types import (
    AgentContext,
    AgentType,
    ChatRequest,
    ChatResponse,
    ExecuteTaskRequest,
    ExecuteTaskResponse,
    FeedbackRequest,
    OrchestrateRequest,
    OrchestrateResponse,
    WorkingMemory,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


# =============================================================================
# Dependency to get context from request
# =============================================================================

async def get_context_from_request(
    workspace_id: str | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> AgentContext:
    """Build agent context from request parameters."""
    return AgentContext(
        session_id=session_id or "default",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
    )


# =============================================================================
# Agent Information Endpoints
# =============================================================================

@router.get("/")
async def list_agents(
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> list[dict]:
    """List all available agents and their capabilities."""
    await orchestrator.initialize()
    return orchestrator.get_agent_info()


@router.get("/{agent_type}")
async def get_agent_info(
    agent_type: str,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> dict:
    """Get information about a specific agent."""
    await orchestrator.initialize()

    try:
        agent_type_enum = AgentType(agent_type)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown agent type: {agent_type}")

    agent = orchestrator.registry.get(agent_type_enum)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_type}")

    return {
        "type": agent.agent_type.value,
        "name": agent.name,
        "description": agent.description,
        "capabilities": [
            {"name": cap.name, "description": cap.description}
            for cap in agent.capabilities
        ],
        "tools": [
            {"name": tool.name, "description": tool.description}
            for tool in agent.tools
        ],
    }


# =============================================================================
# Chat Endpoint
# =============================================================================

@router.post("/chat")
async def chat(
    request: ChatRequest,
    workspace_id: str | None = None,
    user_id: str | None = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> ChatResponse:
    """
    Send a chat message to the agent system.

    The orchestrator will route to the appropriate agent based on content.
    """
    await orchestrator.initialize()

    context = AgentContext(
        session_id=request.session_id or "default",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
        # Additional context from request
        user_tasks=request.context.get("tasks", []),
        user_projects=request.context.get("projects", []),
        user_profile=request.context.get("profile", {}),
    )

    try:
        response = await orchestrator.chat(request, context)
        return response
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    workspace_id: str | None = None,
    user_id: str | None = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> StreamingResponse:
    """
    Stream a chat response using Server-Sent Events.
    """
    await orchestrator.initialize()

    context = AgentContext(
        session_id=request.session_id or "default",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
        user_tasks=request.context.get("tasks", []),
        user_projects=request.context.get("projects", []),
        user_profile=request.context.get("profile", {}),
    )

    async def generate():
        """Generate SSE events."""
        try:
            # For now, we'll do a regular chat and stream the response
            # In the future, this could stream tokens as they're generated
            response = await orchestrator.chat(request, context)

            # Send the response as an SSE event
            import json
            yield f"data: {json.dumps(response.model_dump())}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.exception("Stream failed")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# =============================================================================
# Task Execution Endpoint
# =============================================================================

@router.post("/execute")
async def execute_task(
    request: ExecuteTaskRequest,
    workspace_id: str | None = None,
    user_id: str | None = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> ExecuteTaskResponse:
    """
    Execute a specific agent task.

    This is for programmatic task execution rather than chat.
    """
    await orchestrator.initialize()

    context = AgentContext(
        session_id="task-execution",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
    )

    try:
        response = await orchestrator.execute_task(request, context)
        return response
    except Exception as e:
        logger.exception("Task execution failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> dict:
    """Get the status of an async task."""
    # TODO: Implement task status retrieval from database
    return {
        "task_id": task_id,
        "status": "pending",
        "progress": 0,
    }


# =============================================================================
# Workflow Orchestration Endpoint
# =============================================================================

@router.post("/orchestrate")
async def orchestrate_workflow(
    request: OrchestrateRequest,
    workspace_id: str | None = None,
    user_id: str | None = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> OrchestrateResponse:
    """
    Execute a multi-agent workflow.

    Workflows define a sequence of agent tasks with dependencies.
    """
    await orchestrator.initialize()

    context = AgentContext(
        session_id="workflow-execution",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
    )

    try:
        response = await orchestrator.orchestrate(request, context)
        return response
    except Exception as e:
        logger.exception("Workflow orchestration failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflows/{execution_id}")
async def get_workflow_status(
    execution_id: str,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> dict:
    """Get the status of a running workflow."""
    status = orchestrator.get_workflow_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return status.model_dump()


# =============================================================================
# Feedback Endpoint
# =============================================================================

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
) -> dict:
    """
    Submit feedback on an agent response.

    This is used to improve agent performance over time.
    """
    # TODO: Store feedback in database for learning
    logger.info(f"Received feedback: {request.feedback_type} for message {request.message_id}")

    return {
        "status": "received",
        "message_id": request.message_id,
        "feedback_type": request.feedback_type,
    }


# =============================================================================
# Predefined Workflows
# =============================================================================

PREDEFINED_WORKFLOWS = {
    "email-to-tasks": {
        "id": "email-to-tasks",
        "name": "Email to Tasks",
        "description": "Extract tasks from email and schedule them",
        "version": "1.0",
        "steps": [
            {
                "id": "extract",
                "name": "Extract Tasks",
                "agent": "task",
                "action": "extract_tasks",
                "input": {"text": "{{input.email_content}}"},
            },
            {
                "id": "prioritize",
                "name": "Prioritize Tasks",
                "agent": "task",
                "action": "prioritize_tasks",
                "input": {"tasks": "{{steps.extract.output.tasks}}"},
                "depends_on": ["extract"],
            },
        ],
    },
    "weekly-update": {
        "id": "weekly-update",
        "name": "Weekly Update",
        "description": "Generate a weekly research update",
        "version": "1.0",
        "steps": [
            {
                "id": "projects",
                "name": "Summarize Projects",
                "agent": "project",
                "action": "summarize_all",
                "input": {},
            },
            {
                "id": "tasks",
                "name": "Review Tasks",
                "agent": "task",
                "action": "weekly_review",
                "input": {},
            },
            {
                "id": "compile",
                "name": "Compile Update",
                "agent": "writing",
                "action": "compile_update",
                "input": {
                    "projects": "{{steps.projects.output}}",
                    "tasks": "{{steps.tasks.output}}",
                },
                "depends_on": ["projects", "tasks"],
            },
        ],
    },
}


@router.get("/workflows/predefined")
async def list_predefined_workflows() -> list[dict]:
    """List available predefined workflows."""
    return [
        {
            "id": w["id"],
            "name": w["name"],
            "description": w["description"],
        }
        for w in PREDEFINED_WORKFLOWS.values()
    ]


@router.post("/workflows/predefined/{workflow_id}")
async def run_predefined_workflow(
    workflow_id: str,
    input: dict[str, Any] = {},
    workspace_id: str | None = None,
    user_id: str | None = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
) -> OrchestrateResponse:
    """Run a predefined workflow with given input."""
    if workflow_id not in PREDEFINED_WORKFLOWS:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")

    from app.agents.types import WorkflowDefinition, WorkflowStep

    workflow_data = PREDEFINED_WORKFLOWS[workflow_id]
    workflow = WorkflowDefinition(
        id=workflow_data["id"],
        name=workflow_data["name"],
        description=workflow_data["description"],
        version=workflow_data["version"],
        steps=[
            WorkflowStep(
                id=s["id"],
                name=s["name"],
                agent=AgentType(s["agent"]),
                action=s["action"],
                input=s["input"],
                depends_on=s.get("depends_on", []),
            )
            for s in workflow_data["steps"]
        ],
    )

    request = OrchestrateRequest(workflow=workflow, input=input)

    context = AgentContext(
        session_id=f"workflow-{workflow_id}",
        workspace_id=workspace_id or "default",
        user_id=user_id or "anonymous",
        message_count=0,
        working_memory=WorkingMemory(),
    )

    await orchestrator.initialize()
    return await orchestrator.orchestrate(request, context)
