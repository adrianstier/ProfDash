"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Loader2,
  Check,
  X,
  Copy,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useEmailGeneration, type GeneratedEmail } from "@/lib/hooks/use-ai";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";

const EMAIL_TYPES = [
  { value: "project_update", label: "Project Update" },
  { value: "meeting_request", label: "Meeting Request" },
  { value: "deadline_reminder", label: "Deadline Reminder" },
  { value: "collaboration_invite", label: "Collaboration Invite" },
  { value: "progress_report", label: "Progress Report" },
  { value: "feedback_request", label: "Feedback Request" },
  { value: "thank_you", label: "Thank You" },
  { value: "follow_up", label: "Follow Up" },
  { value: "custom", label: "Custom" },
] as const;

const TONES = [
  { value: "formal", label: "Formal", description: "Professional, official tone" },
  { value: "friendly", label: "Friendly", description: "Warm but professional" },
  { value: "brief", label: "Brief", description: "Concise, to the point" },
] as const;

interface EmailGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  taskIds?: string[];
}

export function EmailGeneratorModal({
  open,
  onOpenChange,
  projectId,
  taskIds,
}: EmailGeneratorModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [result, setResult] = useState<GeneratedEmail | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [emailType, setEmailType] = useState<typeof EMAIL_TYPES[number]["value"]>("project_update");
  const [tone, setTone] = useState<typeof TONES[number]["value"]>("friendly");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [subjectContext, setSubjectContext] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [includeTaskSummary, setIncludeTaskSummary] = useState(false);

  const generate = useEmailGeneration();

  const handleGenerate = async () => {
    if (!currentWorkspaceId || !subjectContext.trim()) return;

    try {
      const generateResult = await generate.mutateAsync({
        workspace_id: currentWorkspaceId,
        email_type: emailType,
        tone,
        recipient_name: recipientName || undefined,
        recipient_role: recipientRole || undefined,
        subject_context: subjectContext,
        additional_context: additionalContext || undefined,
        include_task_summary: includeTaskSummary,
        task_ids: includeTaskSummary ? taskIds : undefined,
        project_id: projectId,
      });
      setResult(generateResult);
    } catch (error) {
      console.error("Email generation error:", error);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    const fullEmail = `Subject: ${result.subject}\n\n${result.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setResult(null);
    setSubjectContext("");
    setAdditionalContext("");
    setRecipientName("");
    setRecipientRole("");
    onOpenChange(false);
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="AI Email Generator"
      description="Generate professional academic emails with AI assistance."
      size="lg"
      icon={<Mail className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Form section */}
        {!result && (
          <div className="space-y-4">
            {/* Email Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Email Type</label>
              <div className="flex flex-wrap gap-2">
                {EMAIL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setEmailType(type.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm transition-colors",
                      emailType === type.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tone</label>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md border text-sm transition-colors",
                      tone === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs opacity-70">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Role</label>
                <input
                  type="text"
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value)}
                  placeholder="Department Chair"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Subject Context */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                What is this email about? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={subjectContext}
                onChange={(e) => setSubjectContext(e.target.value)}
                placeholder="e.g., Requesting meeting to discuss manuscript revisions for the Nature submission"
                className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Additional Context */}
            <div>
              <label className="text-sm font-medium mb-1 block">Additional Context</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any other details you want to include..."
                className="w-full h-16 rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Include task summary */}
            {taskIds && taskIds.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTaskSummary}
                  onChange={(e) => setIncludeTaskSummary(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include task summary ({taskIds.length} tasks)</span>
              </label>
            )}
          </div>
        )}

        {/* Result section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Generated email */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Generated Email</h4>
                <Badge variant="outline" className="text-xs">
                  {result.tone_applied}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Subject</label>
                  <p className="text-sm font-medium mt-0.5">{result.subject}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Body</label>
                  <div className="mt-1 p-3 rounded-md bg-background border text-sm whitespace-pre-wrap">
                    {result.body}
                  </div>
                </div>
              </div>
            </div>

            {/* Key points */}
            {result.key_points.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  Key Points Covered
                </h4>
                <ul className="text-sm space-y-1">
                  {result.key_points.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Check className="h-3 w-3" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Warnings
                  </h4>
                </div>
                <ul className="text-sm space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i} className="text-yellow-700 dark:text-yellow-400">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested follow-up */}
            {result.suggested_follow_up && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-purple-500" />
                  <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    Suggested Follow-up
                  </h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  {result.suggested_follow_up}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        {result ? (
          <>
            <Button variant="outline" onClick={() => setResult(null)}>
              <X className="h-4 w-4 mr-2" />
              Generate Another
            </Button>
            <Button onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={!subjectContext.trim() || generate.isPending}>
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
