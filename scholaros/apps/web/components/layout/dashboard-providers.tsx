"use client";

import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { AgentChat } from "@/components/ai/agent-chat";
import { AgentKeyboardShortcut } from "@/components/ai/agent-keyboard-shortcut";
import { ChatPanel } from "@/components/chat/ChatPanel";

// Learning system components
import {
  FeatureDiscoveryProvider,
  FeatureSpotlight,
} from "@/components/learning/feature-spotlight";
import { OnboardingProvider, MilestoneModal } from "@/components/learning/progressive-onboarding";
import { UndoProvider } from "@/components/learning/undo-toast";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <OnboardingProvider>
      <FeatureDiscoveryProvider>
        <UndoProvider>
          {children}
          <TaskDetailDrawer />
          {/* AI Agent Chat - floating interface */}
          <AgentChat />
          {/* Keyboard shortcut handler for agent chat */}
          <AgentKeyboardShortcut />
          {/* Team Chat Panel - floating interface */}
          <ChatPanel />
          {/* Learning System - Feature spotlights and onboarding */}
          <FeatureSpotlight />
          <MilestoneModal />
        </UndoProvider>
      </FeatureDiscoveryProvider>
    </OnboardingProvider>
  );
}
