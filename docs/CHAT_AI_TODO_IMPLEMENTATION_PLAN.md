# Chat + AI-Powered Todo Implementation Plan for ScholarOS

## Executive Summary

This document outlines the implementation plan for integrating chat functionality and AI-powered todo features into ScholarOS, borrowing patterns and code from the `shared-todo-list` repository.

## Current State Analysis

### ScholarOS (Target)
- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase
- **State Management**: TanStack Query + Zustand
- **AI**: Python FastAPI microservice with multi-agent framework (8 agents + orchestrator)
- **Tasks**: Full task management with categories, priorities, projects, assignees
- **Multi-tenant**: Workspace-based RLS isolation
- **Real-time**: Supabase Realtime configured but not extensively used

### shared-todo-list (Source)
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase
- **State Management**: Local React state + Supabase Realtime
- **AI**: Claude for smart parsing, task enhancement, email generation
- **Chat**: Full-featured team chat + DMs with reactions, threading, presence
- **Real-time**: Heavy use of Supabase Realtime channels

---

## Feature Scope

### Phase 1: Chat Integration (Core)
1. Team chat panel (workspace-scoped)
2. Direct messages between workspace members
3. Real-time message delivery via Supabase Realtime
4. Basic message features (send, edit, delete)
5. Message threading (replies)
6. @mentions with autocomplete
7. Message reactions (tapback-style)
8. Read receipts
9. Typing indicators
10. Browser notifications

### Phase 2: AI-Powered Quick Add
1. Smart task parsing (natural language → structured task)
2. AI task enhancement (cleanup, metadata extraction)
3. Task breakdown (complex tasks → subtasks)
4. Voice input transcription (via Whisper or Web Speech API)

### Phase 3: Task-Chat Integration
1. Link messages to tasks/projects
2. Create tasks from chat messages
3. Task activity feed in chat
4. Project discussion threads

---

## Database Schema Changes

### New Tables

#### 1. `workspace_messages` (Chat Messages)

```sql
-- Migration: 20250108000001_workspace_messages.sql
CREATE TABLE workspace_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Message content
    text TEXT NOT NULL,

    -- Conversation type: NULL = workspace chat, user_id = DM
    recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Task/project linking
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Threading
    reply_to_id UUID REFERENCES workspace_messages(id) ON DELETE SET NULL,
    reply_to_preview TEXT, -- Cached preview of parent message

    -- Reactions (JSONB array: [{user_id, reaction, created_at}])
    reactions JSONB DEFAULT '[]'::jsonb,

    -- Read receipts (array of user_ids)
    read_by UUID[] DEFAULT ARRAY[]::UUID[],

    -- @mentions (array of user_ids)
    mentions UUID[] DEFAULT ARRAY[]::UUID[],

    -- Message state
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ, -- Soft delete

    -- Pinning
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_by UUID REFERENCES auth.users(id),
    pinned_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workspace_messages_workspace ON workspace_messages(workspace_id);
CREATE INDEX idx_workspace_messages_user ON workspace_messages(user_id);
CREATE INDEX idx_workspace_messages_recipient ON workspace_messages(recipient_id);
CREATE INDEX idx_workspace_messages_created ON workspace_messages(created_at DESC);
CREATE INDEX idx_workspace_messages_reply_to ON workspace_messages(reply_to_id);
CREATE INDEX idx_workspace_messages_task ON workspace_messages(related_task_id);
CREATE INDEX idx_workspace_messages_project ON workspace_messages(related_project_id);
CREATE INDEX idx_workspace_messages_read_by ON workspace_messages USING GIN(read_by);
CREATE INDEX idx_workspace_messages_mentions ON workspace_messages USING GIN(mentions);
CREATE INDEX idx_workspace_messages_pinned ON workspace_messages(is_pinned) WHERE is_pinned = TRUE;

-- RLS Policies (workspace-based)
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their workspaces"
    ON workspace_messages FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages in their workspaces"
    ON workspace_messages FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own messages"
    ON workspace_messages FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
    ON workspace_messages FOR DELETE
    USING (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_messages;

-- Update trigger
CREATE TRIGGER update_workspace_messages_updated_at
    BEFORE UPDATE ON workspace_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2. `workspace_activity` (Activity Feed)

```sql
-- Migration: 20250108000002_workspace_activity.sql
CREATE TYPE activity_action AS ENUM (
    -- Task actions
    'task_created',
    'task_updated',
    'task_deleted',
    'task_completed',
    'task_reopened',
    'task_assigned',
    'task_priority_changed',
    'task_due_date_changed',

    -- Project actions
    'project_created',
    'project_updated',
    'project_stage_changed',
    'project_milestone_completed',

    -- Chat actions
    'message_sent',
    'message_pinned',

    -- AI actions
    'ai_tasks_extracted',
    'ai_task_enhanced'
);

CREATE TABLE workspace_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    action activity_action NOT NULL,

    -- Related entities (polymorphic)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    message_id UUID REFERENCES workspace_messages(id) ON DELETE SET NULL,

    -- Snapshot of entity at time of action
    entity_title TEXT,

    -- Additional context
    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workspace_activity_workspace ON workspace_activity(workspace_id);
CREATE INDEX idx_workspace_activity_user ON workspace_activity(user_id);
CREATE INDEX idx_workspace_activity_created ON workspace_activity(created_at DESC);
CREATE INDEX idx_workspace_activity_action ON workspace_activity(action);
CREATE INDEX idx_workspace_activity_task ON workspace_activity(task_id);
CREATE INDEX idx_workspace_activity_project ON workspace_activity(project_id);

-- RLS
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their workspaces"
    ON workspace_activity FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert activity in their workspaces"
    ON workspace_activity FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_activity;
```

#### 3. `user_presence` (Typing/Online Status)

```sql
-- Migration: 20250108000003_user_presence.sql
CREATE TYPE presence_status AS ENUM ('online', 'away', 'dnd', 'offline');

CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    status presence_status DEFAULT 'online',
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in_conversation TEXT, -- 'workspace' or recipient user_id

    last_seen TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);

-- RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence in their workspaces"
    ON user_presence FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own presence"
    ON user_presence FOR ALL
    USING (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
```

---

## API Routes

### Chat Routes

```
/api/messages
  GET    - List messages (workspace chat or DM)
  POST   - Send message

/api/messages/[id]
  PATCH  - Edit message
  DELETE - Soft delete message

/api/messages/[id]/reactions
  POST   - Add reaction
  DELETE - Remove reaction

/api/messages/[id]/read
  POST   - Mark as read

/api/messages/[id]/pin
  POST   - Pin message
  DELETE - Unpin message

/api/presence
  GET    - Get workspace presence
  POST   - Update own presence
```

### AI Routes (Enhanced)

```
/api/ai/smart-parse
  POST   - Parse natural language → structured task

/api/ai/enhance-task
  POST   - Clean up task, extract metadata

/api/ai/breakdown-task
  POST   - Generate subtasks from complex task

/api/ai/transcribe
  POST   - Audio → text (+ optional task extraction)
```

### Activity Routes

```
/api/activity
  GET    - List workspace activity feed
  POST   - Log activity (internal use)
```

---

## React Components

### New Components to Create

```
components/
├── chat/
│   ├── ChatPanel.tsx              # Main chat panel (borrowed from shared-todo)
│   ├── ChatMessage.tsx            # Individual message display
│   ├── ChatInput.tsx              # Message input with mentions
│   ├── ChatConversationList.tsx   # Conversation switcher
│   ├── ChatReactions.tsx          # Reaction picker/display
│   ├── ChatTypingIndicator.tsx    # Typing animation
│   ├── ChatMentionAutocomplete.tsx # @mention dropdown
│   └── ChatPresenceIndicator.tsx  # Online/away/DND status
│
├── activity/
│   ├── ActivityFeed.tsx           # Real-time activity stream
│   └── ActivityItem.tsx           # Individual activity entry
│
├── ai/
│   ├── SmartParseModal.tsx        # AI task parsing preview
│   ├── VoiceInputButton.tsx       # Voice recording button
│   └── TaskBreakdownModal.tsx     # Subtask generation preview
│
└── tasks/
    └── quick-add-ai.tsx           # Enhanced quick-add with AI
```

### Component Integration Points

1. **Sidebar**: Add chat toggle button with unread badge
2. **Dashboard**: Add activity feed widget
3. **Task Detail**: Add related messages section
4. **Project Detail**: Add discussion thread
5. **Quick Add**: Add AI parsing toggle

---

## State Management

### New Zustand Stores

#### `chat-store.ts`

```typescript
interface ChatState {
  // Panel state
  isOpen: boolean;
  isMinimized: boolean;

  // Active conversation
  activeConversation: 'workspace' | string; // 'workspace' or user_id

  // Messages (keyed by conversation)
  messages: Record<string, Message[]>;

  // Unread counts
  unreadCounts: Record<string, number>;

  // Presence
  presenceMap: Record<string, PresenceStatus>;
  typingUsers: Record<string, string[]>; // conversation -> user_ids typing

  // UI state
  replyingTo: Message | null;
  editingMessage: Message | null;
  showMentionPicker: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleMinimize: () => void;
  setActiveConversation: (conv: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setReplyingTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  markAsRead: (conversationKey: string) => void;
  updatePresence: (userId: string, status: PresenceStatus) => void;
  setTyping: (conversationKey: string, userIds: string[]) => void;
}
```

### New React Query Hooks

```typescript
// lib/hooks/use-chat.ts
export function useMessages(workspaceId: string, conversation: string);
export function useSendMessage();
export function useEditMessage();
export function useDeleteMessage();
export function useAddReaction();
export function useRemoveReaction();
export function useMarkAsRead();

// lib/hooks/use-presence.ts
export function usePresence(workspaceId: string);
export function useUpdatePresence();

// lib/hooks/use-activity.ts
export function useActivityFeed(workspaceId: string);

// lib/hooks/use-ai-tasks.ts
export function useSmartParse();
export function useEnhanceTask();
export function useBreakdownTask();
export function useTranscribe();
```

---

## Real-time Implementation

### Supabase Realtime Channels

```typescript
// Subscribe to workspace messages
const messagesChannel = supabase
  .channel(`workspace-messages-${workspaceId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'workspace_messages',
      filter: `workspace_id=eq.${workspaceId}`
    },
    handleMessageChange
  )
  .subscribe();

// Subscribe to presence (using Supabase Presence)
const presenceChannel = supabase
  .channel(`presence-${workspaceId}`)
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .on('presence', { event: 'join' }, handlePresenceJoin)
  .on('presence', { event: 'leave' }, handlePresenceLeave)
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: currentUserId,
        status: 'online',
        typing: false
      });
    }
  });

// Subscribe to activity
const activityChannel = supabase
  .channel(`activity-${workspaceId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'workspace_activity',
      filter: `workspace_id=eq.${workspaceId}`
    },
    handleNewActivity
  )
  .subscribe();
```

---

## AI Integration (Adapted from shared-todo)

### Smart Parse API Route

```typescript
// app/api/ai/smart-parse/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { text, workspaceId } = await request.json();

  // Get workspace context (members, projects, categories)
  const context = await getWorkspaceContext(workspaceId);

  const prompt = `You are a smart task parser for an academic research team...

Team members: ${context.members.join(', ')}
Active projects: ${context.projects.map(p => p.title).join(', ')}
Task categories: research, teaching, grants, grad-mentorship, undergrad-mentorship, admin, misc

User's input:
"""
${text}
"""

Extract:
1. Main task (title, description, category, priority, due date)
2. Subtasks if complex input
3. Assignee if mentioned
4. Project link if relevant

Response format: JSON only`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse and validate response
  // Return structured task data
}
```

---

## File Changes Summary

### New Files to Create

```
scholaros/apps/web/
├── app/api/
│   ├── messages/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── reactions/route.ts
│   │       ├── read/route.ts
│   │       └── pin/route.ts
│   ├── presence/route.ts
│   ├── activity/route.ts
│   └── ai/
│       ├── smart-parse/route.ts
│       ├── enhance-task/route.ts
│       ├── breakdown-task/route.ts
│       └── transcribe/route.ts
│
├── components/chat/
│   ├── ChatPanel.tsx
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── ChatConversationList.tsx
│   ├── ChatReactions.tsx
│   ├── ChatTypingIndicator.tsx
│   ├── ChatMentionAutocomplete.tsx
│   └── ChatPresenceIndicator.tsx
│
├── components/activity/
│   ├── ActivityFeed.tsx
│   └── ActivityItem.tsx
│
├── components/ai/
│   ├── SmartParseModal.tsx
│   ├── VoiceInputButton.tsx
│   └── TaskBreakdownModal.tsx
│
└── lib/
    ├── hooks/
    │   ├── use-chat.ts
    │   ├── use-presence.ts
    │   ├── use-activity.ts
    │   └── use-ai-tasks.ts
    └── stores/
        └── chat-store.ts

scholaros/supabase/migrations/
├── 20250108000001_workspace_messages.sql
├── 20250108000002_workspace_activity.sql
└── 20250108000003_user_presence.sql

scholaros/packages/shared/src/
├── types/chat.ts
├── types/activity.ts
└── schemas/chat.ts
```

### Files to Modify

```
scholaros/apps/web/
├── components/layout/sidebar.tsx          # Add chat toggle
├── components/tasks/quick-add.tsx         # Add AI parsing option
├── app/(dashboard)/today/page.tsx         # Add activity widget
├── app/(dashboard)/projects/[id]/page.tsx # Add discussion section
└── lib/stores/index.ts                    # Export chat store
```

---

## Implementation Order

### Week 1: Foundation
1. Database migrations (messages, activity, presence)
2. Shared types and schemas
3. Basic API routes for messages
4. Chat store setup

### Week 2: Chat Core
1. ChatPanel component (adapt from shared-todo)
2. Real-time message subscription
3. Send/receive messages
4. Basic UI integration (sidebar toggle)

### Week 3: Chat Features
1. Message threading (replies)
2. Reactions
3. @mentions with autocomplete
4. Read receipts
5. Typing indicators

### Week 4: AI Features
1. Smart parse API route
2. SmartParseModal component
3. Quick-add AI integration
4. Task enhancement API

### Week 5: Activity & Polish
1. Activity feed table and API
2. ActivityFeed component
3. Task-chat linking
4. Project discussions
5. Notifications

---

## Code to Borrow from shared-todo-list

### Direct Port (with modifications)
1. `ChatPanel.tsx` - Adapt for workspace context, use Zustand
2. `TypingIndicator` component - Use as-is
3. `MentionAutocomplete` - Adapt for workspace members
4. `ReactionsSummary` - Use as-is
5. `/api/ai/smart-parse/route.ts` - Adapt prompt for academic context
6. Message schema patterns - Adapt for workspace-based RLS

### Patterns to Follow
1. Supabase Realtime subscription pattern
2. Optimistic UI updates for messages
3. Browser notification handling
4. Audio notification sound
5. Framer Motion animations for chat

### Key Adaptations Needed
1. **Multi-tenancy**: All queries scoped to workspace_id
2. **Auth**: Use Supabase Auth user_id instead of username
3. **State**: Use Zustand + React Query instead of local state
4. **AI Context**: Include academic context (projects, categories)
5. **RLS**: Proper policies instead of open access

---

## Environment Variables

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# New (if using OpenAI for transcription)
OPENAI_API_KEY=
```

---

## Testing Strategy

1. **Unit Tests**: Zod schemas, utility functions
2. **Integration Tests**: API routes with test database
3. **E2E Tests**: Chat flow, AI parsing flow
4. **Real-time Tests**: Message delivery, presence updates

---

## Success Metrics

1. Messages delivered in <500ms
2. Real-time updates within 100ms
3. AI parsing accuracy >90%
4. Chat panel responsive on mobile
5. No memory leaks from subscriptions

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Real-time performance at scale | Use connection pooling, proper indexing |
| AI parsing errors | Fallback to manual entry, validation |
| Message storage costs | Implement message archival policy |
| Complexity overload | Phase implementation, user testing |

---

## Next Steps

1. Review and approve this plan
2. Create database migrations
3. Implement Phase 1 (Chat Core)
4. User testing and feedback
5. Iterate and add features
