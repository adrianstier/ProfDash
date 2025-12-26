"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  error: string | null;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { onTranscription, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm format (widely supported)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to access microphone";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        setIsRecording(false);
        setIsTranscribing(true);

        try {
          // Create blob from chunks
          const audioBlob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm'
          });

          // Send to transcription API
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Transcription failed");
          }

          const { text } = await response.json();

          onTranscription?.(text);
          setIsTranscribing(false);
          resolve(text);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Transcription failed";
          setError(errorMessage);
          onError?.(errorMessage);
          setIsTranscribing(false);
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [onTranscription, onError]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    chunksRef.current = [];
    setIsRecording(false);
    setIsTranscribing(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}
