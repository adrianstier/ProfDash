"""Task Agent for managing tasks and todos."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.agents.base import AgentCapability, AgentPlan, AgentResult, AgentTool, BaseAgent
from app.agents.types import AgentContext, AgentStatus, AgentType, SuggestedAction


# =============================================================================
# Task Agent Response Models
# =============================================================================

class ExtractedTask(BaseModel):
    """A task extracted from text."""
    title: str
    description: str | None = None
    priority: str = "p3"
    category: str = "misc"
    due_date: str | None = None
    confidence: float = 0.8


class TaskBreakdown(BaseModel):
    """Breakdown of a complex task into subtasks."""
    original_task: str
    subtasks: list[ExtractedTask]
    reasoning: str


class TaskPrioritization(BaseModel):
    """Result of task prioritization."""
    tasks: list[dict[str, Any]]
    reasoning: str
    suggested_order: list[str]


class ScheduleSuggestion(BaseModel):
    """Suggested schedule for tasks."""
    task_id: str
    suggested_date: str
    suggested_time: str | None = None
    reasoning: str


# =============================================================================
# Task Agent Tools
# =============================================================================

class ExtractTasksTool(AgentTool):
    """Extract actionable tasks from unstructured text."""

    name: str = "extract_tasks"
    description: str = "Extract actionable tasks from text like meeting notes, emails, or documents"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text to extract tasks from"
            },
            "context": {
                "type": "string",
                "description": "Additional context about the text source"
            }
        },
        "required": ["text"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> list[ExtractedTask]:
        # This would call the LLM to extract tasks
        # For now, return placeholder
        return []


class PrioritizeTasksTool(AgentTool):
    """Analyze and prioritize a list of tasks."""

    name: str = "prioritize_tasks"
    description: str = "Analyze tasks and suggest priority ordering based on urgency, importance, and deadlines"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "tasks": {
                "type": "array",
                "items": {"type": "object"},
                "description": "List of tasks to prioritize"
            },
            "criteria": {
                "type": "string",
                "description": "Prioritization criteria (deadline, importance, effort)"
            }
        },
        "required": ["tasks"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> TaskPrioritization:
        return TaskPrioritization(
            tasks=input.get("tasks", []),
            reasoning="",
            suggested_order=[]
        )


class BreakdownTaskTool(AgentTool):
    """Break down a complex task into smaller subtasks."""

    name: str = "breakdown_task"
    description: str = "Break down a complex or large task into smaller, actionable subtasks"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "task": {
                "type": "string",
                "description": "The complex task to break down"
            },
            "max_subtasks": {
                "type": "integer",
                "description": "Maximum number of subtasks to create"
            }
        },
        "required": ["task"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> TaskBreakdown:
        return TaskBreakdown(
            original_task=input.get("task", ""),
            subtasks=[],
            reasoning=""
        )


class ScheduleTasksTool(AgentTool):
    """Suggest optimal scheduling for tasks."""

    name: str = "schedule_tasks"
    description: str = "Suggest when to schedule tasks based on deadlines, availability, and workload"
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "tasks": {
                "type": "array",
                "items": {"type": "object"},
                "description": "Tasks to schedule"
            },
            "availability": {
                "type": "array",
                "items": {"type": "object"},
                "description": "Available time slots"
            }
        },
        "required": ["tasks"]
    }

    async def execute(self, input: dict[str, Any], context: AgentContext) -> list[ScheduleSuggestion]:
        return []


# =============================================================================
# Task Agent
# =============================================================================

class TaskAgent(BaseAgent):
    """
    Agent specialized in task management and productivity.

    Capabilities:
    - Extract tasks from unstructured text (emails, notes, documents)
    - Prioritize and organize tasks
    - Break down complex tasks into subtasks
    - Suggest optimal scheduling
    - Batch update and manage tasks
    """

    agent_type = AgentType.TASK
    name = "Task Assistant"
    description = "Helps you manage tasks, extract action items, and stay organized"

    system_prompt = """You are the Task Assistant for ScholarOS, an academic productivity platform.
Your role is to help academics manage their tasks effectively.

## Your Capabilities
- Extract actionable tasks from emails, meeting notes, and documents
- Prioritize tasks based on deadlines, importance, and academic context
- Break down complex research tasks into manageable steps
- Suggest when to schedule tasks based on deadlines and workload
- Batch process and organize tasks

## Academic Context
Users are academic professionals (professors, researchers, graduate students) with tasks spanning:
- Research: experiments, data analysis, paper writing
- Teaching: course prep, grading, office hours
- Grants: proposal writing, reporting, budget management
- Mentoring: student meetings, thesis reviews
- Administration: committee work, reviews, correspondence

## Task Categories
- research: Lab work, experiments, data analysis, literature review
- teaching: Course prep, lectures, grading, office hours
- grants: Proposal writing, budget, reporting
- grad-mentorship: PhD/Master's student mentoring
- undergrad-mentorship: Undergraduate research mentoring
- admin: Committees, reviews, correspondence
- misc: Other tasks

## Priority Levels
- p1: Critical/Urgent - Immediate deadlines, blocking issues
- p2: High - Important deadlines within a week
- p3: Medium - Standard tasks, flexible timing
- p4: Low - Nice-to-have, can be deferred

## Guidelines
1. When extracting tasks, focus on actionable items with clear outcomes
2. Infer priority from urgency words and deadlines
3. Suggest appropriate categories based on academic context
4. Break down vague tasks into specific action items
5. Consider academic calendar (semesters, conferences) when scheduling

Always be concise and action-oriented in your responses."""

    capabilities = [
        AgentCapability(
            name="extract_tasks",
            description="Extract actionable tasks from text like meeting notes, emails, or documents"
        ),
        AgentCapability(
            name="prioritize_tasks",
            description="Analyze and prioritize tasks based on urgency, importance, and deadlines"
        ),
        AgentCapability(
            name="breakdown_task",
            description="Break down complex tasks into smaller, manageable subtasks"
        ),
        AgentCapability(
            name="schedule_tasks",
            description="Suggest optimal timing for tasks based on deadlines and workload"
        ),
        AgentCapability(
            name="batch_update",
            description="Update multiple tasks at once (status, priority, category)"
        ),
    ]

    tools = [
        ExtractTasksTool(),
        PrioritizeTasksTool(),
        BreakdownTaskTool(),
        ScheduleTasksTool(),
    ]

    temperature = 0.3
    max_tokens = 3000

    def _get_routing_keywords(self) -> list[str]:
        """Keywords for routing decisions."""
        return [
            "task", "todo", "action", "item", "deadline",
            "prioritize", "priority", "urgent", "important",
            "extract", "meeting notes", "email", "schedule",
            "when should", "break down", "subtask", "organize",
            "what should i do", "work on", "complete", "finish"
        ]

    async def plan(self, request: str, context: AgentContext) -> AgentPlan:
        """Create a plan for handling the task request."""
        # Analyze the request to determine the best approach
        request_lower = request.lower()

        steps = []
        required_tools = []

        if any(kw in request_lower for kw in ["extract", "from", "meeting", "email", "notes"]):
            steps.append("Extract actionable tasks from the provided text")
            required_tools.append("extract_tasks")

        if any(kw in request_lower for kw in ["prioritize", "priority", "order", "important", "urgent"]):
            steps.append("Analyze and prioritize tasks")
            required_tools.append("prioritize_tasks")

        if any(kw in request_lower for kw in ["break", "breakdown", "split", "subtask"]):
            steps.append("Break down complex task into subtasks")
            required_tools.append("breakdown_task")

        if any(kw in request_lower for kw in ["schedule", "when", "plan", "calendar"]):
            steps.append("Suggest optimal scheduling")
            required_tools.append("schedule_tasks")

        if not steps:
            steps.append("Analyze request and provide task management assistance")

        return AgentPlan(
            agent_type=self.agent_type,
            goal=f"Help with task management: {request[:100]}",
            steps=steps,
            required_tools=required_tools,
            estimated_complexity=min(len(steps), 5)
        )

    async def execute(
        self,
        request: str,
        context: AgentContext,
        plan: AgentPlan | None = None
    ) -> AgentResult:
        """Execute the task management request."""
        start_time = datetime.utcnow()
        self.status = AgentStatus.EXECUTING

        try:
            # Build prompt with user's tasks context
            task_context = ""
            if context.user_tasks:
                task_summary = f"You have {len(context.user_tasks)} existing tasks."
                if len(context.user_tasks) <= 10:
                    task_list = "\n".join([
                        f"- {t.get('title', 'Untitled')} ({t.get('status', 'todo')}, {t.get('priority', 'p3')})"
                        for t in context.user_tasks
                    ])
                    task_context = f"\n\nCurrent Tasks:\n{task_summary}\n{task_list}"
                else:
                    task_context = f"\n\nCurrent Tasks: {task_summary}"

            prompt = f"""User Request: {request}
{task_context}

Please help with this task management request. If asked to extract tasks, provide them in a structured format.
If asked to prioritize, explain your reasoning. Be specific and actionable."""

            # Call LLM
            response, tool_calls = await self._call_llm(prompt, context)

            # Execute any tool calls
            tool_results = []
            for tc in tool_calls:
                result = await self.execute_tool(tc, context)
                tool_results.append(result)

            # Build suggested actions
            suggested_actions = self._build_suggested_actions(request, response)

            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            self.status = AgentStatus.COMPLETED
            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.COMPLETED,
                output={
                    "response": response,
                    "extracted_tasks": [],  # Would be populated from tool results
                },
                tool_calls=tool_calls,
                tool_results=tool_results,
                suggested_actions=suggested_actions,
                execution_time_ms=execution_time
            )

        except Exception as e:
            self.status = AgentStatus.FAILED
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.FAILED,
                output={"response": f"I encountered an error: {str(e)}"},
                error=str(e),
                execution_time_ms=execution_time
            )

    def _build_suggested_actions(self, request: str, response: str) -> list[SuggestedAction]:
        """Build suggested follow-up actions based on the response."""
        actions = []
        request_lower = request.lower()

        if "extract" in request_lower or "task" in request_lower:
            actions.append(SuggestedAction(
                label="Add tasks to board",
                action="create_tasks",
                params={"source": "extraction"}
            ))

        if "prioritize" in request_lower:
            actions.append(SuggestedAction(
                label="Apply suggested priorities",
                action="update_priorities",
                params={}
            ))

        actions.append(SuggestedAction(
            label="View all tasks",
            action="navigate",
            params={"route": "/board"}
        ))

        return actions
