"""Document processing router for AI-powered document analysis."""

import base64
import io
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.llm import get_llm_service

router = APIRouter(prefix="/documents", tags=["documents"])


# ============================================================================
# Request/Response Models
# ============================================================================


class ExtractTextRequest(BaseModel):
    """Request to extract text from a document."""

    file_base64: str = Field(..., description="Base64-encoded file content")
    mime_type: str = Field(..., description="MIME type of the file")
    filename: str = Field(..., description="Original filename")


class ExtractTextResponse(BaseModel):
    """Response from text extraction."""

    text: str
    page_count: int | None = None
    success: bool = True


class AnalyzeDocumentRequest(BaseModel):
    """Request to analyze document content."""

    text: str = Field(..., max_length=100000, description="Document text to analyze")
    extraction_type: Literal[
        "grant_opportunity",
        "grant_application",
        "cv_resume",
        "budget",
        "timeline",
        "tasks",
        "general",
    ]
    context: str | None = Field(None, description="Additional context to help analysis")
    filename: str | None = Field(None, description="Original filename for context")


class AnalyzeDocumentResponse(BaseModel):
    """Response from document analysis."""

    data: dict[str, Any]
    confidence: float | None = None
    model_used: str
    prompt_version: str = "v1"
    tokens_used: int | None = None


# ============================================================================
# Text Extraction
# ============================================================================


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from a PDF file."""
    try:
        import pypdf
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF processing not available. Install pypdf: pip install pypdf",
        )

    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages), len(reader.pages)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from PDF: {str(e)}",
        )


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="DOCX processing not available. Install python-docx: pip install python-docx",
        )

    try:
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from DOCX: {str(e)}",
        )


@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text(request: ExtractTextRequest) -> ExtractTextResponse:
    """Extract text content from a document file."""
    try:
        file_bytes = base64.b64decode(request.file_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")

    mime_type = request.mime_type.lower()
    page_count = None

    if mime_type == "application/pdf":
        text, page_count = extract_text_from_pdf(file_bytes)
    elif mime_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ]:
        text = extract_text_from_docx(file_bytes)
    elif mime_type == "text/plain":
        text = file_bytes.decode("utf-8", errors="replace")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {mime_type}",
        )

    return ExtractTextResponse(text=text, page_count=page_count)


# ============================================================================
# Document Analysis Prompts
# ============================================================================

ANALYSIS_PROMPTS = {
    "grant_opportunity": """Analyze this grant opportunity/RFP document and extract key information.

Extract the following fields:
- title: The grant/funding opportunity title
- agency: The funding agency name
- program: Specific program name if different from agency
- deadline: Application deadline (in ISO 8601 format if possible)
- funding_amount_min: Minimum award amount (as number)
- funding_amount_max: Maximum award amount (as number)
- duration: Project duration (e.g., "3 years")
- eligibility: List of eligibility requirements
- focus_areas: List of research areas or priorities
- application_components: List of required application materials
- review_criteria: How applications will be evaluated
- key_dates: Important dates (as list of {date, description})
- contact_info: Contact person or office
- url: Any URLs mentioned
- summary: Brief 2-3 sentence summary of the opportunity

Return a JSON object with these fields. Use null for fields that cannot be determined from the document.""",
    "grant_application": """Analyze this grant application document and extract key information.

Extract the following fields:
- project_title: The proposed project title
- principal_investigator: PI name and institution
- co_investigators: List of co-investigators
- institution: Lead institution
- requested_amount: Total funding requested (as number)
- duration: Project duration
- start_date: Proposed start date
- specific_aims: List of specific aims or objectives
- research_approach: Brief summary of methodology
- significance: Key significance/impact statements
- innovation: Key innovation points
- preliminary_data: Summary of any preliminary data mentioned
- personnel: Key personnel and their roles
- timeline: Major milestones or phases
- budget_categories: Budget breakdown by category if available
- summary: Brief 2-3 sentence summary

Return a JSON object with these fields. Use null for fields not found.""",
    "cv_resume": """Analyze this CV/resume document and extract key information about the researcher.

Extract the following fields:
- name: Full name
- title: Current position/title
- institution: Current institution
- department: Department or unit
- email: Email address
- research_interests: List of research interests/keywords
- education: List of degrees with {degree, field, institution, year}
- positions: List of positions with {title, institution, start_year, end_year}
- publications_count: Approximate number of publications mentioned
- notable_publications: List of key publications (up to 5)
- grants: List of grants with {title, agency, amount, years} if mentioned
- awards: List of awards or honors
- teaching: Teaching experience summary
- service: Service activities
- skills: Technical skills or methodologies

Return a JSON object with these fields. Use null for fields not found.""",
    "budget": """Analyze this budget document and extract financial information.

Extract the following fields:
- total_amount: Total budget amount (as number)
- currency: Currency (default USD)
- period: Budget period (e.g., "Year 1", "2024-2025")
- categories: List of budget categories with {name, amount, percentage}
- personnel: Personnel costs breakdown if available
- equipment: Equipment costs
- travel: Travel costs
- supplies: Supplies and materials
- other_costs: Other direct costs
- indirect_costs: Indirect/F&A costs
- cost_sharing: Any cost sharing mentioned
- justification_summary: Brief budget justification summary

Return a JSON object with these fields. Use null for fields not found.""",
    "timeline": """Analyze this timeline/project plan document and extract scheduling information.

Extract the following fields:
- project_title: Project name if mentioned
- total_duration: Overall duration
- start_date: Project start date
- end_date: Project end date
- phases: List of major phases with {name, start, end, description}
- milestones: List of milestones with {name, date, deliverables}
- tasks: List of key tasks with {name, phase, duration, dependencies}
- deliverables: List of expected deliverables
- review_points: Any review or checkpoint dates

Return a JSON object with these fields. Use null for fields not found.""",
    "tasks": """Analyze this document and extract actionable tasks and to-do items.

Extract the following fields:
- tasks: List of tasks, each with:
  - title: Brief task title
  - description: More detailed description if available
  - priority: "p1", "p2", "p3", or "p4" (infer from context)
  - due_date: Due date if mentioned (ISO 8601 format)
  - category: One of: research, teaching, grants, admin, misc
  - assignee: Person responsible if mentioned
  - context: Where in the document this was found
- total_tasks: Total number of tasks extracted
- categories_summary: Count of tasks by category

Return a JSON object with these fields.""",
    "general": """Analyze this document and extract the key information.

Extract the following fields:
- document_type: What type of document this appears to be
- title: Document title if present
- author: Author or creator if mentioned
- date: Document date if mentioned
- summary: 2-3 sentence summary of the document
- key_points: List of main points or takeaways
- entities: Important people, organizations, or places mentioned
- dates_mentioned: Important dates mentioned
- action_items: Any action items or next steps
- references: Any references or citations

Return a JSON object with these fields. Use null for fields not found.""",
}


@router.post("/analyze", response_model=AnalyzeDocumentResponse)
async def analyze_document(request: AnalyzeDocumentRequest) -> AnalyzeDocumentResponse:
    """Analyze document content using AI."""
    llm = get_llm_service()

    # Get the appropriate prompt
    prompt_template = ANALYSIS_PROMPTS.get(request.extraction_type)
    if not prompt_template:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown extraction type: {request.extraction_type}",
        )

    # Build the prompt
    context_info = ""
    if request.context:
        context_info = f"\n\nAdditional context: {request.context}"
    if request.filename:
        context_info += f"\nFilename: {request.filename}"

    prompt = f"""{prompt_template}{context_info}

Document content:
---
{request.text[:50000]}
---

Analyze the document and return the structured JSON."""

    system = """You are an expert document analyst specializing in academic and research documents.
Your task is to carefully extract structured information from documents.
Always respond with valid JSON matching the requested schema.
Be accurate and only include information that is clearly stated in the document.
Use null for fields that cannot be determined."""

    try:
        result = await llm.complete_json(
            prompt=prompt,
            system=system,
            max_tokens=4000,
            temperature=0.2,
        )

        # Calculate approximate confidence based on how many fields were extracted
        non_null_fields = sum(1 for v in result.values() if v is not None)
        total_fields = len(result)
        confidence = non_null_fields / total_fields if total_fields > 0 else 0.5

        return AnalyzeDocumentResponse(
            data=result,
            confidence=round(confidence, 2),
            model_used=llm.settings.llm_provider,
            prompt_version="v1",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze document: {str(e)}",
        )


# ============================================================================
# Grant-specific document analysis
# ============================================================================


class AnalyzeGrantDocumentRequest(BaseModel):
    """Request to analyze a grant document and create/update a grant entry."""

    text: str = Field(..., max_length=100000)
    document_type: Literal["rfp", "guidelines", "application"]


class GrantEntryData(BaseModel):
    """Extracted grant entry data ready for database insertion."""

    title: str
    agency: str | None = None
    description: str | None = None
    deadline: str | None = None
    amount_min: float | None = None
    amount_max: float | None = None
    eligibility: dict[str, Any] | None = None
    funding_instrument_type: str | None = None
    url: str | None = None
    focus_areas: list[str] | None = None
    application_components: list[str] | None = None
    key_dates: list[dict[str, str]] | None = None


class AnalyzeGrantDocumentResponse(BaseModel):
    """Response with grant entry data."""

    entry: GrantEntryData
    confidence: float
    model_used: str
    suggestions: list[str] | None = None


@router.post("/analyze-grant", response_model=AnalyzeGrantDocumentResponse)
async def analyze_grant_document(
    request: AnalyzeGrantDocumentRequest,
) -> AnalyzeGrantDocumentResponse:
    """Analyze a grant document and extract data suitable for creating a grant entry."""
    llm = get_llm_service()

    prompt = f"""Analyze this grant document and extract information to create a grant database entry.

The document is a: {request.document_type}

Extract the following for the grant entry:
- title: Grant/program title (REQUIRED)
- agency: Funding agency name
- description: Brief description of the opportunity (1-2 paragraphs)
- deadline: Application deadline in ISO 8601 format (YYYY-MM-DD)
- amount_min: Minimum award amount as a number
- amount_max: Maximum award amount as a number
- eligibility: Object with eligibility details
- funding_instrument_type: Type (grant, cooperative agreement, contract, etc.)
- url: Any URLs for more information
- focus_areas: List of priority research areas
- application_components: List of required application components
- key_dates: List of {{date, description}} for important dates

Also provide:
- suggestions: List of any additional notes or things to verify

Document content:
---
{request.text[:50000]}
---

Return JSON with "entry" containing the grant data and "suggestions" array."""

    system = """You are an expert at analyzing grant announcements and RFPs.
Extract accurate information for database entry. Be conservative - only include
information clearly stated in the document. Use null for uncertain fields.
Respond with valid JSON only."""

    try:
        result = await llm.complete_json(
            prompt=prompt,
            system=system,
            max_tokens=3000,
            temperature=0.2,
        )

        entry_data = result.get("entry", result)
        suggestions = result.get("suggestions", [])

        # Validate we at least have a title
        if not entry_data.get("title"):
            entry_data["title"] = "Untitled Grant Opportunity"

        # Calculate confidence
        required_fields = ["title", "agency", "deadline"]
        found_required = sum(1 for f in required_fields if entry_data.get(f))
        confidence = found_required / len(required_fields)

        return AnalyzeGrantDocumentResponse(
            entry=GrantEntryData(**entry_data),
            confidence=round(confidence, 2),
            model_used=llm.settings.llm_provider,
            suggestions=suggestions if suggestions else None,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze grant document: {str(e)}",
        )
