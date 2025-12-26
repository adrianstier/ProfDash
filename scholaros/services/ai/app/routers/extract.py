"""Task extraction endpoint."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import ExtractedTask, ExtractTasksRequest, ExtractTasksResponse
from app.services.llm import LLMService, get_llm_service

router = APIRouter(prefix="/extract", tags=["extract"])

SYSTEM_PROMPT = """You are a task extraction assistant for academic professionals (professors, researchers, lab managers).

Your job is to identify actionable tasks from unstructured text like meeting notes, emails, or transcripts.

For each task you identify:
1. Write a clear, actionable title (start with a verb)
2. Add description if there's helpful context
3. Assign priority based on urgency/importance:
   - p1: Urgent and time-sensitive (deadlines within days)
   - p2: High priority, important but not urgent
   - p3: Medium priority, standard tasks
   - p4: Low priority, nice-to-have
4. Assign the most appropriate category:
   - research: Lab work, experiments, data analysis, papers
   - teaching: Course prep, lectures, grading, student questions
   - grants: Grant writing, budgets, reporting, compliance
   - grad-mentorship: PhD/Masters student advising
   - undergrad-mentorship: Undergraduate supervision
   - admin: Meetings, committee work, bureaucracy
   - misc: Everything else
5. Extract due dates if mentioned (relative dates like "next Friday" should be converted)
6. Rate your confidence (0.0-1.0) in this being a valid, actionable task

Focus on extracting concrete, actionable items. Skip vague statements or general discussion points."""


def get_relative_date(days_from_now: int) -> str:
    """Get ISO date string for a date relative to today."""
    return (date.today() + timedelta(days=days_from_now)).isoformat()


@router.post("", response_model=ExtractTasksResponse)
async def extract_tasks(
    request: ExtractTasksRequest,
    llm: LLMService = Depends(get_llm_service),
) -> ExtractTasksResponse:
    """Extract actionable tasks from unstructured text."""

    # Build the prompt
    today = date.today().isoformat()
    context_note = f"\n\nContext: {request.context}" if request.context else ""

    prompt = f"""Today's date is {today}.

Extract actionable tasks from the following text{context_note}:

---
{request.text}
---

Return a JSON object with this structure:
{{
  "tasks": [
    {{
      "title": "Clear actionable task title starting with verb",
      "description": "Optional additional context",
      "priority": "p1" | "p2" | "p3" | "p4",
      "category": "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc",
      "due_date": "YYYY-MM-DD" or null,
      "confidence": 0.0 to 1.0
    }}
  ],
  "source_summary": "Brief 1-2 sentence summary of what the text was about"
}}

If no clear tasks can be extracted, return an empty tasks array.
Convert relative dates (like "next Monday", "by end of week") to actual dates based on today's date ({today})."""

    try:
        result = await llm.complete_json(prompt, SYSTEM_PROMPT)

        # Validate and parse response
        tasks = []
        for task_data in result.get("tasks", []):
            try:
                task = ExtractedTask.model_validate(task_data)
                tasks.append(task)
            except Exception:
                # Skip malformed tasks
                continue

        return ExtractTasksResponse(
            tasks=tasks,
            source_summary=result.get("source_summary", "Task extraction completed."),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract tasks: {str(e)}",
        )
