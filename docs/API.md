# ScholarOS API Documentation

This document describes the REST API endpoints available in ScholarOS.

## Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** `https://your-domain.com/api`

## Authentication

All API endpoints require authentication via Supabase. The authentication token is automatically handled through cookies when using the web application. For external API access, include the Supabase access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Tasks API

### List Tasks

Retrieves all tasks for the current user, optionally filtered by workspace.

```http
GET /api/tasks
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | string | Filter tasks by workspace ID |

**Response:**

```json
{
  "tasks": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "workspace_id": "uuid",
      "title": "Review NSF proposal",
      "description": "Check methodology section",
      "category": "grants",
      "priority": "p1",
      "status": "todo",
      "due": "2024-12-20",
      "project_id": "uuid",
      "tags": ["important"],
      "created_at": "2024-12-15T10:00:00Z",
      "updated_at": "2024-12-15T10:00:00Z"
    }
  ]
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
  "title": "Review manuscript",
  "description": "Check citations and methodology",
  "category": "research",
  "priority": "p2",
  "status": "todo",
  "due": "2024-12-25",
  "project_id": "uuid",
  "workspace_id": "uuid",
  "tags": ["manuscript"],
  "assignees": []
}
```

**Response:** Returns the created task object.

### Get Task

Retrieves a single task by ID.

```http
GET /api/tasks/{id}
```

**Response:** Returns the task object.

### Update Task

Updates an existing task.

```http
PATCH /api/tasks/{id}
```

**Request Body:** Partial task object with fields to update.

**Response:** Returns the updated task object.

### Delete Task

Deletes a task.

```http
DELETE /api/tasks/{id}
```

**Response:** `204 No Content`

---

## Projects API

### List Projects

Retrieves all projects for the current user.

```http
GET /api/projects
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | string | Filter by workspace |
| `type` | string | Filter by type: `manuscript`, `grant`, `general` |
| `status` | string | Filter by status: `active`, `completed`, `archived` |

**Response:**

```json
{
  "projects": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "title": "Machine Learning Paper",
      "type": "manuscript",
      "status": "active",
      "stage": "drafting",
      "summary": "A paper on ML applications",
      "due_date": "2024-12-31",
      "created_at": "2024-12-01T10:00:00Z",
      "updated_at": "2024-12-15T10:00:00Z"
    }
  ]
}
```

### Create Project

Creates a new project.

```http
POST /api/projects
```

**Request Body:**

```json
{
  "title": "New Grant Proposal",
  "type": "grant",
  "status": "active",
  "stage": "discovery",
  "summary": "NSF proposal for AI research",
  "due_date": "2025-03-15",
  "workspace_id": "uuid"
}
```

### Get Project

Retrieves a single project with milestones and notes.

```http
GET /api/projects/{id}
```

### Update Project

Updates an existing project.

```http
PATCH /api/projects/{id}
```

### Delete Project

Deletes a project and all associated data.

```http
DELETE /api/projects/{id}
```

### Project Milestones

```http
GET /api/projects/{id}/milestones
POST /api/projects/{id}/milestones
```

### Project Notes

```http
GET /api/projects/{id}/notes
POST /api/projects/{id}/notes
```

---

## Workspaces API

### List Workspaces

Retrieves all workspaces the user belongs to.

```http
GET /api/workspaces
```

**Response:**

```json
{
  "workspaces": [
    {
      "id": "uuid",
      "name": "My Lab",
      "slug": "my-lab",
      "description": "Research lab workspace",
      "settings": {},
      "created_at": "2024-01-01T00:00:00Z",
      "role": "owner"
    }
  ]
}
```

### Create Workspace

Creates a new workspace.

```http
POST /api/workspaces
```

**Request Body:**

```json
{
  "name": "New Workspace",
  "description": "Description here"
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

### Delete Workspace

```http
DELETE /api/workspaces/{id}
```

### Workspace Members

```http
GET /api/workspaces/{id}/members
POST /api/workspaces/{id}/members
```

**Roles:** `owner`, `admin`, `member`, `limited`

### Workspace Invites

```http
GET /api/workspaces/{id}/invites
POST /api/workspaces/{id}/invites
```

**Request Body for POST:**

```json
{
  "email": "user@example.com",
  "role": "member"
}
```

### Accept Invite

```http
POST /api/workspaces/accept-invite
```

**Request Body:**

```json
{
  "token": "invite-token-here"
}
```

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
  "lastSync": "2024-12-15T10:00:00Z"
}
```

### Update Connection Settings

```http
PATCH /api/calendar/connection
```

**Request Body:**

```json
{
  "syncEnabled": true,
  "selectedCalendars": ["primary"]
}
```

### Get Calendars

Lists available calendars from connected provider.

```http
GET /api/calendar/calendars
```

### Get Events

Retrieves calendar events for a date range.

```http
GET /api/calendar/events
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | string | Start date (ISO 8601) |
| `end` | string | End date (ISO 8601) |

---

## Google OAuth

### Initiate OAuth

Redirects to Google OAuth consent screen.

```http
GET /api/auth/google
```

### OAuth Callback

Handles the OAuth callback from Google.

```http
GET /api/auth/google/callback
```

### Disconnect Google

Removes Google calendar connection.

```http
DELETE /api/auth/google
```

---

## Grants API

### Search Grants

Searches funding opportunities.

```http
GET /api/grants/search
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `keywords` | string | Search keywords |
| `agency` | string | Filter by agency (e.g., "NSF", "NIH") |
| `amount_min` | number | Minimum award amount |
| `amount_max` | number | Maximum award amount |
| `deadline_from` | string | Deadline after date |
| `deadline_to` | string | Deadline before date |

**Response:**

```json
{
  "opportunities": [
    {
      "id": "uuid",
      "opportunity_number": "NSF-24-001",
      "title": "AI Research Grant",
      "agency": "NSF",
      "description": "Funding for AI research...",
      "award_ceiling": 500000,
      "deadline": "2025-03-15",
      "url": "https://grants.gov/..."
    }
  ],
  "total": 25
}
```

### Watchlist

```http
GET /api/grants/watchlist
POST /api/grants/watchlist
```

**POST Request Body:**

```json
{
  "workspace_id": "uuid",
  "opportunity_id": "uuid"
}
```

### Update Watchlist Item

```http
PATCH /api/grants/watchlist/{id}
```

**Request Body:**

```json
{
  "status": "applying",
  "priority": "high",
  "notes": "Started working on LOI"
}
```

### Remove from Watchlist

```http
DELETE /api/grants/watchlist/{id}
```

### Saved Searches

```http
GET /api/grants/saved-searches
POST /api/grants/saved-searches
DELETE /api/grants/saved-searches/{id}
```

**POST Request Body:**

```json
{
  "workspace_id": "uuid",
  "name": "NSF AI Grants",
  "query": {
    "keywords": "artificial intelligence",
    "agency": "NSF"
  },
  "alert_frequency": "weekly"
}
```

---

## AI API

These endpoints proxy to the Python FastAPI AI service.

### Extract Tasks

Extracts actionable tasks from text using AI.

```http
POST /api/ai/extract-tasks
```

**Request Body:**

```json
{
  "text": "Meeting notes: Need to review the grant proposal by Friday. Also schedule a meeting with the team for next week.",
  "context": {
    "categories": ["research", "grants", "teaching"],
    "projects": [{"id": "uuid", "title": "NSF Grant"}]
  }
}
```

**Response:**

```json
{
  "tasks": [
    {
      "title": "Review grant proposal",
      "description": "Review the grant proposal",
      "priority": "p2",
      "category": "grants",
      "due": "2024-12-20",
      "confidence": 0.95
    },
    {
      "title": "Schedule team meeting",
      "description": "Schedule a meeting with the team",
      "priority": "p3",
      "category": "admin",
      "due": "2024-12-27",
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
    "id": "uuid",
    "title": "Machine Learning Paper",
    "type": "manuscript",
    "stage": "drafting",
    "summary": "Paper on ML applications"
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
  "accomplishments": [
    "Completed literature review",
    "Drafted methodology section"
  ],
  "blockers": [
    "Waiting for data from collaborator"
  ],
  "next_actions": [
    "Follow up on data request",
    "Begin results section"
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
    "id": "uuid",
    "title": "AI Research Grant",
    "agency": "NSF",
    "description": "Funding for AI research...",
    "funding_amount": "$500,000",
    "deadline": "2025-03-15"
  },
  "profile": {
    "keywords": ["machine learning", "computer vision"],
    "recent_projects": [...],
    "funding_history": [...]
  }
}
```

**Response:**

```json
{
  "fit_score": 82,
  "reasons": [
    "Strong alignment with AI focus area",
    "Previous NSF funding experience"
  ],
  "gaps": [
    "Limited publication record in specific subfield"
  ],
  "suggestions": [
    "Emphasize interdisciplinary aspects",
    "Include preliminary data from recent project"
  ]
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Standard endpoints:** 100 requests per minute
- **AI endpoints:** 20 requests per minute
- **Search endpoints:** 30 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702656000
```

---

## Webhooks (Future)

Webhook support for external integrations is planned for a future release.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get tasks
const { data: tasks, error } = await fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
}).then(r => r.json());

// Create task
const newTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    title: 'New Task',
    priority: 'p2',
    category: 'research'
  })
}).then(r => r.json());
```

### cURL

```bash
# Get tasks
curl -X GET "https://your-domain.com/api/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create task
curl -X POST "https://your-domain.com/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "New Task", "priority": "p2"}'
```
