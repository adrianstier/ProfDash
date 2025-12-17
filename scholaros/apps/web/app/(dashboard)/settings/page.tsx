"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, Bell, Palette, Link, Shield, LogOut } from "lucide-react";

type SettingsTab = "profile" | "notifications" | "appearance" | "integrations" | "security";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar */}
        <nav className="w-full space-y-1 md:w-48">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
          <hr className="my-2" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>

        {/* Content */}
        <div className="flex-1 rounded-lg border bg-card p-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Update your personal information
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Jane Smith"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    placeholder="jane@university.edu"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contact support to change your email
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Institution</label>
                  <input
                    type="text"
                    placeholder="University Name"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <input
                    type="text"
                    placeholder="Computer Science"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    placeholder="Associate Professor"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how you receive notifications
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Task due reminders", description: "Get notified before tasks are due" },
                  { label: "Grant deadlines", description: "Alerts for upcoming grant deadlines" },
                  { label: "Meeting reminders", description: "Personnel meeting overdue alerts" },
                  { label: "Weekly digest", description: "Summary of your week every Monday" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform translate-x-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Appearance</h2>
                <p className="text-sm text-muted-foreground">
                  Customize the look and feel
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Theme</label>
                  <div className="mt-2 flex gap-2">
                    {["Light", "Dark", "System"].map((theme) => (
                      <button
                        key={theme}
                        className={`rounded-md px-4 py-2 text-sm ${
                          theme === "System"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Default View</label>
                  <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option>Today</option>
                    <option>Upcoming</option>
                    <option>Board</option>
                    <option>Calendar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Integrations</h2>
                <p className="text-sm text-muted-foreground">
                  Connect external services
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Google Calendar", connected: false, description: "Sync events from Google Calendar" },
                  { name: "Outlook Calendar", connected: false, description: "Sync events from Outlook" },
                  { name: "Grants.gov", connected: false, description: "Discover funding opportunities" },
                  { name: "ORCID", connected: false, description: "Import your publication record" },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                    <button
                      className={`rounded-md px-4 py-2 text-sm ${
                        integration.connected
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {integration.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Security</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account security
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your password regularly for security
                  </p>
                  <button className="mt-3 rounded-md bg-muted px-4 py-2 text-sm hover:bg-muted/80">
                    Change Password
                  </button>
                </div>
                <div className="rounded-md border p-4">
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                  <button className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                    Enable 2FA
                  </button>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                  <p className="font-medium text-red-700 dark:text-red-400">Danger Zone</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Permanently delete your account and all data
                  </p>
                  <button className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
