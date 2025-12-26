# ScholarOS Multi-Agent Framework Architecture

## Overview

The ScholarOS Multi-Agent Framework is designed to provide intelligent, context-aware assistance for academic professionals. The framework uses specialized AI agents that collaborate to handle complex workflows like grant writing, project management, and research coordination.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  useAgentChat   │  │  useAgentTask   │  │   useAgentOrchestrator      │  │
│  │  (Real-time)    │  │  (Async Tasks)  │  │   (Multi-agent workflows)   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│  ┌────────┴────────────────────┴──────────────────────────┴──────────────┐  │
│  │                      AgentContext (Zustand Store)                      │  │
│  │  - Active agents, conversation history, task queue, agent states      │  │
│  └───────────────────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────────────────┼───────────────────────────────────┘
                                           │ WebSocket / REST
┌──────────────────────────────────────────┼───────────────────────────────────┐
│                           API LAYER (Next.js Routes)                          │
├──────────────────────────────────────────┼───────────────────────────────────┤
│  ┌───────────────────────────────────────┴───────────────────────────────┐  │
│  │                    /api/agents/* (Route Handlers)                      │  │
│  │  POST /api/agents/chat          - Stream chat responses                │  │
│  │  POST /api/agents/execute       - Execute agent task                   │  │
│  │  POST /api/agents/orchestrate   - Multi-agent workflow                 │  │
│  │  GET  /api/agents/status/:id    - Get agent task status                │  │
│  │  POST /api/agents/feedback      - Submit human feedback                │  │
│  └───────────────────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────────────────┼───────────────────────────────────┘
                                           │ HTTP/gRPC
┌──────────────────────────────────────────┼───────────────────────────────────┐
│                         AI SERVICE LAYER (Python FastAPI)                     │
├──────────────────────────────────────────┼───────────────────────────────────┤
│  ┌───────────────────────────────────────┴───────────────────────────────┐  │
│  │                        AGENT ORCHESTRATOR                              │  │
│  │  - Routes requests to appropriate agents                               │  │
│  │  - Manages agent lifecycle and state                                   │  │
│  │  - Handles inter-agent communication                                   │  │
│  │  - Implements consensus/voting for critical decisions                  │  │
│  └───────────────────┬───────────────────────────────────────────────────┘  │
│                      │                                                        │
│  ┌───────────────────┴───────────────────────────────────────────────────┐  │
│  │                        SPECIALIZED AGENTS                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Task      │  │  Project    │  │   Grant     │  │  Research   │   │  │
│  │  │   Agent     │  │  Agent      │  │   Agent     │  │  Agent      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  Calendar   │  │  Writing    │  │  Personnel  │  │  Planner    │   │  │
│  │  │  Agent      │  │  Agent      │  │  Agent      │  │  Agent      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SHARED SERVICES                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │    LLM      │  │   Memory    │  │   Tools     │  │   State     │   │  │
│  │  │  Provider   │  │   Store     │  │  Registry   │  │   Manager   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────┼───────────────────────────────────┐
│                              DATA LAYER (Supabase)                            │
├──────────────────────────────────────────┼───────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   PostgreSQL    │  │   pgvector      │  │   Realtime Subscriptions    │  │
│  │   (Core Data)   │  │   (Embeddings)  │  │   (Live Updates)            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                               │
│  Tables: agent_sessions, agent_messages, agent_tasks, agent_memory           │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Agent Types

Each agent is specialized for a specific domain within ScholarOS:

| Agent | Domain | Capabilities |
|-------|--------|--------------|
| **TaskAgent** | Task Management | Create, prioritize, schedule, batch process tasks |
| **ProjectAgent** | Project Coordination | Milestone tracking, status updates, health assessment |
| **GrantAgent** | Grant Discovery & Writing | Opportunity matching, proposal drafting, compliance |
| **ResearchAgent** | Research Support | Literature search, citation management, summaries |
| **CalendarAgent** | Schedule Management | Meeting scheduling, deadline reminders, time blocking |
| **WritingAgent** | Academic Writing | Drafting, editing, formatting manuscripts |
| **PersonnelAgent** | Team Management | Mentoring suggestions, workload balancing |
| **PlannerAgent** | Strategic Planning | Long-term planning, goal setting, progress tracking |

### 2. Agent Lifecycle

```
[IDLE] → [PLANNING] → [EXECUTING] → [AWAITING_FEEDBACK] → [COMPLETE/FAILED]
                ↑           │
                └───────────┘ (retry on recoverable errors)
```

### 3. Inter-Agent Communication

Agents communicate through a message-passing system:

```python
class AgentMessage:
    sender: AgentType
    recipient: AgentType | "orchestrator" | "all"
    message_type: "request" | "response" | "broadcast" | "handoff"
    content: dict
    context: AgentContext
    priority: int
```

### 4. Memory Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MEMORY HIERARCHY                   │
├─────────────────────────────────────────────────────┤
│  SHORT-TERM MEMORY (Session)                        │
│  - Current conversation context                     │
│  - Active task state                                │
│  - Recent tool outputs                              │
├─────────────────────────────────────────────────────┤
│  WORKING MEMORY (Task-scoped)                       │
│  - Relevant documents/data for current task         │
│  - Intermediate results                             │
│  - Agent reasoning traces                           │
├─────────────────────────────────────────────────────┤
│  LONG-TERM MEMORY (Persistent)                      │
│  - User preferences and patterns                    │
│  - Historical decisions and outcomes               │
│  - Learned optimizations                           │
│  - Vector embeddings for semantic search           │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### Agent Base Class

```python
class BaseAgent(ABC):
    """Abstract base class for all ScholarOS agents."""

    agent_type: AgentType
    name: str
    description: str
    capabilities: list[str]
    tools: list[Tool]

    @abstractmethod
    async def plan(self, request: AgentRequest) -> AgentPlan:
        """Create an execution plan for the request."""
        pass

    @abstractmethod
    async def execute(self, plan: AgentPlan) -> AgentResult:
        """Execute the plan and return results."""
        pass

    async def reflect(self, result: AgentResult) -> AgentReflection:
        """Analyze execution results and learn from them."""
        pass

    async def handoff(self, target: AgentType, context: dict) -> HandoffResult:
        """Transfer control to another agent."""
        pass
```

### Tool Registry

Agents have access to domain-specific tools:

```python
# Task Agent Tools
task_tools = [
    CreateTaskTool(),      # Create new tasks
    UpdateTaskTool(),      # Modify existing tasks
    BatchTaskTool(),       # Bulk operations
    PrioritizeTool(),      # AI-powered prioritization
    ScheduleTool(),        # Smart scheduling
]

# Grant Agent Tools
grant_tools = [
    SearchOpportunitiesTool(),  # Find funding opportunities
    FitAnalysisTool(),          # Assess fit with profile
    DeadlineTrackerTool(),      # Track important dates
    ComplianceCheckTool(),      # Verify eligibility
    ProposalDrafterTool(),      # Generate proposal sections
]

# Research Agent Tools
research_tools = [
    LiteratureSearchTool(),     # Search academic databases
    CitationManagerTool(),      # Format citations
    SummarizePaperTool(),       # Summarize research papers
    FindRelatedWorkTool(),      # Find related research
]
```

### Orchestration Patterns

#### 1. Sequential Workflow
```
User Request → TaskAgent → ProjectAgent → Response
```

#### 2. Parallel Execution
```
                    ┌→ TaskAgent ────┐
User Request ──────┼→ CalendarAgent ┼──→ Aggregator → Response
                    └→ ProjectAgent ─┘
```

#### 3. Hierarchical Delegation
```
PlannerAgent (Coordinator)
    ├── TaskAgent (Sub-task 1)
    ├── GrantAgent (Sub-task 2)
    └── WritingAgent (Sub-task 3)
```

#### 4. Consensus-Based Decisions
```
Critical Decision Request
    ├── Agent A: Vote + Reasoning
    ├── Agent B: Vote + Reasoning
    └── Agent C: Vote + Reasoning
            ↓
    Consensus Resolver → Final Decision
```

## Database Schema Extensions

```sql
-- Agent Sessions (conversation context)
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL, -- 'chat', 'task', 'workflow'
    status TEXT NOT NULL DEFAULT 'active',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Messages (conversation history)
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    agent_type TEXT, -- which agent responded
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Tasks (async task execution)
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    input JSONB NOT NULL,
    output JSONB,
    error TEXT,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Memory (long-term learning)
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL, -- 'preference', 'pattern', 'feedback', 'insight'
    agent_type TEXT,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    embedding vector(1536), -- for semantic search
    relevance_score FLOAT DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_agent_sessions_workspace ON agent_sessions(workspace_id);
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_agent_messages_session ON agent_messages(session_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_agent_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Users can only access their workspace's agent data
CREATE POLICY agent_sessions_workspace_policy ON agent_sessions
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY agent_messages_session_policy ON agent_messages
    FOR ALL USING (session_id IN (
        SELECT id FROM agent_sessions WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ));

CREATE POLICY agent_tasks_workspace_policy ON agent_tasks
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY agent_memory_workspace_policy ON agent_memory
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));
```

## Frontend Integration

### Agent Context Store (Zustand)

```typescript
interface AgentStore {
  // Session state
  activeSession: AgentSession | null;
  messages: AgentMessage[];
  isStreaming: boolean;

  // Task queue
  pendingTasks: AgentTask[];
  runningTasks: AgentTask[];

  // Agent states
  agentStates: Record<AgentType, AgentState>;

  // Actions
  startSession: (type: SessionType) => Promise<AgentSession>;
  sendMessage: (content: string) => Promise<void>;
  executeTask: (task: AgentTaskRequest) => Promise<string>;
  cancelTask: (taskId: string) => Promise<void>;
  provideFeedback: (messageId: string, feedback: Feedback) => Promise<void>;
}
```

### React Hooks

```typescript
// Real-time chat with agents
function useAgentChat(sessionId?: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    // Stream response using Server-Sent Events
  };

  return { messages, isStreaming, sendMessage };
}

// Async task execution
function useAgentTask() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AgentResult | null>(null);

  const executeTask = async (request: AgentTaskRequest) => {
    // Submit task and poll for results
  };

  return { taskId, status, progress, result, executeTask };
}

// Multi-agent orchestration
function useAgentOrchestrator() {
  const orchestrate = async (workflow: WorkflowDefinition) => {
    // Execute multi-agent workflow
  };

  return { orchestrate };
}
```

## Example Workflows

### 1. Smart Task Creation from Email

```typescript
const workflow = {
  name: "Email to Tasks",
  steps: [
    {
      agent: "task",
      action: "extract_tasks",
      input: { text: emailContent },
    },
    {
      agent: "calendar",
      action: "check_availability",
      input: { tasks: "{{prev.tasks}}" },
    },
    {
      agent: "task",
      action: "schedule_tasks",
      input: {
        tasks: "{{steps[0].tasks}}",
        availability: "{{prev.availability}}"
      },
    },
  ],
};
```

### 2. Grant Application Workflow

```typescript
const workflow = {
  name: "Grant Application Assistant",
  steps: [
    {
      agent: "grant",
      action: "analyze_opportunity",
      input: { opportunityId },
    },
    {
      agent: "research",
      action: "find_preliminary_data",
      input: { keywords: "{{prev.researchAreas}}" },
    },
    {
      agent: "writing",
      action: "draft_specific_aims",
      input: {
        opportunity: "{{steps[0].analysis}}",
        literature: "{{prev.papers}}",
      },
    },
    {
      agent: "project",
      action: "create_timeline",
      input: { deadline: "{{steps[0].deadline}}" },
    },
  ],
};
```

### 3. Weekly Research Update

```typescript
const workflow = {
  name: "Weekly Lab Update",
  parallel: true,
  steps: [
    { agent: "project", action: "summarize_progress" },
    { agent: "task", action: "review_completed" },
    { agent: "personnel", action: "check_milestones" },
    { agent: "calendar", action: "upcoming_deadlines" },
  ],
  aggregate: {
    agent: "writing",
    action: "compose_update",
    input: { sections: "{{all}}" },
  },
};
```

## Security Considerations

1. **Rate Limiting**: Per-user and per-workspace limits on agent requests
2. **Input Validation**: Strict Zod schemas for all agent inputs
3. **Output Sanitization**: Filter sensitive data from agent responses
4. **Audit Logging**: Log all agent actions for compliance
5. **Human-in-the-Loop**: Require approval for destructive actions
6. **Context Isolation**: Agents only access data within their workspace

## Monitoring & Observability

```typescript
interface AgentMetrics {
  // Performance
  responseTime: number;
  tokensUsed: number;
  toolCallCount: number;

  // Quality
  userSatisfaction: number;  // From feedback
  taskCompletionRate: number;
  errorRate: number;

  // Usage
  requestsPerHour: number;
  uniqueUsers: number;
  popularActions: Record<string, number>;
}
```

## Future Enhancements

1. **Agent Fine-Tuning**: Custom models trained on academic workflows
2. **Multi-Modal Support**: Process images, PDFs, and documents
3. **Proactive Agents**: Suggest actions based on patterns
4. **Collaborative Agents**: Multiple users interacting with same agent
5. **External Integrations**: Connect with academic databases (PubMed, arXiv)
6. **Voice Interface**: Natural language commands via speech

## Getting Started

See the implementation files:
- Backend: `services/ai/app/agents/`
- Frontend: `apps/web/lib/hooks/use-agents.ts`
- API Routes: `apps/web/app/api/agents/`
- Types: `packages/shared/src/types/agents.ts`
