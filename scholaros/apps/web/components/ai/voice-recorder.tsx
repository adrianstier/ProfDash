"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Loader2,
  Check,
  X,
  Plus,
  Flag,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useAudioTranscription, type TranscriptionResult } from "@/lib/hooks/use-ai";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";
import type { TaskCategory } from "@scholaros/shared";

const TRANSCRIPTION_MODES = [
  { value: "simple", label: "Transcribe Only", description: "Just get the text" },
  { value: "extract_tasks", label: "Extract Tasks", description: "Find tasks in speech" },
  { value: "extract_subtasks", label: "Extract Subtasks", description: "Find subtasks for a task" },
] as const;

const PRIORITY_CONFIG = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscription?: (text: string) => void;
  parentTaskId?: string;
}

export function VoiceRecorder({
  open,
  onOpenChange,
  onTranscription,
  parentTaskId,
}: VoiceRecorderProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<typeof TRANSCRIPTION_MODES[number]["value"]>(
    parentTaskId ? "extract_subtasks" : "extract_tasks"
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const transcribe = useAudioTranscription();
  const createTask = useCreateTask();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleTranscribe = async () => {
    if (!audioBlob || !currentWorkspaceId) return;

    try {
      const file = new File([audioBlob], "recording.webm", { type: audioBlob.type });
      const transcribeResult = await transcribe.mutateAsync({
        audio: file,
        workspace_id: currentWorkspaceId,
        mode,
      });
      setResult(transcribeResult);

      // Select all tasks/subtasks by default
      if (transcribeResult.tasks) {
        setSelectedTasks(new Set(transcribeResult.tasks.map((_, i) => i)));
      } else if (transcribeResult.subtasks) {
        setSelectedTasks(new Set(transcribeResult.subtasks.map((_, i) => i)));
      }

      // If simple mode, pass transcription to callback
      if (mode === "simple" && onTranscription) {
        onTranscription(transcribeResult.transcription);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
    }
  };

  const handleImport = async () => {
    if (!result || !currentWorkspaceId) return;

    let imported = 0;

    if (result.tasks) {
      const tasksToImport = result.tasks.filter((_, i) => selectedTasks.has(i));
      for (const task of tasksToImport) {
        try {
          await createTask.mutateAsync({
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: (task.category || "misc") as TaskCategory,
            due: task.due_date,
            status: "todo",
            workspace_id: currentWorkspaceId,
          });
          imported++;
        } catch {
          // Continue
        }
      }
    }

    setImportedCount(imported);
    setTimeout(() => handleClose(), 1500);
  };

  const handleClose = () => {
    stopRecording();
    setAudioBlob(null);
    setResult(null);
    setSelectedTasks(new Set());
    setImportedCount(0);
    setError(null);
    setRecordingTime(0);
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="Voice Recorder"
      description="Record voice memos and transcribe them with AI."
      size="md"
      icon={<Mic className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Mode selection */}
        {!audioBlob && !result && (
          <div>
            <label className="text-sm font-medium mb-2 block">Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSCRIPTION_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "px-3 py-2 rounded-md border text-sm transition-colors",
                    mode === m.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="font-medium text-xs">{m.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recording interface */}
        {!result && (
          <div className="flex flex-col items-center py-8">
            {/* Recording button */}
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-primary hover:bg-primary/90"
              )}
              whileTap={{ scale: 0.95 }}
              disabled={transcribe.isPending}
            >
              {isRecording ? (
                <Square className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </motion.button>

            {/* Recording status */}
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 text-center"
                >
                  <p className="text-2xl font-mono text-red-500">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recording... Click to stop
                  </p>
                </motion.div>
              ) : audioBlob ? (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm font-medium">Recording ready</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(recordingTime)} recorded
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    Click to start recording
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Result section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Transcription */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Transcription</h4>
              <p className="text-sm">{result.transcription}</p>
              {result.summary && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {result.summary}
                </p>
              )}
            </div>

            {/* Extracted tasks */}
            {result.tasks && result.tasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Extracted Tasks ({result.tasks.length})</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {result.tasks.map((task, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedTasks.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                      )}
                      onClick={() => toggleTask(index)}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          selectedTasks.has(index)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedTasks.has(index) && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", PRIORITY_CONFIG[task.priority].color)}
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            {PRIORITY_CONFIG[task.priority].label}
                          </Badge>
                          {task.category && (
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted subtasks */}
            {result.subtasks && result.subtasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Extracted Subtasks ({result.subtasks.length})</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {result.subtasks.map((subtask, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedTasks.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                      )}
                      onClick={() => toggleTask(index)}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          selectedTasks.has(index)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedTasks.has(index) && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm">{subtask.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", PRIORITY_CONFIG[subtask.priority].color)}
                          >
                            {PRIORITY_CONFIG[subtask.priority].label}
                          </Badge>
                          {subtask.estimated_minutes && (
                            <span className="text-xs text-muted-foreground">
                              ~{subtask.estimated_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import success */}
            {importedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>
                  Successfully imported {importedCount} task{importedCount !== 1 ? "s" : ""}!
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        {result ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAudioBlob(null);
                setRecordingTime(0);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Record Again
            </Button>
            {(result.tasks?.length || 0) > 0 && (
              <Button
                onClick={handleImport}
                disabled={selectedTasks.size === 0 || createTask.isPending || importedCount > 0}
              >
                {createTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Import {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </>
        ) : audioBlob ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAudioBlob(null);
                setRecordingTime(0);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button onClick={handleTranscribe} disabled={transcribe.isPending}>
              {transcribe.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Transcribe
                </>
              )}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        )}
      </div>
    </Dialog>
  );
}
