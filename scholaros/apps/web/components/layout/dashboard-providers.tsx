"use client";

import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { AgentChat } from "@/components/ai/agent-chat";
import { AgentKeyboardShortcut } from "@/components/ai/agent-keyboard-shortcut";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { PresenceManager } from "@/components/presence/user-presence-indicator";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

// Learning system components
import {
  FeatureDiscoveryProvider,
  FeatureSpotlight,
} from "@/components/learning/feature-spotlight";
import { OnboardingProvider, MilestoneModal } from "@/components/learning/progressive-onboarding";
import { UndoProvider } from "@/components/learning/undo-toast";

// Phase 9B components
import { CommandPaletteProvider } from "@/components/search";
import { AnalyticsProvider } from "@/components/analytics";
import { WelcomeModal } from "@/components/dashboard";

// Progressive Onboarding Wizard
import { OnboardingWizardWrapper } from "@/components/onboarding/onboarding-wizard-wrapper";

// Real-time collaboration
import { RealtimePresenceProvider } from "@/components/collaboration";

// Keyboard shortcuts wrapper
function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });
  return <>{children}</>;
}

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <AnalyticsProvider>
      <OnboardingProvider>
        <FeatureDiscoveryProvider>
          <UndoProvider>
            <CommandPaletteProvider>
              <RealtimePresenceProvider>
                <KeyboardShortcutsWrapper>
                  {children}
                  <TaskDetailDrawer />
                  {/* AI Agent Chat - floating interface */}
                  <AgentChat />
                  {/* Keyboard shortcut handler for agent chat */}
                  <AgentKeyboardShortcut />
                  {/* Team Chat Panel - floating interface */}
                  <ChatPanel />
                  {/* Keyboard Shortcuts Modal */}
                  <KeyboardShortcutsModal />
                  {/* User Presence Manager - also handles API presence updates */}
                  <PresenceManager />
                  {/* Learning System - Feature spotlights and onboarding */}
                  <FeatureSpotlight />
                  <MilestoneModal />
                  {/* Welcome Modal - daily dashboard summary */}
                  <WelcomeModal />
                  {/* Progressive Onboarding Wizard for new users */}
                  <OnboardingWizardWrapper />
                </KeyboardShortcutsWrapper>
              </RealtimePresenceProvider>
            </CommandPaletteProvider>
          </UndoProvider>
        </FeatureDiscoveryProvider>
      </OnboardingProvider>
    </AnalyticsProvider>
  );
}
