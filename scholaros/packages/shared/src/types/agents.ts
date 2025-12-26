/**
 * Multi-Agent Framework Type Definitions
 * Core types for the ScholarOS multi-agent AI system
 */

// ============================================================================
// Agent Types & Identifiers
// ============================================================================

export type AgentType =
  | "task"        // Task management and prioritization
  | "project"     // Project coordination and tracking
  | "grant"       // Grant discovery and writing
  | "research"    // Research support and literature
  | "calendar"    // Schedule and meeting management
  | "writing"     // Academic writing assistance
  | "personnel"   // Team and mentoring management
  | "planner"     // Strategic planning and goals
  | "orchestrator"; // Meta-agent for coordination

export type AgentStatus =
  | "idle"
  | "planning"
  | "executing"
  | "awaiting_feedback"
  | "completed"
  | "failed";

export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "tool";

export type SessionType =
  | "chat"        // Interactive conversation
  | "task"        // Single async task
  | "workflow";   // Multi-agent workflow

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: AgentCapability[];
  tools: string[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// ============================================================================
// Agent Messages & Conversations
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  agentType?: AgentType;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AgentMessageFromAPI extends Omit<AgentMessage, "createdAt"> {
  createdAt: string;
}

// ============================================================================
// Agent Sessions
// ============================================================================

export interface AgentSession {
  id: string;
  workspaceId: string;
  userId: string;
  sessionType: SessionType;
  status: AgentStatus;
  context: SessionContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSessionFromAPI extends Omit<AgentSession, "createdAt" | "updatedAt" | "context"> {
  context: SessionContext;
  createdAt: string;
  updatedAt: string;
}

export interface SessionContext {
  // Current working context
  activeAgent?: AgentType;
  activeTaskId?: string;
  activeProjectId?: string;

  // Conversation state
  messageCount: number;
  lastActivityAt: string;

  // User preferences for this session
  preferences?: Record<string, unknown>;

  // Accumulated knowledge during session
  workingMemory?: WorkingMemory;
}

export interface WorkingMemory {
  // Extracted entities
  mentionedTasks?: string[];
  mentionedProjects?: string[];
  mentionedPeople?: string[];
  mentionedDates?: string[];

  // Inferred context
  currentGoal?: string;
  userIntent?: string;
  relevantDocuments?: string[];

  // Intermediate results
  intermediateResults?: Record<string, unknown>;
}

// ============================================================================
// Agent Tasks (Async Execution)
// ============================================================================

export interface AgentTask {
  id: string;
  sessionId?: string;
  workspaceId: string;
  userId: string;
  agentType: AgentType;
  taskType: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface AgentTaskFromAPI extends Omit<AgentTask, "startedAt" | "completedAt" | "createdAt"> {
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentTaskRequest {
  agentType: AgentType;
  taskType: string;
  input: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
  callbackUrl?: string;
}

export interface AgentTaskResult {
  taskId: string;
  status: TaskStatus;
  progress: number;
  output?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Agent Memory (Long-term Learning)
// ============================================================================

export type MemoryType =
  | "preference"   // User preferences and settings
  | "pattern"      // Learned behavior patterns
  | "feedback"     // User feedback on outputs
  | "insight"      // Discovered insights
  | "entity"       // Named entity information
  | "relationship"; // Entity relationships

export interface AgentMemory {
  id: string;
  workspaceId: string;
  userId?: string;
  memoryType: MemoryType;
  agentType?: AgentType;
  key: string;
  value: Record<string, unknown>;
  embedding?: number[];
  relevanceScore: number;
  accessCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface AgentMemoryFromAPI extends Omit<AgentMemory, "lastAccessedAt" | "expiresAt" | "createdAt"> {
  lastAccessedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// ============================================================================
// Inter-Agent Communication
// ============================================================================

export type InterAgentMessageType =
  | "request"     // Request help from another agent
  | "response"    // Response to a request
  | "broadcast"   // Broadcast to all agents
  | "handoff"     // Transfer control to another agent
  | "status";     // Status update

export interface InterAgentMessage {
  id: string;
  sender: AgentType;
  recipient: AgentType | "orchestrator" | "all";
  messageType: InterAgentMessageType;
  content: Record<string, unknown>;
  context: InterAgentContext;
  priority: number;
  timestamp: Date;
}

export interface InterAgentContext {
  sessionId: string;
  taskId?: string;
  workflowId?: string;
  parentMessageId?: string;
  conversationHistory?: AgentMessage[];
}

export interface AgentHandoff {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  context: Record<string, unknown>;
  preserveHistory: boolean;
}

// ============================================================================
// Workflow Orchestration
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  errorHandling?: ErrorHandlingStrategy;
  timeout?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent: AgentType;
  action: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
  condition?: WorkflowCondition;
  timeout?: number;
  retries?: number;
  onError?: "fail" | "skip" | "fallback";
  fallbackAgent?: AgentType;
}

export interface WorkflowCondition {
  type: "always" | "if" | "unless";
  expression?: string;
  value?: unknown;
}

export type ErrorHandlingStrategy =
  | "fail_fast"     // Stop on first error
  | "continue"      // Continue despite errors
  | "retry"         // Retry failed steps
  | "fallback";     // Use fallback agents

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  sessionId: string;
  status: TaskStatus;
  currentStep?: string;
  stepResults: Record<string, WorkflowStepResult>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowStepResult {
  stepId: string;
  status: TaskStatus;
  output?: Record<string, unknown>;
  error?: string;
  executionTime: number;
  agentType: AgentType;
}

// ============================================================================
// Agent Tools
// ============================================================================

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolRegistry {
  tools: Map<string, AgentTool>;
  register(tool: AgentTool): void;
  get(name: string): AgentTool | undefined;
  list(agentType?: AgentType): AgentTool[];
}

// ============================================================================
// Agent Feedback & Learning
// ============================================================================

export type FeedbackType =
  | "thumbs_up"
  | "thumbs_down"
  | "correction"
  | "suggestion"
  | "rating";

export interface AgentFeedback {
  id: string;
  sessionId: string;
  messageId: string;
  userId: string;
  feedbackType: FeedbackType;
  rating?: number;
  comment?: string;
  correction?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AgentFeedbackFromAPI extends Omit<AgentFeedback, "createdAt"> {
  createdAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ChatRequest {
  sessionId?: string;
  message: string;
  context?: Record<string, unknown>;
  agentType?: AgentType;
  stream?: boolean;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  content: string;
  agentType: AgentType;
  toolCalls?: ToolCall[];
  suggestedActions?: SuggestedAction[];
  metadata?: Record<string, unknown>;
}

export interface SuggestedAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ExecuteTaskRequest {
  agentType: AgentType;
  taskType: string;
  input: Record<string, unknown>;
  async?: boolean;
}

export interface ExecuteTaskResponse {
  taskId: string;
  status: TaskStatus;
  result?: Record<string, unknown>;
  error?: string;
}

export interface OrchestrateRequest {
  workflow: WorkflowDefinition;
  input?: Record<string, unknown>;
}

export interface OrchestrateResponse {
  executionId: string;
  status: TaskStatus;
  results?: Record<string, WorkflowStepResult>;
  error?: string;
}

// ============================================================================
// Agent Metrics & Monitoring
// ============================================================================

export interface AgentMetrics {
  agentType: AgentType;

  // Performance metrics
  totalRequests: number;
  averageResponseTime: number;
  tokensUsed: number;
  toolCallCount: number;

  // Quality metrics
  successRate: number;
  errorRate: number;
  userSatisfactionScore?: number;

  // Usage patterns
  popularActions: Record<string, number>;
  peakHours: number[];

  // Time period
  periodStart: Date;
  periodEnd: Date;
}

export interface AgentHealth {
  agentType: AgentType;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: Date;
  latency: number;
  errorCount: number;
  uptime: number;
}

// ============================================================================
// Predefined Workflows
// ============================================================================

export const PREDEFINED_WORKFLOWS = {
  EMAIL_TO_TASKS: "email-to-tasks",
  GRANT_APPLICATION: "grant-application",
  WEEKLY_UPDATE: "weekly-update",
  LITERATURE_REVIEW: "literature-review",
  PROJECT_KICKOFF: "project-kickoff",
  DEADLINE_PREP: "deadline-prep",
} as const;

export type PredefinedWorkflow = typeof PREDEFINED_WORKFLOWS[keyof typeof PREDEFINED_WORKFLOWS];

// ============================================================================
// Agent Capabilities by Type
// ============================================================================

export const AGENT_CAPABILITIES: Record<AgentType, string[]> = {
  task: [
    "create_task",
    "update_task",
    "delete_task",
    "prioritize_tasks",
    "schedule_tasks",
    "extract_tasks_from_text",
    "batch_update_tasks",
    "suggest_task_breakdown",
  ],
  project: [
    "create_project",
    "update_project",
    "summarize_project",
    "track_milestones",
    "assess_project_health",
    "suggest_next_steps",
    "link_tasks_to_project",
  ],
  grant: [
    "search_opportunities",
    "analyze_fit",
    "track_deadlines",
    "check_eligibility",
    "draft_specific_aims",
    "draft_budget_justification",
    "suggest_reviewers",
  ],
  research: [
    "search_literature",
    "summarize_paper",
    "find_related_work",
    "generate_citations",
    "identify_gaps",
    "suggest_methodology",
  ],
  calendar: [
    "check_availability",
    "schedule_meeting",
    "find_meeting_time",
    "create_time_blocks",
    "suggest_schedule",
    "sync_deadlines",
  ],
  writing: [
    "draft_section",
    "edit_text",
    "suggest_improvements",
    "check_grammar",
    "format_document",
    "generate_abstract",
    "create_outline",
  ],
  personnel: [
    "track_meetings",
    "suggest_mentoring_topics",
    "assess_workload",
    "generate_progress_report",
    "schedule_check_ins",
  ],
  planner: [
    "create_goal",
    "break_down_goal",
    "track_progress",
    "suggest_priorities",
    "generate_weekly_plan",
    "analyze_patterns",
  ],
  orchestrator: [
    "route_request",
    "coordinate_agents",
    "aggregate_results",
    "resolve_conflicts",
    "manage_workflows",
  ],
};
