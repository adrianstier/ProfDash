"""Project summary endpoint."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import ProjectSummaryRequest, ProjectSummaryResponse
from app.services.llm import LLMService, get_llm_service

router = APIRouter(prefix="/summarize", tags=["summarize"])

SYSTEM_PROMPT = """You are a project status analyst for academic professionals.

Your job is to analyze project data (tasks, milestones, notes) and generate insightful status summaries.

When analyzing a project:
1. Assess overall progress based on task completion and milestone status
2. Identify recent accomplishments (completed tasks, reached milestones)
3. Flag blockers (overdue tasks, stalled work, mentioned issues in notes)
4. Suggest concrete next actions based on pending work
5. Calculate a health score (0-100) based on:
   - Task completion rate
   - Whether deadlines are being met
   - Progress through stages/milestones
   - Presence of blockers or overdue items

Be concise and actionable. Focus on what matters most for the researcher."""


@router.post("/project", response_model=ProjectSummaryResponse)
async def summarize_project(
    request: ProjectSummaryRequest,
    llm: LLMService = Depends(get_llm_service),
) -> ProjectSummaryResponse:
    """Generate a status summary for a project."""

    # Build context strings
    project = request.project
    today = date.today().isoformat()

    # Format tasks
    tasks_summary = ""
    if request.tasks:
        done = [t for t in request.tasks if t.status == "done"]
        in_progress = [t for t in request.tasks if t.status == "progress"]
        todo = [t for t in request.tasks if t.status == "todo"]
        overdue = [
            t for t in request.tasks
            if t.due_date and t.status != "done" and str(t.due_date) < today
        ]

        tasks_summary = f"""
Tasks Overview:
- Completed: {len(done)}
- In Progress: {len(in_progress)}
- To Do: {len(todo)}
- Overdue: {len(overdue)}

Recent completed tasks: {', '.join(t.title for t in done[:5]) or 'None'}
Current in-progress tasks: {', '.join(t.title for t in in_progress[:5]) or 'None'}
Overdue tasks: {', '.join(f"{t.title} (due {t.due_date})" for t in overdue[:3]) or 'None'}
High-priority pending: {', '.join(t.title for t in todo if t.priority in ('p1', 'p2'))[:5] or 'None'}
"""

    # Format milestones
    milestones_summary = ""
    if request.milestones:
        completed = [m for m in request.milestones if m.completed]
        upcoming = [
            m for m in request.milestones
            if not m.completed and m.due_date
        ]
        milestones_summary = f"""
Milestones:
- Completed: {len(completed)} of {len(request.milestones)}
- Upcoming: {', '.join(f"{m.title} (due {m.due_date})" for m in upcoming[:3]) or 'None'}
"""

    # Format notes
    notes_summary = ""
    if request.recent_notes:
        notes_text = "\n".join(
            f"- {note.content[:200]}..." if len(note.content) > 200 else f"- {note.content}"
            for note in request.recent_notes[:5]
        )
        notes_summary = f"""
Recent Notes:
{notes_text}
"""

    prompt = f"""Today's date is {today}.

Analyze this academic project and generate a status summary:

Project: {project.title}
Type: {project.type}
Status: {project.status}
Stage: {project.stage or 'Not set'}
Summary: {project.summary or 'No summary'}

{tasks_summary}
{milestones_summary}
{notes_summary}

Return a JSON object with this structure:
{{
  "status_summary": "One clear paragraph describing current project status, progress, and key points",
  "accomplishments": ["List of 2-4 recent accomplishments or wins"],
  "blockers": ["List of current blockers, risks, or issues (can be empty)"],
  "next_actions": ["List of 3-5 concrete suggested next actions"],
  "health_score": 0-100 based on overall project health
}}

Be specific and actionable. Reference actual task names and milestones when relevant."""

    try:
        result = await llm.complete_json(prompt, SYSTEM_PROMPT)

        return ProjectSummaryResponse(
            status_summary=result.get("status_summary", "Unable to generate summary."),
            accomplishments=result.get("accomplishments", []),
            blockers=result.get("blockers", []),
            next_actions=result.get("next_actions", []),
            health_score=min(100, max(0, result.get("health_score", 50))),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}",
        )
