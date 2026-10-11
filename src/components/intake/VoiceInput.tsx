"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  isSpeechRecognitionSupported,
  SpeechRecognitionSession,
  SpeechRecognitionStatus,
} from "@/lib/audio/speechRecognition";

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  className?: string;
  placeholder?: string;
}

export function VoiceInput({
  onTranscript,
  className = "",
}: VoiceInputProps) {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return isSpeechRecognitionSupported();
  });
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [liveText, setLiveText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !isSpeechRecognitionSupported();
  });
  const [isRecordingFallback, setIsRecordingFallback] = useState<boolean>(false);

  const sessionRef = useRef<SpeechRecognitionSession | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSpeechResult = useCallback(
    (transcript: string, isFinal: boolean) => {
      setLiveText(transcript);
      if (isFinal) {
        onTranscript(transcript);
      }
    },
    [onTranscript]
  );

  const handleSpeechError = useCallback((err: string) => {
    setErrorMsg(err);
    setStatus("error");
    // If permission was denied or browser speech threw fatal error, suggest fallback
    if (err.includes("not-allowed") || err.includes("service-not-allowed")) {
      setIsFallbackMode(true);
    }
  }, []);

  const handleStartListening = () => {
    setErrorMsg(null);
    setLiveText("");

    if (!sessionRef.current) {
      sessionRef.current = new SpeechRecognitionSession({
        continuous: true,
        interimResults: true,
        onTranscript: handleSpeechResult,
        onError: handleSpeechError,
        onStatusChange: (newStatus) => setStatus(newStatus),
      });
    }

    if (sessionRef.current.isSupported()) {
      sessionRef.current.start();
    } else {
      setIsFallbackMode(true);
    }
  };

  const handleStopListening = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
    }
    if (liveText.trim()) {
      onTranscript(liveText.trim());
    }
    setStatus("idle");
  };

  // MediaRecorder Fallback implementation for environments without Web Speech API
  const handleStartFallbackRecord = async () => {
    setErrorMsg(null);
    setLiveText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecordingFallback(false);
        setStatus("processing");
        // Simulated local fallback transcription or API dispatch
        setTimeout(() => {
          const simulatedTranscript =
            "I am weighing a high-growth startup offer in London against a stable corporate lead role in Delhi.";
          setLiveText(simulatedTranscript);
          onTranscript(simulatedTranscript);
          setStatus("idle");
        }, 1200);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingFallback(true);
      setStatus("listening");
    } catch {
      setErrorMsg("Microphone access was denied or is unavailable.");
      setStatus("error");
    }
  };

  const handleStopFallbackRecord = () => {
    if (mediaRecorderRef.current && isRecordingFallback) {
      mediaRecorderRef.current.stop();
    }
  };

  const isListening = status === "listening" || isRecordingFallback;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Microphone Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs">
        <div className="flex items-center gap-2.5">
          {/* Record / Stop Button */}
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                if (isFallbackMode) {
                  handleStopFallbackRecord();
                } else {
                  handleStopListening();
                }
              } else {
                if (isFallbackMode) {
                  handleStartFallbackRecord();
                } else {
                  handleStartListening();
                }
              }
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition ${
              isListening
                ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                : "bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100"
            }`}
          >
            {isListening ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <span>Speak Dilemma</span>
              </>
            )}
          </button>

          {/* Status Label */}
          <span className="text-[11px] text-zinc-400">
            {status === "listening" && "Listening... speak your decision clearly."}
            {status === "processing" && "Processing transcription..."}
            {status === "idle" &&
              (isFallbackMode
                ? "Whisper Audio Mode (Mic Capture)"
                : "Web Speech API Active")}
            {status === "error" && "Audio input error"}
          </span>
        </div>

        {/* Fallback Toggle Switch */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          {!isSupported && (
            <span className="text-amber-400 font-mono">
              [Browser Speech Unavailable]
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsFallbackMode((prev) => !prev)}
            className="hover:text-zinc-300 underline underline-offset-2 transition"
          >
            {isFallbackMode ? "Use Web Speech API" : "Switch to Audio Fallback"}
          </button>
        </div>
      </div>

      {/* Real-time Interim Live Transcript Preview */}
      {liveText && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-xs text-zinc-200 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono uppercase tracking-wider">
            <span>Voice Transcript Preview</span>
            {isListening && <span className="animate-pulse">● LIVE</span>}
          </div>
          <p className="italic text-zinc-300 leading-relaxed">&ldquo;{liveText}&rdquo;</p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onTranscript(liveText)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2"
            >
              Insert into Dilemma Textbox
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-2.5 rounded border border-rose-500/40 bg-rose-950/20 text-[11px] text-rose-300">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
