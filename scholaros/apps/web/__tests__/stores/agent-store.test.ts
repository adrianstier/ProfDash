import { describe, it, expect, beforeEach } from "vitest";
import { useAgentStore } from "@/lib/stores/agent-store";
import type { AgentMessage, AgentSession, AgentTask, SuggestedAction } from "@scholaros/shared";

const initialState = {
  currentSession: null,
  messages: [],
  isStreaming: false,
  pendingTasks: [],
  runningTasks: [],
  completedTasks: [],
  isOpen: false,
  selectedAgent: null,
  suggestedActions: [],
  context: {},
  initialMessage: null,
  preferences: {
    defaultAgent: null,
    streamResponses: true,
    showAgentIndicator: true,
  },
};

function createMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-1",
    sessionId: "session-1",
    role: "user",
    content: "Hello",
    createdAt: new Date(),
    ...overrides,
  };
}

function createAgentTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return {
    id: "task-1",
    workspaceId: "ws-1",
    userId: "user-1",
    agentType: "task",
    taskType: "extract",
    status: "pending",
    input: {},
    progress: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("useAgentStore", () => {
  beforeEach(() => {
    useAgentStore.setState(initialState);
  });

  describe("initial state", () => {
    it("should have null session", () => {
      expect(useAgentStore.getState().currentSession).toBeNull();
    });

    it("should have empty messages", () => {
      expect(useAgentStore.getState().messages).toEqual([]);
    });

    it("should not be streaming", () => {
      expect(useAgentStore.getState().isStreaming).toBe(false);
    });

    it("should have empty task queues", () => {
      expect(useAgentStore.getState().pendingTasks).toEqual([]);
      expect(useAgentStore.getState().runningTasks).toEqual([]);
      expect(useAgentStore.getState().completedTasks).toEqual([]);
    });

    it("should be closed", () => {
      expect(useAgentStore.getState().isOpen).toBe(false);
    });

    it("should have default preferences", () => {
      const prefs = useAgentStore.getState().preferences;
      expect(prefs.defaultAgent).toBeNull();
      expect(prefs.streamResponses).toBe(true);
      expect(prefs.showAgentIndicator).toBe(true);
    });
  });

  describe("session management", () => {
    it("should set a session", () => {
      const session: AgentSession = {
        id: "s1",
        workspaceId: "ws-1",
        userId: "u1",
        sessionType: "chat",
        status: "idle",
        context: { messageCount: 0, lastActivityAt: new Date().toISOString() },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      useAgentStore.getState().setSession(session);
      expect(useAgentStore.getState().currentSession).toEqual(session);
    });

    it("should clear session and related state", () => {
      useAgentStore.getState().addMessage(createMessage());
      useAgentStore.getState().setSuggestedActions([{ id: "a1", label: "Test", type: "quick_reply" } as SuggestedAction]);
      useAgentStore.getState().setSession({
        id: "s1",
        workspaceId: "ws-1",
        userId: "u1",
        sessionType: "chat",
        status: "idle",
        context: { messageCount: 0, lastActivityAt: "" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      useAgentStore.getState().clearSession();
      expect(useAgentStore.getState().currentSession).toBeNull();
      expect(useAgentStore.getState().messages).toEqual([]);
      expect(useAgentStore.getState().suggestedActions).toEqual([]);
    });
  });

  describe("messages", () => {
    it("should add a message", () => {
      const msg = createMessage({ id: "m1", content: "Hello" });
      useAgentStore.getState().addMessage(msg);
      expect(useAgentStore.getState().messages).toHaveLength(1);
      expect(useAgentStore.getState().messages[0].content).toBe("Hello");
    });

    it("should accumulate messages", () => {
      useAgentStore.getState().addMessage(createMessage({ id: "m1" }));
      useAgentStore.getState().addMessage(createMessage({ id: "m2" }));
      useAgentStore.getState().addMessage(createMessage({ id: "m3" }));
      expect(useAgentStore.getState().messages).toHaveLength(3);
    });

    it("should update a message by id", () => {
      useAgentStore.getState().addMessage(createMessage({ id: "m1", content: "Old" }));
      useAgentStore.getState().updateMessage("m1", { content: "New" });
      expect(useAgentStore.getState().messages[0].content).toBe("New");
    });

    it("should not affect other messages on update", () => {
      useAgentStore.getState().addMessage(createMessage({ id: "m1", content: "First" }));
      useAgentStore.getState().addMessage(createMessage({ id: "m2", content: "Second" }));
      useAgentStore.getState().updateMessage("m1", { content: "Updated" });
      expect(useAgentStore.getState().messages[1].content).toBe("Second");
    });

    it("should set messages (replace all)", () => {
      useAgentStore.getState().addMessage(createMessage({ id: "m1" }));
      const newMessages = [createMessage({ id: "m2" }), createMessage({ id: "m3" })];
      useAgentStore.getState().setMessages(newMessages);
      expect(useAgentStore.getState().messages).toHaveLength(2);
      expect(useAgentStore.getState().messages[0].id).toBe("m2");
    });

    it("should clear messages and suggested actions", () => {
      useAgentStore.getState().addMessage(createMessage());
      useAgentStore.getState().setSuggestedActions([{ id: "a1", label: "X", type: "quick_reply" } as SuggestedAction]);
      useAgentStore.getState().clearMessages();
      expect(useAgentStore.getState().messages).toEqual([]);
      expect(useAgentStore.getState().suggestedActions).toEqual([]);
    });
  });

  describe("streaming", () => {
    it("should set streaming state", () => {
      useAgentStore.getState().setStreaming(true);
      expect(useAgentStore.getState().isStreaming).toBe(true);
      useAgentStore.getState().setStreaming(false);
      expect(useAgentStore.getState().isStreaming).toBe(false);
    });
  });

  describe("task lifecycle", () => {
    it("should add a pending task", () => {
      const task = createAgentTask({ id: "t1" });
      useAgentStore.getState().addPendingTask(task);
      expect(useAgentStore.getState().pendingTasks).toHaveLength(1);
      expect(useAgentStore.getState().pendingTasks[0].id).toBe("t1");
    });

    it("should move task from pending to running", () => {
      const task = createAgentTask({ id: "t1" });
      useAgentStore.getState().addPendingTask(task);
      useAgentStore.getState().moveToRunning("t1");

      expect(useAgentStore.getState().pendingTasks).toHaveLength(0);
      expect(useAgentStore.getState().runningTasks).toHaveLength(1);
      expect(useAgentStore.getState().runningTasks[0].status).toBe("running");
    });

    it("should not move non-existent task to running", () => {
      useAgentStore.getState().moveToRunning("nonexistent");
      expect(useAgentStore.getState().runningTasks).toHaveLength(0);
    });

    it("should complete a running task", () => {
      const task = createAgentTask({ id: "t1" });
      useAgentStore.getState().addPendingTask(task);
      useAgentStore.getState().moveToRunning("t1");
      useAgentStore.getState().completeTask("t1", { result: "success" });

      expect(useAgentStore.getState().runningTasks).toHaveLength(0);
      expect(useAgentStore.getState().completedTasks).toHaveLength(1);
      expect(useAgentStore.getState().completedTasks[0].status).toBe("completed");
      expect(useAgentStore.getState().completedTasks[0].output).toEqual({ result: "success" });
    });

    it("should not complete a non-running task", () => {
      useAgentStore.getState().completeTask("nonexistent");
      expect(useAgentStore.getState().completedTasks).toHaveLength(0);
    });

    it("should fail a running task", () => {
      const task = createAgentTask({ id: "t1" });
      useAgentStore.getState().addPendingTask(task);
      useAgentStore.getState().moveToRunning("t1");
      useAgentStore.getState().failTask("t1", "Network error");

      expect(useAgentStore.getState().runningTasks).toHaveLength(0);
      expect(useAgentStore.getState().completedTasks).toHaveLength(1);
      expect(useAgentStore.getState().completedTasks[0].status).toBe("failed");
      expect(useAgentStore.getState().completedTasks[0].error).toBe("Network error");
    });

    it("should not fail a non-running task", () => {
      useAgentStore.getState().failTask("nonexistent", "Error");
      expect(useAgentStore.getState().completedTasks).toHaveLength(0);
    });

    it("should clear all tasks", () => {
      useAgentStore.getState().addPendingTask(createAgentTask({ id: "t1" }));
      useAgentStore.getState().addPendingTask(createAgentTask({ id: "t2" }));
      useAgentStore.getState().moveToRunning("t1");
      useAgentStore.getState().completeTask("t1");
      useAgentStore.getState().clearTasks();

      expect(useAgentStore.getState().pendingTasks).toEqual([]);
      expect(useAgentStore.getState().runningTasks).toEqual([]);
      expect(useAgentStore.getState().completedTasks).toEqual([]);
    });

    it("should handle full lifecycle: pending -> running -> completed", () => {
      const task = createAgentTask({ id: "lifecycle-task" });
      useAgentStore.getState().addPendingTask(task);
      expect(useAgentStore.getState().pendingTasks).toHaveLength(1);

      useAgentStore.getState().moveToRunning("lifecycle-task");
      expect(useAgentStore.getState().pendingTasks).toHaveLength(0);
      expect(useAgentStore.getState().runningTasks).toHaveLength(1);

      useAgentStore.getState().completeTask("lifecycle-task", { data: "done" });
      expect(useAgentStore.getState().runningTasks).toHaveLength(0);
      expect(useAgentStore.getState().completedTasks).toHaveLength(1);
      expect(useAgentStore.getState().completedTasks[0].completedAt).toBeDefined();
    });

    it("should handle full lifecycle: pending -> running -> failed", () => {
      const task = createAgentTask({ id: "fail-task" });
      useAgentStore.getState().addPendingTask(task);
      useAgentStore.getState().moveToRunning("fail-task");
      useAgentStore.getState().failTask("fail-task", "Something broke");

      expect(useAgentStore.getState().completedTasks).toHaveLength(1);
      expect(useAgentStore.getState().completedTasks[0].status).toBe("failed");
      expect(useAgentStore.getState().completedTasks[0].completedAt).toBeDefined();
    });
  });

  describe("UI state", () => {
    it("should open chat", () => {
      useAgentStore.getState().openChat();
      expect(useAgentStore.getState().isOpen).toBe(true);
    });

    it("should open chat with initial message", () => {
      useAgentStore.getState().openChat("Help me with grants");
      expect(useAgentStore.getState().isOpen).toBe(true);
      expect(useAgentStore.getState().initialMessage).toBe("Help me with grants");
    });

    it("should close chat", () => {
      useAgentStore.getState().openChat();
      useAgentStore.getState().closeChat();
      expect(useAgentStore.getState().isOpen).toBe(false);
    });

    it("should toggle chat", () => {
      useAgentStore.getState().toggleChat();
      expect(useAgentStore.getState().isOpen).toBe(true);
      useAgentStore.getState().toggleChat();
      expect(useAgentStore.getState().isOpen).toBe(false);
    });

    it("should select agent", () => {
      useAgentStore.getState().selectAgent("grant");
      expect(useAgentStore.getState().selectedAgent).toBe("grant");
    });

    it("should clear agent selection", () => {
      useAgentStore.getState().selectAgent("task");
      useAgentStore.getState().selectAgent(null);
      expect(useAgentStore.getState().selectedAgent).toBeNull();
    });

    it("should set suggested actions", () => {
      const actions = [
        { id: "a1", label: "Create task", type: "quick_reply" },
        { id: "a2", label: "Search grants", type: "quick_reply" },
      ] as SuggestedAction[];
      useAgentStore.getState().setSuggestedActions(actions);
      expect(useAgentStore.getState().suggestedActions).toHaveLength(2);
    });
  });

  describe("context", () => {
    it("should set context", () => {
      useAgentStore.getState().setContext({ projectId: "p1", projectTitle: "My Project" });
      expect(useAgentStore.getState().context.projectId).toBe("p1");
      expect(useAgentStore.getState().context.projectTitle).toBe("My Project");
    });

    it("should merge context on subsequent sets", () => {
      useAgentStore.getState().setContext({ projectId: "p1" });
      useAgentStore.getState().setContext({ taskId: "t1" });
      expect(useAgentStore.getState().context.projectId).toBe("p1");
      expect(useAgentStore.getState().context.taskId).toBe("t1");
    });

    it("should clear context", () => {
      useAgentStore.getState().setContext({ projectId: "p1" });
      useAgentStore.getState().clearContext();
      expect(useAgentStore.getState().context).toEqual({});
    });

    it("should get initial message", () => {
      useAgentStore.getState().openChat("Test message");
      expect(useAgentStore.getState().getInitialMessage()).toBe("Test message");
    });

    it("should clear initial message", () => {
      useAgentStore.getState().openChat("Test");
      useAgentStore.getState().clearInitialMessage();
      expect(useAgentStore.getState().initialMessage).toBeNull();
    });
  });

  describe("preferences", () => {
    it("should update preferences partially", () => {
      useAgentStore.getState().updatePreferences({ defaultAgent: "project" });
      const prefs = useAgentStore.getState().preferences;
      expect(prefs.defaultAgent).toBe("project");
      expect(prefs.streamResponses).toBe(true); // unchanged
    });

    it("should update multiple preferences", () => {
      useAgentStore.getState().updatePreferences({
        streamResponses: false,
        showAgentIndicator: false,
      });
      const prefs = useAgentStore.getState().preferences;
      expect(prefs.streamResponses).toBe(false);
      expect(prefs.showAgentIndicator).toBe(false);
    });
  });
});
