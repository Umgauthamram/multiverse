/**
 * Browser Web Speech API Utility & Capability Detector
 * Encapsulates native SpeechRecognition / webkitSpeechRecognition cross-browser hooks,
 * event handling, and seamless transition to server-side Whisper fallback.
 */

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error"
  | "unsupported";

export interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: SpeechRecognitionStatus) => void;
}

// Window interface augmentation for browser speech recognition
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: { error: string; message?: string }) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
}

export interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

/**
 * Detects whether the current browser environment provides native speech recognition.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(
    window.SpeechRecognition !== undefined ||
      window.webkitSpeechRecognition !== undefined
  );
}

/**
 * Returns the native SpeechRecognition constructor if available.
 */
export function getSpeechRecognitionConstructor(): (new () => ISpeechRecognition) | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export class SpeechRecognitionSession {
  private recognition: ISpeechRecognition | null = null;
  private status: SpeechRecognitionStatus = "idle";
  private finalTranscript = "";

  constructor(private options: SpeechRecognitionOptions = {}) {
    const RecognitionClass = getSpeechRecognitionConstructor();
    if (!RecognitionClass) {
      this.status = "unsupported";
      this.options.onStatusChange?.("unsupported");
      return;
    }

    try {
      this.recognition = new RecognitionClass();
      this.recognition.continuous = options.continuous ?? true;
      this.recognition.interimResults = options.interimResults ?? true;
      this.recognition.lang = options.lang ?? "en-US";

      this.setupHandlers();
    } catch {
      this.status = "error";
      this.options.onStatusChange?.("error");
    }
  }

  public getStatus(): SpeechRecognitionStatus {
    return this.status;
  }

  public isSupported(): boolean {
    return this.status !== "unsupported";
  }

  private setupHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.status = "listening";
      this.options.onStatusChange?.("listening");
    };

    this.recognition.onend = () => {
      if (this.status === "listening") {
        this.status = "idle";
        this.options.onStatusChange?.("idle");
      }
    };

    this.recognition.onerror = (event) => {
      this.status = "error";
      this.options.onStatusChange?.("error");
      const errMessage = event.error || "Speech recognition encountered an unknown error";
      this.options.onError?.(errMessage);
    };

    this.recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item && item[0]) {
          const text = item[0].transcript;
          if (item.isFinal) {
            this.finalTranscript += (this.finalTranscript ? " " : "") + text.trim();
            this.options.onTranscript?.(this.finalTranscript, true);
          } else {
            interim += text;
            const combined = this.finalTranscript
              ? `${this.finalTranscript} ${interim}`
              : interim;
            this.options.onTranscript?.(combined, false);
          }
        }
      }
    };
  }

  public start(): void {
    if (!this.recognition) {
      this.options.onError?.("Speech recognition is not supported in this browser");
      return;
    }
    try {
      this.finalTranscript = "";
      this.recognition.start();
    } catch (err) {
      this.status = "error";
      this.options.onStatusChange?.("error");
      this.options.onError?.(err instanceof Error ? err.message : "Failed to start listening");
    }
  }

  public stop(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      this.status = "idle";
      this.options.onStatusChange?.("idle");
    } catch {
      // Ignore stop errors if already stopped
    }
  }

  public abort(): void {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
      this.status = "idle";
      this.options.onStatusChange?.("idle");
    } catch {
      // Ignore abort errors
    }
  }
}
