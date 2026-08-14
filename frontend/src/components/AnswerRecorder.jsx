import { useEffect, useRef, useState } from "react";
import { transcribeAnswer } from "../api/client.js";

// Picks the best audio mime type the current browser's MediaRecorder supports.
function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * The whole record -> transcribe panel, lifted out of Practice.jsx so the
 * revision session can reuse it instead of duplicating the MediaRecorder logic.
 *
 * Props
 *   logId          practice_logs row this answer belongs to. Practice already
 *                  has one, so it passes it straight in.
 *   resolveLogId   async () => logId, used instead of `logId` when the row
 *                  should only be created if the user actually records. The
 *                  revision session uses this so browsing past a question
 *                  never writes a stray "shown" log.
 *   resetKey       changing this clears the panel. Defaults to logId.
 *   onStatusChange called with "idle" | "recording" | "processing"
 *   onTranscript   called with the transcript text once it comes back
 *   emptyHint      copy shown before anything has been recorded
 */
export default function AnswerRecorder({
  logId = null,
  resolveLogId = null,
  resetKey,
  onStatusChange,
  onTranscript,
  emptyHint = "Your transcribed answer will appear here after recording.",
}) {
  const [micStatus, setMicStatus] = useState("idle"); // idle | recording | processing
  const [micError, setMicError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const activeLogIdRef = useRef(null); // the row this recording will be saved to

  const key = resetKey !== undefined ? resetKey : logId;
  const canRecord = Boolean(logId || resolveLogId);

  const wordCount = transcript?.trim() ? transcript.trim().split(/\s+/).length : 0;

  const updateStatus = (status) => {
    setMicStatus(status);
    onStatusChange?.(status);
  };

  // A new question means a clean panel.
  useEffect(() => {
    setTranscript("");
    setMicError("");
    setElapsedSeconds(0);
    activeLogIdRef.current = null;
    updateStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Tear down the stream and timer if the component goes away mid-recording.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    setMicError("");
    setTranscript("");
    try {
      // Improving Audio to text conversion
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Work out where this answer will be saved BEFORE recording starts, so a
      // backend problem surfaces now rather than after a two-minute answer.
      try {
        activeLogIdRef.current = logId ?? (await resolveLogId());
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        setMicError(e.message || "Could not start this question. Please try again.");
        return;
      }

      const mimeType = pickMimeType();

      // Adding audioBitsPerSecond for better audio quality
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined
      );
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        await sendForTranscription(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      updateStatus("recording");
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } catch (e) {
      setMicError(
        "Could not access your microphone. Please check your browser's microphone permissions and try again."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      updateStatus("processing");
    }
  };

  const sendForTranscription = async (blob) => {
    const targetLogId = activeLogIdRef.current;
    if (!targetLogId) {
      updateStatus("idle");
      return;
    }
    try {
      const result = await transcribeAnswer(targetLogId, blob);
      setTranscript(result.transcript);
      onTranscript?.(result.transcript);
      updateStatus("idle");
    } catch (e) {
      setMicError(e.message);
      updateStatus("idle");
    }
  };

  // for keyboard keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }

      // Prevent repeated firing when key is held
      if (e.repeat) return;

      // R -> Start recording
      if (
        e.key.toLowerCase() === "r" &&
        canRecord &&
        micStatus !== "recording" &&
        micStatus !== "processing"
      ) {
        e.preventDefault();
        startRecording();
      }

      // Space or Enter -> Stop recording
      if (micStatus === "recording" && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micStatus, canRecord]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <p className="eyebrow text-ink-600 mb-5">Record your answer</p>

      <button
        onClick={micStatus === "recording" ? stopRecording : startRecording}
        disabled={micStatus === "processing" || !canRecord}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
          micStatus === "recording"
            ? "bg-rose text-white recording-pulse"
            : "bg-signal text-ink-950 hover:bg-signal-dim"
        } disabled:opacity-60`}
        aria-label={micStatus === "recording" ? "Stop recording" : "Start recording"}
      >
        {micStatus === "recording" ? (
          <span className="w-5 h-5 bg-white rounded-sm" />
        ) : (
          <span className="text-2xl">●</span>
        )}
      </button>

      <p className="text-sm text-ink-600 mt-4 font-mono">
        {micStatus === "recording"
          ? formatTime(elapsedSeconds)
          : micStatus === "processing"
          ? "Transcribing…"
          : "Tap to record"}
      </p>

      {/* Keyboard shortcuts */}
      <p className="text-xs text-ink-500 mt-2">
        Press <kbd className="px-1 py-0.5 border rounded">R</kbd> to record •{" "}
        <kbd className="px-1 py-0.5 border rounded">Space</kbd> or{" "}
        <kbd className="px-1 py-0.5 border rounded">Enter</kbd> to stop
      </p>

      {micStatus === "recording" && (
        <div className="flex items-end gap-1 h-6 mt-3" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="mic-bar w-1.5 bg-rose rounded-full h-full"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}

      {micError && <p className="text-xs text-rose mt-4">{micError}</p>}

      {transcript !== "" && (
        <div className="mt-6 w-full text-left bg-paper rounded-lg p-4 border border-black/5">
          <p className="eyebrow text-signal-dim mb-2">Transcript</p>
          <p className="text-sm text-ink-900 leading-relaxed">{transcript}</p>

          {/* Count of words */}
          <div className="mt-3 pt-3 border-t border-black/10 flex justify-between text-xs text-ink-600">
            <span>
              Words: <strong>{wordCount}</strong>
            </span>
          </div>
        </div>
      )}

      {transcript === "" && micStatus === "idle" && (
        <p className="text-xs text-ink-600 mt-6">{emptyHint}</p>
      )}
    </div>
  );
}
