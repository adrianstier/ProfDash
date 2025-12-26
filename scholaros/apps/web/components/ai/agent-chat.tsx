"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { useAgentChat, useAgentFeedback, useAgents } from "@/lib/hooks/use-agents";
import { useAgentStore } from "@/lib/stores/agent-store";
import type { AgentType, AgentMessage } from "@scholaros/shared";
import { cn } from "@/lib/utils";

// =============================================================================
// Agent Colors for styling
// =============================================================================

const AGENT_COLORS: Record<AgentType, string> = {
  task: "text-blue-500",
  project: "text-purple-500",
  grant: "text-green-500",
  research: "text-orange-500",
  calendar: "text-red-500",
  writing: "text-indigo-500",
  personnel: "text-pink-500",
  planner: "text-cyan-500",
  orchestrator: "text-gray-500",
};

// =============================================================================
// Message Component
// =============================================================================

interface MessageProps {
  message: AgentMessage;
  onFeedback: (messageId: string, type: "thumbs_up" | "thumbs_down") => void;
}

function Message({ message, onFeedback }: MessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg",
        isUser
          ? "bg-primary/10 ml-8"
          : isSystem
          ? "bg-destructive/10"
          : "bg-muted mr-8"
      )}
    >
      {!isUser && (
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isSystem ? "bg-destructive/20" : "bg-primary/20"
          )}
        >
          {isSystem ? (
            <X className="w-4 h-4 text-destructive" />
          ) : (
            <Bot
              className={cn(
                "w-4 h-4",
                message.agentType
                  ? AGENT_COLORS[message.agentType]
                  : "text-primary"
              )}
            />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {!isUser && message.agentType && (
          <div className="text-xs text-muted-foreground mb-1 capitalize">
            {message.agentType} Agent
          </div>
        )}

        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Used {message.toolCalls.length} tool(s)
          </div>
        )}

        {/* Feedback buttons for assistant messages */}
        {!isUser && !isSystem && (
          <div className="mt-2 flex gap-1">
            <button
              onClick={() => onFeedback(message.id, "thumbs_up")}
              className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-green-500 transition-colors"
              title="Helpful"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onFeedback(message.id, "thumbs_down")}
              className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-red-500 transition-colors"
              title="Not helpful"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Suggested Actions
// =============================================================================

interface SuggestedActionsProps {
  actions: Array<{ label: string; action: string; params?: Record<string, unknown> }>;
  onAction: (action: string, params?: Record<string, unknown>) => void;
}

function SuggestedActions({ actions, onAction }: SuggestedActionsProps) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 border-t">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onAction(action.action, action.params)}
          className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Agent Selector
// =============================================================================

interface AgentSelectorProps {
  agents: Array<{ type: string; name: string; description: string }>;
  selectedAgent: AgentType | null;
  onSelect: (agent: AgentType | null) => void;
}

function AgentSelector({ agents, selectedAgent, onSelect }: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
      >
        <Bot className="w-4 h-4" />
        <span>{selectedAgent ? `${selectedAgent} Agent` : "Auto (best match)"}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className={cn(
              "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
              !selectedAgent && "bg-muted"
            )}
          >
            <div className="font-medium">Auto (best match)</div>
            <div className="text-xs text-muted-foreground">
              Let the system choose the best agent
            </div>
          </button>

          <div className="border-t my-1" />

          {agents.map((agent) => (
            <button
              key={agent.type}
              onClick={() => {
                onSelect(agent.type as AgentType);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                selectedAgent === agent.type && "bg-muted"
              )}
            >
              <div className="font-medium capitalize">{agent.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {agent.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Chat Component
// =============================================================================

export function AgentChat() {
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedInitialMessage = useRef(false);

  const store = useAgentStore();
  const { data: agents = [] } = useAgents();
  const { messages, isLoading, sendMessage, suggestedActions } = useAgentChat({
    agentType: store.selectedAgent ?? undefined,
  });
  const feedbackMutation = useAgentFeedback();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial message when chat opens
  useEffect(() => {
    if (store.isOpen && store.initialMessage && !hasProcessedInitialMessage.current && !isLoading) {
      hasProcessedInitialMessage.current = true;
      const message = store.initialMessage;
      store.clearInitialMessage();
      sendMessage(message);
    }
    // Reset the flag when chat closes
    if (!store.isOpen) {
      hasProcessedInitialMessage.current = false;
    }
  }, [store.isOpen, store.initialMessage, isLoading, sendMessage, store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleFeedback = async (messageId: string, type: "thumbs_up" | "thumbs_down") => {
    try {
      await feedbackMutation.mutateAsync({
        sessionId: store.currentSession?.id || "default",
        messageId,
        feedbackType: type,
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleSuggestedAction = (action: string, params?: Record<string, unknown>) => {
    // Handle navigation actions
    if (action === "navigate" && params?.route) {
      window.location.href = params.route as string;
      return;
    }

    // For other actions, send as a message
    sendMessage(`Execute action: ${action}`);
  };

  if (!store.isOpen) {
    return (
      <button
        onClick={() => store.openChat()}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
        title="Open AI Assistant"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 bg-background border rounded-xl shadow-2xl z-50 flex flex-col transition-all",
        isMinimized ? "w-80 h-14" : "w-96 h-[600px] max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold">AI Assistant</span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={store.closeChat}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Bot className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">How can I help?</h3>
                <p className="text-sm text-muted-foreground">
                  Ask me about tasks, projects, grants, or anything related to
                  your academic work.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onFeedback={handleFeedback}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          <SuggestedActions
            actions={suggestedActions}
            onAction={handleSuggestedAction}
          />

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AgentSelector
                agents={agents}
                selectedAgent={store.selectedAgent}
                onSelect={store.selectAgent}
              />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm bg-muted border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentChat;
