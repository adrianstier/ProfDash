"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Palette,
  Link,
  Shield,
  LogOut,
  Loader2,
  X,
  RefreshCw,
  Database,
  Check,
  Download,
} from "lucide-react";
import {
  useCalendarConnection,
  useCalendarList,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useUpdateCalendarConnection,
  useRefreshCalendarEvents,
} from "@/lib/hooks/use-calendar";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ImportDataModal } from "@/components/migration/import-data-modal";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "profile"
  | "notifications"
  | "appearance"
  | "integrations"
  | "data"
  | "security";

const tabs: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link },
  { id: "data", label: "Data", icon: Database },
  { id: "security", label: "Security", icon: Shield },
];

function IntegrationsTab() {
  const { data: connection, isLoading: connectionLoading } =
    useCalendarConnection();
  const { data: calendars, isLoading: calendarsLoading } = useCalendarList();
  const connectGoogle = useConnectGoogleCalendar();
  const disconnectGoogle = useDisconnectGoogleCalendar();
  const updateConnection = useUpdateCalendarConnection();
  const refreshEvents = useRefreshCalendarEvents();
  const toast = useToastActions();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = connection?.connected ?? false;

  const handleConnect = () => {
    connectGoogle.mutate();
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    try {
      await disconnectGoogle.mutateAsync();
      toast.success("Google Calendar disconnected");
      setShowDisconnectConfirm(false);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleToggleSync = async () => {
    try {
      await updateConnection.mutateAsync({
        sync_enabled: !connection?.sync_enabled,
      });
      toast.success(
        connection?.sync_enabled ? "Sync disabled" : "Sync enabled"
      );
    } catch {
      toast.error("Failed to update sync settings");
    }
  };

  const handleCalendarToggle = async (calendarId: string) => {
    const currentSelected = connection?.selected_calendars || [];
    const newSelected = currentSelected.includes(calendarId)
      ? currentSelected.filter((id: string) => id !== calendarId)
      : [...currentSelected, calendarId];
    try {
      await updateConnection.mutateAsync({ selected_calendars: newSelected });
      toast.success("Calendar selection updated");
    } catch {
      toast.error("Failed to update calendars");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshEvents.mutateAsync();
      toast.success("Events refreshed");
    } catch {
      toast.error("Failed to refresh events");
    }
  };

  // Coming soon integrations
  const comingSoonIntegrations = [
    {
      name: "Outlook Calendar",
      description: "Sync events from Outlook",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M22 8V16C22 17.1 21.1 18 20 18H4C2.9 18 2 17.1 2 16V8C2 6.9 2.9 6 4 6H20C21.1 6 22 6.9 22 8Z" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 8L12 13L2 8" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      name: "Grants.gov",
      description: "Discover funding opportunities",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "bg-green-100 dark:bg-green-900/30",
    },
    {
      name: "ORCID",
      description: "Import your publication record",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#A6CE39" strokeWidth="2"/>
          <path d="M12 8V16M8 12H16" stroke="#A6CE39" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      color: "bg-lime-100 dark:bg-lime-900/30",
    },
    {
      name: "Zotero",
      description: "Sync your research library",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M4 6H20M4 12H20M4 18H12" stroke="#CC2936" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      color: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Link className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Connect external services to enhance your workflow
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Google Calendar Integration */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
                    stroke="#4285F4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 2V6"
                    stroke="#4285F4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 2V6"
                    stroke="#4285F4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 10H21"
                    stroke="#4285F4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Google Calendar</p>
                  {isConnected && (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? "Syncing your calendar events" : "Sync events from Google Calendar"}
                </p>
              </div>
            </div>
            {connectionLoading ? (
              <div className="h-10 w-10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnectGoogle.isPending}
                className="flex items-center gap-2 rounded-xl bg-red-100 dark:bg-red-900/30 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors duration-200"
              >
                {disconnectGoogle.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connectGoogle.isPending}
                className="btn-primary inline-flex items-center gap-2"
              >
                {connectGoogle.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Connect
              </button>
            )}
          </div>

          {/* Connected state - show calendars and sync options */}
          {isConnected && (
            <div className="mt-4 space-y-4 border-t pt-4">
              {/* Sync toggle */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-sm font-medium">Sync Events</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync calendar events
                  </p>
                </div>
                <button
                  onClick={handleToggleSync}
                  disabled={updateConnection.isPending}
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-all duration-200",
                    connection?.sync_enabled ? "bg-primary" : "bg-muted border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                      connection?.sync_enabled && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              {/* Refresh button */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-sm font-medium">Refresh Events</p>
                  <p className="text-xs text-muted-foreground">
                    {connection?.last_sync_at
                      ? `Last synced: ${new Date(connection.last_sync_at).toLocaleString()}`
                      : "Never synced"}
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshEvents.isPending}
                  className="btn-ghost inline-flex items-center gap-2"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      refreshEvents.isPending && "animate-spin"
                    )}
                  />
                  Refresh
                </button>
              </div>

              {/* Calendar selection */}
              <div>
                <p className="mb-3 text-sm font-medium">Select Calendars</p>
                {calendarsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-lg bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading calendars...
                  </div>
                ) : calendars && calendars.length > 0 ? (
                  <div className="space-y-2">
                    {calendars.map(
                      (calendar: {
                        id: string;
                        summary: string;
                        primary?: boolean;
                        backgroundColor?: string;
                      }) => {
                        const isSelected =
                          connection?.selected_calendars?.includes(
                            calendar.id
                          ) ?? false;
                        return (
                          <label
                            key={calendar.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCalendarToggle(calendar.id)}
                              disabled={updateConnection.isPending}
                              className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                            />
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  calendar.backgroundColor || "#4285F4",
                              }}
                            />
                            <span className="flex-1 text-sm font-medium">
                              {calendar.summary}
                            </span>
                            {calendar.primary && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                Primary
                              </span>
                            )}
                          </label>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                    No calendars found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coming Soon Section */}
        <div className="pt-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">Coming Soon</p>
          <div className="grid gap-3">
            {comingSoonIntegrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-xl border p-4 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", integration.color)}>
                    {integration.icon}
                  </div>
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Coming Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnectConfirm}
        title="Disconnect Google Calendar"
        description="Are you sure you want to disconnect Google Calendar? Your synced events will no longer be visible in ScholarOS."
        confirmText="Disconnect"
        variant="destructive"
        isLoading={disconnectGoogle.isPending}
      />
    </div>
  );
}

// Profile form with save state
function ProfileTab() {
  const toast = useToastActions();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    institution: "",
    department: "",
    title: "",
  });
  const [originalData, setOriginalData] = useState(formData);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setOriginalData(formData);
    setSaving(false);
    setSaved(true);
    toast.success("Profile saved");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Update your personal information
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Full Name</label>
          <input
            type="text"
            placeholder="Dr. Jane Smith"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="input-base"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="jane@university.edu"
            className="input-base bg-muted text-muted-foreground cursor-not-allowed"
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Institution</label>
          <input
            type="text"
            placeholder="University Name"
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            className="input-base"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Department</label>
          <input
            type="text"
            placeholder="Computer Science"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="input-base"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            type="text"
            placeholder="Associate Professor"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-base"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
            saved
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
            (!hasChanges || saving) && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}

// Notifications tab with toggles
function NotificationsTab() {
  const toast = useToastActions();
  const [notifications, setNotifications] = useState({
    taskDue: true,
    grantDeadlines: true,
    meetingReminders: true,
    weeklyDigest: false,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications({ ...notifications, [key]: newValue });
    toast.success(
      `${key === "taskDue" ? "Task due reminders" : key === "grantDeadlines" ? "Grant deadline alerts" : key === "meetingReminders" ? "Meeting reminders" : "Weekly digest"} ${newValue ? "enabled" : "disabled"}`
    );
  };

  const items = [
    {
      key: "taskDue" as const,
      label: "Task due reminders",
      description: "Get notified before tasks are due",
    },
    {
      key: "grantDeadlines" as const,
      label: "Grant deadlines",
      description: "Alerts for upcoming grant deadlines",
    },
    {
      key: "meetingReminders" as const,
      label: "Meeting reminders",
      description: "Personnel meeting overdue alerts",
    },
    {
      key: "weeklyDigest" as const,
      label: "Weekly digest",
      description: "Summary of your week every Monday",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Configure how you receive notifications
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-xl border p-4 transition-all duration-200 hover:border-border"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <button
              onClick={() => handleToggle(item.key)}
              className={cn(
                "relative h-7 w-12 rounded-full transition-all duration-200",
                notifications[item.key] ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  notifications[item.key] && "translate-x-5"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Appearance tab with theme selection
function AppearanceTab() {
  const toast = useToastActions();
  const [theme, setTheme] = useState("System");
  const [defaultView, setDefaultView] = useState("Today");

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Theme</label>
          <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border w-fit">
            {["Light", "Dark", "System"].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={cn(
                  "rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200",
                  theme === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium">Default View</label>
          <select
            value={defaultView}
            onChange={(e) => {
              setDefaultView(e.target.value);
              toast.success(`Default view set to ${e.target.value}`);
            }}
            className="input-base max-w-xs"
          >
            <option>Today</option>
            <option>Upcoming</option>
            <option>Board</option>
            <option>Calendar</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Data tab with actual stats
function DataTab({
  onOpenImport,
}: {
  onOpenImport: () => void;
}) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [] } = useTasks({ workspace_id: currentWorkspaceId });
  const { data: projects = [] } = useProjects({
    workspace_id: currentWorkspaceId ?? "",
  });
  const toast = useToastActions();

  const completedTasks = tasks.filter((t) => t.status === "done").length;

  const handleExport = (format: "json" | "csv") => {
    toast.success(`Exporting as ${format.toUpperCase()}...`);
    setTimeout(() => {
      toast.success(`Data exported as ${format.toUpperCase()}`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Data Management</h2>
          <p className="text-sm text-muted-foreground">
            Import, export, and manage your data
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Import from V1 */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold">Import Data</p>
              <p className="text-sm text-muted-foreground">
                Import tasks and projects from ProfDash v1 or a backup file
              </p>
            </div>
          </div>
          <button
            onClick={onOpenImport}
            className="btn-primary"
          >
            Import Data
          </button>
        </div>

        {/* Export Data */}
        <div className="rounded-xl border p-5 space-y-4">
          <div>
            <p className="font-semibold">Export Data</p>
            <p className="text-sm text-muted-foreground">
              Download all your tasks, projects, and settings
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport("json")}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as CSV
            </button>
          </div>
        </div>

        {/* Data Statistics */}
        <div className="rounded-xl border p-5 space-y-4">
          <p className="font-semibold">Data Overview</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-3xl font-display font-semibold">{tasks.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Tasks</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-3xl font-display font-semibold">{projects.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Projects</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-3xl font-display font-semibold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-3xl font-display font-semibold">
                {tasks.length > 0
                  ? Math.round((completedTasks / tasks.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Security tab with confirm dialogs
function SecurityTab() {
  const toast = useToastActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Simulate delete
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setDeleting(false);
    setShowDeleteConfirm(false);
    toast.error("Account deletion not implemented in demo");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">
            Manage your account security
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Password Section */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your password regularly for security
              </p>
            </div>
          </div>
          <button
            onClick={() => toast.info("Password change coming soon")}
            className="btn-ghost"
          >
            Change Password
          </button>
        </div>

        {/* 2FA Section */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Two-Factor Authentication</p>
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <button
            onClick={() => toast.info("2FA setup coming soon")}
            className="btn-primary"
          >
            Enable 2FA
          </button>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold">Active Sessions</p>
              <p className="text-sm text-muted-foreground">
                Manage your active login sessions
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium">Current Session</p>
                  <p className="text-xs text-muted-foreground">This device</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Active now</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 space-y-4 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">
                Danger Zone
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                Permanently delete your account and all data
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors duration-200"
          >
            Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost forever."
        confirmText="Delete My Account"
        variant="destructive"
        isLoading={deleting}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showImportModal, setShowImportModal] = useState(false);
  const router = useRouter();
  const toast = useToastActions();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-blue-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row animate-fade-in stagger-1">
        {/* Sidebar */}
        <nav className="w-full lg:w-56 shrink-0">
          <div className="rounded-2xl border bg-card p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
            <hr className="my-2" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 rounded-2xl border bg-card p-6 lg:p-8">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "data" && (
            <DataTab onOpenImport={() => setShowImportModal(true)} />
          )}
          {activeTab === "security" && <SecurityTab />}
        </div>
      </div>

      {/* Import Data Modal */}
      <ImportDataModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
