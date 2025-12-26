"""Grant fit scoring endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import FitScoreRequest, FitScoreResponse
from app.services.llm import LLMService, get_llm_service

router = APIRouter(prefix="/grants", tags=["grants"])

SYSTEM_PROMPT = """You are a grant fit assessment specialist for academic researchers.

Your job is to evaluate how well a grant opportunity matches a researcher's profile.

When scoring fit:
1. Compare research areas/keywords to grant focus
2. Check if researcher's experience aligns with grant requirements
3. Consider institutional eligibility if mentioned
4. Evaluate whether past funding suggests a good match
5. Identify gaps between requirements and researcher profile
6. Suggest ways to strengthen an application

Scoring guidelines:
- 80-100: Excellent fit - strong alignment, high chance of competitive application
- 60-79: Good fit - solid match with some areas to address
- 40-59: Moderate fit - possible but would need significant positioning
- 20-39: Weak fit - major gaps, might not be worth pursuing
- 0-19: Poor fit - fundamental misalignment

Be honest and constructive. It's better to identify a poor fit early than waste time on applications unlikely to succeed."""


@router.post("/fit-score", response_model=FitScoreResponse)
async def score_grant_fit(
    request: FitScoreRequest,
    llm: LLMService = Depends(get_llm_service),
) -> FitScoreResponse:
    """Score how well a grant opportunity matches a researcher profile."""

    opportunity = request.opportunity
    profile = request.profile

    # Build profile summary
    profile_summary = f"""
Researcher Profile:
- Research Keywords: {', '.join(profile.keywords) if profile.keywords else 'Not specified'}
- Recent Projects: {', '.join(profile.recent_projects) if profile.recent_projects else 'Not specified'}
- Previous Funding: {', '.join(profile.funding_history) if profile.funding_history else 'Not specified'}
- Institution Type: {profile.institution_type or 'Not specified'}
"""

    # Build opportunity summary
    opportunity_summary = f"""
Grant Opportunity:
- Title: {opportunity.title}
- Agency: {opportunity.agency or 'Not specified'}
- Description: {opportunity.description or 'Not provided'}
- Eligibility: {opportunity.eligibility or 'Not specified'}
- Funding Amount: {opportunity.funding_amount or 'Not specified'}
- Deadline: {opportunity.deadline or 'Not specified'}
"""

    prompt = f"""Evaluate the fit between this researcher and grant opportunity:

{profile_summary}

{opportunity_summary}

Return a JSON object with this structure:
{{
  "score": 0-100 overall fit score,
  "reasons": ["2-4 specific reasons why this is a good/bad fit"],
  "gaps": ["List any missing qualifications or concerns (can be empty)"],
  "suggestions": ["2-4 concrete suggestions to strengthen an application"],
  "summary": "One sentence fit assessment"
}}

Be specific and reference actual elements from both the profile and opportunity."""

    try:
        result = await llm.complete_json(prompt, SYSTEM_PROMPT)

        return FitScoreResponse(
            score=min(100, max(0, result.get("score", 50))),
            reasons=result.get("reasons", []),
            gaps=result.get("gaps", []),
            suggestions=result.get("suggestions", []),
            summary=result.get("summary", "Fit assessment completed."),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to score grant fit: {str(e)}",
        )
