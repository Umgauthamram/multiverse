import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSpeechRecognitionSupported,
  getSpeechRecognitionConstructor,
  SpeechRecognitionSession,
  ISpeechRecognition,
  ISpeechRecognitionEvent,
} from "@/lib/audio/speechRecognition";

describe("Phase 13: Voice-to-Text via Web Speech API & Fallback", () => {
  interface MockWindowType {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }

  let mockWindow: MockWindowType;
  const originalWindow = (globalThis as unknown as { window?: MockWindowType }).window;

  beforeEach(() => {
    mockWindow = {};
    (globalThis as unknown as { window: MockWindowType }).window = mockWindow;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      (globalThis as unknown as { window?: MockWindowType }).window = originalWindow;
    } else {
      delete (globalThis as unknown as { window?: MockWindowType }).window;
    }
  });

  describe("Browser Capability Detection", () => {
    it("returns false in headless Node environment when window is undefined", () => {
      delete (globalThis as unknown as { window?: MockWindowType }).window;
      expect(isSpeechRecognitionSupported()).toBe(false);
      expect(getSpeechRecognitionConstructor()).toBeNull();
    });

    it("returns false when window exists but neither SpeechRecognition nor webkitSpeechRecognition is available", () => {
      expect(isSpeechRecognitionSupported()).toBe(false);
      expect(getSpeechRecognitionConstructor()).toBeNull();
    });

    it("returns true when standard window.SpeechRecognition is available", () => {
      class MockSpeechRecognition {}
      mockWindow.SpeechRecognition = MockSpeechRecognition as unknown as new () => ISpeechRecognition;

      expect(isSpeechRecognitionSupported()).toBe(true);
      expect(getSpeechRecognitionConstructor()).toBe(MockSpeechRecognition);
    });

    it("returns true when prefixed window.webkitSpeechRecognition is available", () => {
      class MockWebkitSpeechRecognition {}
      mockWindow.webkitSpeechRecognition = MockWebkitSpeechRecognition as unknown as new () => ISpeechRecognition;

      expect(isSpeechRecognitionSupported()).toBe(true);
      expect(getSpeechRecognitionConstructor()).toBe(MockWebkitSpeechRecognition);
    });
  });

  describe("SpeechRecognitionSession Lifecycle & Handlers", () => {
    it("transitions to unsupported status when browser lacks Web Speech API", () => {
      const onStatusChange = vi.fn();
      const session = new SpeechRecognitionSession({ onStatusChange });

      expect(session.isSupported()).toBe(false);
      expect(session.getStatus()).toBe("unsupported");
      expect(onStatusChange).toHaveBeenCalledWith("unsupported");
    });

    it("successfully wires start, interim results, final transcript, and error handlers", () => {
      let instanceRef: {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: (() => void) | null;
        onend: (() => void) | null;
        onerror: ((ev: { error: string }) => void) | null;
        onresult: ((ev: ISpeechRecognitionEvent) => void) | null;
        start: () => void;
        stop: () => void;
        abort: () => void;
      } | null = null;

      class MockRecognition implements Partial<ISpeechRecognition> {
        public continuous = false;
        public interimResults = false;
        public lang = "";
        public onstart: (() => void) | null = null;
        public onend: (() => void) | null = null;
        public onerror: ((ev: { error: string }) => void) | null = null;
        public onresult: ((ev: ISpeechRecognitionEvent) => void) | null = null;

        public start = vi.fn(() => {
          this.onstart?.();
        });
        public stop = vi.fn(() => {
          this.onend?.();
        });
        public abort = vi.fn();

        constructor() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          instanceRef = this;
        }
      }

      mockWindow.SpeechRecognition = MockRecognition as unknown as new () => ISpeechRecognition;

      const onTranscript = vi.fn();
      const onStatusChange = vi.fn();
      const onError = vi.fn();

      const session = new SpeechRecognitionSession({
        continuous: true,
        interimResults: true,
        lang: "en-US",
        onTranscript,
        onStatusChange,
        onError,
      });

      expect(session.isSupported()).toBe(true);
      const instance = instanceRef as unknown as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult?: (ev: ISpeechRecognitionEvent) => void;
        onerror?: (ev: { error: string }) => void;
      };

      expect(instance).toBeDefined();
      expect(instance.continuous).toBe(true);
      expect(instance.interimResults).toBe(true);
      expect(instance.lang).toBe("en-US");

      // 1. Start listening
      session.start();
      expect(session.getStatus()).toBe("listening");
      expect(onStatusChange).toHaveBeenCalledWith("listening");

      // 2. Stream interim transcript chunk
      const interimEvent: ISpeechRecognitionEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            length: 1,
            0: { transcript: "Should I accept the offer", confidence: 0.9 },
          },
        ],
      };
      instance.onresult?.(interimEvent);
      expect(onTranscript).toHaveBeenCalledWith("Should I accept the offer", false);

      // 3. Deliver final transcript chunk
      const finalEvent: ISpeechRecognitionEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            0: { transcript: "Should I accept the offer in London?", confidence: 0.95 },
          },
        ],
      };
      instance.onresult?.(finalEvent);
      expect(onTranscript).toHaveBeenCalledWith("Should I accept the offer in London?", true);

      // 4. Trigger error
      instance.onerror?.({ error: "network" });
      expect(session.getStatus()).toBe("error");
      expect(onError).toHaveBeenCalledWith("network");

      // 5. Stop session
      session.stop();
      expect(session.getStatus()).toBe("idle");
    });

    it("gracefully catches startup exceptions and fires onError", () => {
      class FailingRecognition implements Partial<ISpeechRecognition> {
        public start = vi.fn(() => {
          throw new Error("Microphone already in use");
        });
        public stop = vi.fn();
        public abort = vi.fn();
      }

      mockWindow.SpeechRecognition = FailingRecognition as unknown as new () => ISpeechRecognition;

      const onError = vi.fn();
      const session = new SpeechRecognitionSession({ onError });

      session.start();
      expect(onError).toHaveBeenCalledWith("Microphone already in use");
      expect(session.getStatus()).toBe("error");
    });
  });
});
