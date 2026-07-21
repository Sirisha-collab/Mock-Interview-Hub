import { useEffect, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import {
  getNextQuestion,
  skipQuestion,
  resetPracticeCycle,
  transcribeAnswer,
} from "../api/client.js";

// Picks the best audio mime type the current browser's MediaRecorder supports.
function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export default function Practice() {
  const [current, setCurrent] = useState(null); // { log_id, question, remaining_in_cycle, total_questions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [micStatus, setMicStatus] = useState("idle"); // idle | recording | processing
  const [micError, setMicError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const loadNext = async () => {
    setLoading(true);
    setError("");
    setTranscript("");
    setMicError("");
    setMicStatus("idle");
    try {
      const data = await getNextQuestion();
      setCurrent(data);
    } catch (e) {
      setError(e.message);
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNext();
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const mimeType = pickMimeType();

      //Adding audioBitsPerSecond for better audio quality
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
      setMicStatus("recording");
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
      setMicStatus("processing");
    }
  };

  const sendForTranscription = async (blob) => {
    if (!current) return;
    try {
      const result = await transcribeAnswer(current.log_id, blob);
      setTranscript(result.transcript);
      setMicStatus("idle");
    } catch (e) {
      setMicError(e.message);
      setMicStatus("idle");
    }
  };

  const handleSkip = async () => {
    if (!current) return;
    try {
      await skipQuestion(current.log_id);
    } catch (e) {
      setError(e.message);
    }
    loadNext();
  };

  const handleNext = () => {
    loadNext();
  };

  const handleReset = async () => {
    try {
      await resetPracticeCycle();
    } catch (e) {
      setError(e.message);
    }
    loadNext();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow text-signal-dim">Practice session</p>
          <h1 className="font-display text-3xl text-ink-900 mt-1">On the record</h1>
        </div>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-ink-600 hover:text-ink-900 self-start"
        >
          ↺ Reset practice cycle
        </button>
      </header>

      <ErrorBanner message={error} onRetry={loadNext} />

      {loading ? (
        <LoadingState label="Selecting your next question…" />
      ) : !current ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl text-ink-900 mb-2">No questions yet</p>
          <p className="text-sm text-ink-600">
            Add a few questions on the Questions page before starting a practice session.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          <Card className="p-7 md:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Badge tone="neutral">{current.question.category}</Badge>
              <span className="eyebrow text-ink-600">
                {current.total_questions - current.remaining_in_cycle} of {current.total_questions} this cycle
              </span>
            </div>

            <p className="font-display text-2xl md:text-3xl text-ink-900 leading-snug flex-1">
              {current.question.text}
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={handleSkip}
                disabled={micStatus === "recording" || micStatus === "processing"}
                className="px-4 py-2.5 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper disabled:opacity-50"
              >
                Skip question
              </button>
              <button
                onClick={handleNext}
                disabled={micStatus === "recording" || micStatus === "processing"}
                className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 disabled:opacity-50"
              >
                Next question →
              </button>
            </div>
          </Card>

          <Card className="p-7 flex flex-col items-center justify-center text-center">
            <p className="eyebrow text-ink-600 mb-5">Record your answer</p>

            <button
              onClick={micStatus === "recording" ? stopRecording : startRecording}
              disabled={micStatus === "processing"}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${micStatus === "recording"
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
              </div>
            )}
            {transcript === "" && micStatus === "idle" && current && (
              <p className="text-xs text-ink-600 mt-6">
                Your transcribed answer will appear here after recording.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
