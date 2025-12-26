"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/lib/hooks/use-voice";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  disabled?: boolean;
}

export function VoiceInput({
  onTranscription,
  onError,
  className,
  size = "md",
  showTooltip = true,
  disabled = false,
}: VoiceInputProps) {
  const [showPulse, setShowPulse] = useState(false);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  } = useVoice({
    onTranscription,
    onError,
  });

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      setShowPulse(true);
    } else {
      setShowPulse(false);
    }
  }, [isRecording]);

  const handleClick = async () => {
    if (disabled) return;

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelRecording();
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* Pulse animation ring */}
      {showPulse && (
        <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75" />
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        title={
          showTooltip
            ? isRecording
              ? "Click to stop recording"
              : isTranscribing
                ? "Transcribing..."
                : "Click to start voice input"
            : undefined
        }
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-200",
          sizeClasses[size],
          isRecording
            ? "bg-red-500 text-white hover:bg-red-600"
            : isTranscribing
              ? "bg-blue-500 text-white cursor-wait"
              : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          error && "ring-2 ring-red-500"
        )}
      >
        {isTranscribing ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin")} />
        ) : isRecording ? (
          <MicOff className={iconSizes[size]} />
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </button>

      {/* Cancel button when recording */}
      {isRecording && (
        <button
          type="button"
          onClick={handleCancel}
          className="ml-1 rounded-full bg-muted p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          title="Cancel recording"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Error indicator */}
      {error && (
        <span className="ml-2 text-xs text-red-500" title={error}>
          Error
        </span>
      )}
    </div>
  );
}

// Inline voice button for text inputs
interface VoiceInputInlineProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function VoiceInputInline({
  onTranscription,
  onError,
  disabled = false,
}: VoiceInputInlineProps) {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  } = useVoice({
    onTranscription,
    onError,
  });

  const handleClick = async () => {
    if (disabled) return;

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Stop recording" : "Voice input"}
      className={cn(
        "inline-flex items-center justify-center rounded p-1.5 transition-colors",
        isRecording
          ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          : isTranscribing
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        error && "text-red-500"
      )}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <div className="relative">
          <MicOff className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
