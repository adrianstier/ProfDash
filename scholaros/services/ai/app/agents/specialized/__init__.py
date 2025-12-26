"""Specialized agents for ScholarOS."""

from app.agents.specialized.task_agent import TaskAgent
from app.agents.specialized.project_agent import ProjectAgent
from app.agents.specialized.grant_agent import GrantAgent
from app.agents.specialized.research_agent import ResearchAgent
from app.agents.specialized.calendar_agent import CalendarAgent
from app.agents.specialized.writing_agent import WritingAgent
from app.agents.specialized.personnel_agent import PersonnelAgent
from app.agents.specialized.planner_agent import PlannerAgent

__all__ = [
    "TaskAgent",
    "ProjectAgent",
    "GrantAgent",
    "ResearchAgent",
    "CalendarAgent",
    "WritingAgent",
    "PersonnelAgent",
    "PlannerAgent",
]
