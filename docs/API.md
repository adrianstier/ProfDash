# ScholarOS API Documentation

This document describes the REST API endpoints available in ScholarOS.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Tasks API](#tasks-api)
6. [Projects API](#projects-api)
7. [Workspaces API](#workspaces-api)
8. [Grants API](#grants-api)
9. [Calendar API](#calendar-api)
10. [Publications API](#publications-api)
11. [Personnel API](#personnel-api)
12. [AI API](#ai-api)
13. [Agents API](#agents-api)

---

## Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://your-domain.com/api` |

### Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

### Pagination

List endpoints support pagination with the following query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number (1-indexed) |
| `limit` | number | 50 | 100 | Items per page |

**Paginated Response Format:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5,
    "hasMore": true
  }
}
```

---

## Authentication

All API endpoints require authentication via Supabase Auth.

### Web Application

Authentication is handled automatically through HTTP-only cookies when using the web application.

### External API Access

Include the Supabase access token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Getting an Access Token

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Use the access token
const token = session.access_token;
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| `200` | Success | GET, PATCH requests |
| `201` | Created | POST requests that create resources |
| `204` | No Content | DELETE requests |
| `400` | Bad Request | Validation errors |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected errors |

### Validation Errors

Validation errors include details about which fields failed:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "title": ["String must contain at least 1 character"],
      "priority": ["Invalid enum value. Expected 'p1' | 'p2' | 'p3' | 'p4'"]
    }
  }
}
```

---

## Rate Limiting

API requests are rate limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Read endpoints | 200 requests | 1 minute |
| Write endpoints | 100 requests | 1 minute |
| AI endpoints | 20 requests | 1 minute |
| Search endpoints | 30 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1702656000
```

---

## Tasks API

### List Tasks

Retrieves tasks with optional filtering and pagination.

```http
GET /api/tasks
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | Filter by workspace |
| `status` | string | Filter by status: `todo`, `progress`, `done` |
| `category` | string | Filter by category |
| `priority` | string | Filter by priority: `p1`, `p2`, `p3`, `p4` |
| `due` | string | Filter by due date: `today`, `upcoming`, `overdue`, or ISO date |
| `project_id` | UUID | Filter by project |
| `assignee_id` | UUID | Filter by assignee |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Review NSF proposal",
      "description": "Check methodology section and budget justification",
      "category": "grants",
      "priority": "p1",
      "status": "todo",
      "due": "2025-01-15",
      "project_id": "550e8400-e29b-41d4-a716-446655440003",
      "assignees": ["550e8400-e29b-41d4-a716-446655440004"],
      "tags": ["urgent", "review"],
      "completed_at": null,
      "created_at": "2025-01-01T10:00:00Z",
      "updated_at": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 123,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### Create Task

Creates a new task.

```http
POST /api/tasks
```

**Request Body:**

```json
{
  "title": "Review manuscript draft",
  "description": "Check citations and methodology section",
  "category": "research",
  "priority": "p2",
  "status": "todo",
  "due": "2025-01-20",
  "project_id": "550e8400-e29b-41d4-a716-446655440003",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
  "assignees": ["550e8400-e29b-41d4-a716-446655440004"],
  "tags": ["manuscript", "review"]
}
```

**Required Fields:** `title`, `workspace_id`

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "title": "Review manuscript draft",
  // ... full task object
}
```

### Get Task

Retrieves a single task by ID.

```http
GET /api/tasks/{id}
```

**Response:** `200 OK` with task object

### Update Task

Updates an existing task (partial update).

```http
PATCH /api/tasks/{id}
```

**Request Body:** Partial task object with fields to update

```json
{
  "status": "progress",
  "priority": "p1"
}
```

**Response:** `200 OK` with updated task object

### Delete Task

Deletes a task.

```http
DELETE /api/tasks/{id}
```

**Response:** `204 No Content`

---

## Projects API

### List Projects

```http
GET /api/projects
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | Filter by workspace (required) |
| `type` | string | Filter by type: `manuscript`, `grant`, `general` |
| `status` | string | Filter by status: `active`, `completed`, `archived` |
| `stage` | string | Filter by stage |

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
      "type": "manuscript",
      "title": "Machine Learning for Climate Prediction",
      "summary": "A paper exploring ML applications in climate science",
      "status": "active",
      "stage": "drafting",
      "due_date": "2025-03-15",
      "owner_id": "550e8400-e29b-41d4-a716-446655440001",
      "metadata": {
        "journal_target": "Nature Climate Change",
        "coauthors": ["Dr. Smith", "Dr. Johnson"]
      },
      "created_at": "2025-01-01T10:00:00Z",
      "updated_at": "2025-01-05T14:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Create Project

```http
POST /api/projects
```

**Request Body:**

```json
{
  "title": "NSF CAREER Grant",
  "type": "grant",
  "status": "active",
  "stage": "discovery",
  "summary": "CAREER proposal for AI research funding",
  "due_date": "2025-06-15",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
  "metadata": {
    "agency": "NSF",
    "mechanism": "CAREER",
    "amount": 500000
  }
}
```

### Get Project

```http
GET /api/projects/{id}
```

Returns project with milestones, notes, and collaborators.

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "title": "Machine Learning for Climate Prediction",
  // ... project fields
  "milestones": [
    {
      "id": "...",
      "title": "Complete literature review",
      "due_date": "2025-01-31",
      "status": "done",
      "order": 1
    }
  ],
  "notes": [
    {
      "id": "...",
      "content": "Met with Dr. Smith to discuss methodology",
      "author_id": "...",
      "created_at": "2025-01-05T10:00:00Z"
    }
  ],
  "collaborators": [...]
}
```

### Update Project

```http
PATCH /api/projects/{id}
```

### Delete Project

```http
DELETE /api/projects/{id}
```

Deletes project and all associated milestones, notes, and tasks.

### Project Milestones

```http
GET    /api/projects/{id}/milestones
POST   /api/projects/{id}/milestones
PATCH  /api/projects/{id}/milestones/{milestoneId}
DELETE /api/projects/{id}/milestones/{milestoneId}
```

**Create Milestone Request:**

```json
{
  "title": "Submit first draft",
  "description": "Submit complete draft to co-authors",
  "due_date": "2025-02-15",
  "status": "todo"
}
```

### Project Notes

```http
GET    /api/projects/{id}/notes
POST   /api/projects/{id}/notes
PATCH  /api/projects/{id}/notes/{noteId}
DELETE /api/projects/{id}/notes/{noteId}
```

---

## Workspaces API

### List Workspaces

Returns all workspaces the user belongs to.

```http
GET /api/workspaces
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Smith Research Lab",
      "slug": "smith-lab",
      "description": "Machine learning research group",
      "settings": {},
      "created_at": "2024-01-01T00:00:00Z",
      "role": "owner"
    }
  ]
}
```

### Create Workspace

```http
POST /api/workspaces
```

**Request Body:**

```json
{
  "name": "New Research Group",
  "description": "AI and robotics research"
}
```

### Get Workspace

```http
GET /api/workspaces/{id}
```

### Update Workspace

```http
PATCH /api/workspaces/{id}
```

Requires `owner` or `admin` role.

### Delete Workspace

```http
DELETE /api/workspaces/{id}
```

Requires `owner` role. Deletes all workspace data.

### Workspace Members

```http
GET  /api/workspaces/{id}/members
POST /api/workspaces/{id}/members
```

**Add Member Request:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440004",
  "role": "member"
}
```

**Roles:** `owner`, `admin`, `member`, `limited`

### Update Member Role

```http
PATCH /api/workspaces/{id}/members/{memberId}
```

```json
{
  "role": "admin"
}
```

### Remove Member

```http
DELETE /api/workspaces/{id}/members/{memberId}
```

### Workspace Invites

```http
GET  /api/workspaces/{id}/invites
POST /api/workspaces/{id}/invites
```

**Send Invite Request:**

```json
{
  "email": "researcher@university.edu",
  "role": "member"
}
```

**Response:**

```json
{
  "id": "...",
  "email": "researcher@university.edu",
  "role": "member",
  "token": "abc123...",
  "expires_at": "2025-01-15T00:00:00Z"
}
```

### Accept Invite

```http
POST /api/workspaces/accept-invite
```

```json
{
  "token": "abc123..."
}
```

---

## Grants API

### Search Funding Opportunities

Searches funding opportunities from Grants.gov, NIH, and NSF.

```http
GET /api/grants/search
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `keywords` | string | Search keywords |
| `agency` | string | Filter by agency: `NSF`, `NIH`, `DOE`, etc. |
| `amount_min` | number | Minimum award amount |
| `amount_max` | number | Maximum award amount |
| `deadline_from` | string | Deadline after date (ISO) |
| `deadline_to` | string | Deadline before date (ISO) |
| `source` | string | Data source: `grants.gov`, `nih`, `nsf` |

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "external_id": "NSF-24-001",
      "source": "nsf",
      "title": "Computer and Information Science and Engineering Research Initiation Initiative",
      "agency": "NSF",
      "description": "Funding for junior faculty in CISE fields...",
      "award_floor": 175000,
      "award_ceiling": 200000,
      "deadline": "2025-03-15",
      "url": "https://www.nsf.gov/...",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Watchlist

```http
GET  /api/grants/watchlist
POST /api/grants/watchlist
```

**Add to Watchlist:**

```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
  "opportunity_id": "550e8400-e29b-41d4-a716-446655440010"
}
```

### Update Watchlist Item

```http
PATCH /api/grants/watchlist/{id}
```

```json
{
  "status": "applying",
  "priority": "high",
  "notes": "Started working on LOI. Deadline for internal review is 2/1."
}
```

**Status Values:** `watching`, `interested`, `applying`, `submitted`, `awarded`, `rejected`, `declined`

### Remove from Watchlist

```http
DELETE /api/grants/watchlist/{id}
```

### Saved Searches

```http
GET    /api/grants/saved-searches
POST   /api/grants/saved-searches
DELETE /api/grants/saved-searches/{id}
```

**Create Saved Search:**

```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "NSF AI Grants",
  "query": {
    "keywords": "artificial intelligence machine learning",
    "agency": "NSF",
    "amount_min": 100000
  },
  "alert_frequency": "weekly"
}
```

**Alert Frequencies:** `daily`, `weekly`, `none`

---

## Calendar API

### Get Connection Status

```http
GET /api/calendar/connection
```

**Response:**

```json
{
  "connected": true,
  "provider": "google",
  "syncEnabled": true,
  "selectedCalendars": ["primary", "work"],
  "lastSync": "2025-01-05T10:00:00Z"
}
```

### Create Connection (Initiate OAuth)

```http
GET /api/auth/google
```

Redirects to Google OAuth consent screen.

### OAuth Callback

```http
GET /api/auth/google/callback
```

Handles OAuth callback from Google.

### Update Connection Settings

```http
PATCH /api/calendar/connection
```

```json
{
  "syncEnabled": true,
  "selectedCalendars": ["primary", "work-calendar"]
}
```

### List Calendars

```http
GET /api/calendar/calendars
```

Returns available calendars from connected provider.

### Get Events

```http
GET /api/calendar/events
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | string | Start date (ISO 8601) |
| `end` | string | End date (ISO 8601) |
| `calendar_ids` | string | Comma-separated calendar IDs |

**Response:**

```json
{
  "data": [
    {
      "id": "...",
      "external_id": "abc123",
      "summary": "Lab Meeting",
      "description": "Weekly lab meeting",
      "start_time": "2025-01-10T14:00:00Z",
      "end_time": "2025-01-10T15:00:00Z",
      "all_day": false,
      "location": "Room 301"
    }
  ]
}
```

### Disconnect Calendar

```http
DELETE /api/auth/google
```

Removes Google Calendar connection.

---

## Publications API

### List Publications

```http
GET /api/publications
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | Filter by workspace |
| `year` | number | Filter by publication year |
| `type` | string | Filter by type |

### Create Publication

```http
POST /api/publications
```

```json
{
  "workspace_id": "...",
  "title": "Deep Learning for Climate Prediction",
  "doi": "10.1038/s41586-021-03819-2",
  "authors": ["Smith, J.", "Johnson, A."],
  "journal": "Nature",
  "year": 2024,
  "abstract": "...",
  "url": "https://doi.org/..."
}
```

### Import from DOI

```http
POST /api/publications/import
```

```json
{
  "workspace_id": "...",
  "doi": "10.1038/s41586-021-03819-2"
}
```

Fetches metadata from CrossRef/DOI and creates publication.

### Get Publication

```http
GET /api/publications/{id}
```

### Update Publication

```http
PATCH /api/publications/{id}
```

### Delete Publication

```http
DELETE /api/publications/{id}
```

---

## Personnel API

### List Personnel

```http
GET /api/personnel
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | Filter by workspace (required) |
| `role` | string | Filter by role |
| `status` | string | Filter by status: `active`, `alumni` |

### Create Personnel

```http
POST /api/personnel
```

```json
{
  "workspace_id": "...",
  "name": "Jane Researcher",
  "email": "jane@university.edu",
  "title": "PhD Candidate",
  "role": "grad-student",
  "status": "active",
  "metadata": {
    "start_date": "2023-09-01",
    "expected_graduation": "2027-05-01",
    "funding_source": "NSF Fellowship"
  }
}
```

**Roles:** `postdoc`, `grad-student`, `undergrad`, `staff`

### Get Personnel

```http
GET /api/personnel/{id}
```

### Update Personnel

```http
PATCH /api/personnel/{id}
```

### Delete Personnel

```http
DELETE /api/personnel/{id}
```

---

## AI API

AI endpoints proxy to the Python FastAPI AI service.

### Extract Tasks

Extracts actionable tasks from text using AI.

```http
POST /api/ai/extract-tasks
```

**Request Body:**

```json
{
  "text": "Meeting notes: Need to review the grant proposal by Friday. Also schedule a meeting with the team for next week to discuss the results.",
  "context": {
    "categories": ["research", "grants", "teaching"],
    "projects": [
      {"id": "...", "title": "NSF Grant"}
    ]
  }
}
```

**Response:**

```json
{
  "tasks": [
    {
      "title": "Review grant proposal",
      "description": "Review the grant proposal from meeting notes",
      "priority": "p2",
      "category": "grants",
      "due": "2025-01-10",
      "project_id": "...",
      "confidence": 0.95
    },
    {
      "title": "Schedule team meeting",
      "description": "Schedule meeting to discuss results",
      "priority": "p3",
      "category": "admin",
      "due": "2025-01-17",
      "confidence": 0.88
    }
  ]
}
```

### Project Summary

Generates AI-powered project status summary.

```http
POST /api/ai/project-summary
```

**Request Body:**

```json
{
  "project": {
    "id": "...",
    "title": "Machine Learning Paper",
    "type": "manuscript",
    "stage": "drafting",
    "summary": "Paper on ML applications in climate science"
  },
  "milestones": [...],
  "tasks": [...],
  "notes": [...]
}
```

**Response:**

```json
{
  "health_score": 75,
  "status": "On Track",
  "summary": "The project is progressing well with 3 of 5 milestones completed.",
  "accomplishments": [
    "Completed literature review",
    "Drafted methodology section",
    "Collected preliminary data"
  ],
  "blockers": [
    "Waiting for co-author feedback on introduction"
  ],
  "next_actions": [
    "Follow up with Dr. Smith on introduction review",
    "Begin results section draft"
  ],
  "risk_factors": [
    "Deadline approaching with significant work remaining"
  ]
}
```

### Grant Fit Score

Analyzes grant opportunity fit for researcher profile.

```http
POST /api/ai/fit-score
```

**Request Body:**

```json
{
  "opportunity": {
    "id": "...",
    "title": "AI Research Grant",
    "agency": "NSF",
    "description": "Funding for fundamental AI research...",
    "award_ceiling": 500000,
    "deadline": "2025-03-15",
    "eligibility": "Junior faculty within 5 years of PhD"
  },
  "profile": {
    "keywords": ["machine learning", "computer vision", "deep learning"],
    "recent_projects": [...],
    "publications": [...],
    "funding_history": [...]
  }
}
```

**Response:**

```json
{
  "fit_score": 82,
  "rating": "Strong Fit",
  "reasons": [
    "Strong alignment with AI and ML focus area",
    "Previous NSF funding demonstrates track record",
    "Recent publications in relevant venues"
  ],
  "gaps": [
    "Limited publication record in specific subfield mentioned in RFP",
    "No prior collaboration with industry partners"
  ],
  "suggestions": [
    "Emphasize interdisciplinary aspects of your research",
    "Include preliminary data from your recent Nature paper",
    "Consider reaching out to industry partners for collaboration letter"
  ]
}
```

---

## Agents API

The agents API provides access to the multi-agent AI framework.

### Chat with Agents

```http
POST /api/agents/chat
```

**Request Body:**

```json
{
  "message": "Summarize the status of my NSF CAREER proposal",
  "context": {
    "workspace_id": "...",
    "project_id": "..."
  },
  "conversation_id": "..."
}
```

**Response:**

```json
{
  "message": "Based on my analysis of your NSF CAREER proposal...",
  "agent": "project_agent",
  "conversation_id": "...",
  "suggestions": [
    {
      "type": "action",
      "label": "Create task for budget review",
      "action": "create_task",
      "payload": {...}
    }
  ]
}
```

### Execute Agent Action

```http
POST /api/agents/execute
```

```json
{
  "action": "create_task",
  "payload": {
    "title": "Review budget justification",
    "project_id": "...",
    "priority": "p2"
  },
  "execution_id": "..."
}
```

### Provide Feedback

```http
POST /api/agents/feedback
```

```json
{
  "execution_id": "...",
  "accepted": true,
  "feedback": "This was helpful, but the priority should be p1"
}
```

### Orchestrate Multi-Agent Workflow

```http
POST /api/agents/orchestrate
```

```json
{
  "workflow": "weekly_review",
  "context": {
    "workspace_id": "...",
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-01-07"
    }
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get tasks
const response = await fetch('/api/tasks?workspace_id=...', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
const { data: tasks } = await response.json();

// Create task
const newTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Task',
    priority: 'p2',
    category: 'research',
    workspace_id: '...'
  })
}).then(r => r.json());
```

### cURL

```bash
# Get tasks
curl -X GET "https://your-domain.com/api/tasks?workspace_id=..." \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Create task
curl -X POST "https://your-domain.com/api/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review manuscript",
    "priority": "p2",
    "category": "research",
    "workspace_id": "..."
  }'

# Extract tasks with AI
curl -X POST "https://your-domain.com/api/ai/extract-tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Need to submit the paper by Friday and schedule a meeting with the team"
  }'
```

---

## Webhooks (Future)

Webhook support for external integrations is planned for a future release. This will enable:

- Real-time notifications to external services
- Integration with Slack, Discord, email
- Custom automation workflows

---

*API Version: 2.0*
*Last Updated: January 2025*
