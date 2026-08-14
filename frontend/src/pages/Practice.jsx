import { useEffect, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import AnswerRecorder from "../components/AnswerRecorder.jsx";

import {
  getNextQuestion,
  skipQuestion,
  resetPracticeCycle,
  markForRetry,
  unmarkRetry,
  getRetryIds,
} from "../api/client.js";
import { Link } from "react-router-dom";

export default function Practice() {
  const [current, setCurrent] = useState(null); // { log_id, question, remaining_in_cycle, total_questions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [micStatus, setMicStatus] = useState("idle"); // idle | recording | processing
  const [retryIds, setRetryIds] = useState([]);
  const [retryBusy, setRetryBusy] = useState(false);

  const busy = micStatus === "recording" || micStatus === "processing";
  const inRetryPool = current ? retryIds.includes(current.question.id) : false;

  const loadRetryIds = async () => {
    try {
      const data = await getRetryIds();
      setRetryIds(data.ids || []);
    } catch {
      // The retry pool is a nice-to-have on this page — never block practice on it.
    }
  };

  const loadNext = async () => {
    setLoading(true);
    setError("");
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
    loadRetryIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // "I couldn't answer this" — park it in the revision pool and move on.
  const handleSaveForRetry = async ({ advance }) => {
    if (!current || retryBusy) return;
    setRetryBusy(true);
    const questionId = current.question.id;
    try {
      if (inRetryPool) {
        await unmarkRetry(questionId);
        setRetryIds((ids) => ids.filter((id) => id !== questionId));
      } else {
        await markForRetry(questionId);
        setRetryIds((ids) => [...ids, questionId]);
        if (advance) {
          await skipQuestion(current.log_id).catch(() => { });
          setRetryBusy(false);
          loadNext();
          return;
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setRetryBusy(false);
  };

  // Progress bar
  const completed = current ? current.total_questions - current.remaining_in_cycle : 0;
  const progress =
    current && current.total_questions > 0
      ? (completed / current.total_questions) * 100
      : 0;

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow text-signal-dim">Practice session</p>
          <h1 className="font-display text-3xl text-ink-900 mt-1">On the record</h1>
        </div>
        <div className="flex items-center gap-4 self-start">
          {retryIds.length > 0 && (
            <Link
              to="/retry"
              className="text-sm text-ink-600 hover:text-ink-900 underline underline-offset-4"
            >
              {retryIds.length} saved for revision
            </Link>
          )}
          <button
            onClick={handleReset}
            className="text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            ↺ Reset practice cycle
          </button>
        </div>
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
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{current.question.category}</Badge>
                {inRetryPool && <Badge tone="neutral">Saved for revision</Badge>}
              </div>
              <span className="eyebrow text-ink-600">
                {completed} of {current.total_questions} this cycle
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-signal h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-ink-500 mt-1 text-right">
                {Math.round(progress)}% Complete
              </p>
            </div>

            <p className="font-display text-2xl md:text-3xl text-ink-900 leading-snug flex-1">
              {current.question.text}
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={handleSkip}
                disabled={busy}
                className="px-4 py-2.5 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper disabled:opacity-50"
              >
                Skip question
              </button>
              <button
                onClick={handleNext}
                disabled={busy}
                className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 disabled:opacity-50"
              >
                Next question →
              </button>

              {/* The retry control: park this question and carry on. */}
              <button
                onClick={() => handleSaveForRetry({ advance: !inRetryPool })}
                disabled={busy || retryBusy}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border disabled:opacity-50 ${inRetryPool
                  ? "border-rose/40 text-rose hover:bg-rose/5"
                  : "border-black/10 text-ink-700 hover:bg-paper"
                  }`}
                title={
                  inRetryPool
                    ? "Take this question out of the revision list"
                    : "Save this question to revise on its own later"
                }
              >
                {inRetryPool ? "✕ Remove from revision" : "⟳ Couldn't answer — save for retry"}
              </button>
            </div>
          </Card>

          <Card className="p-7 flex flex-col items-center justify-center text-center">
            <AnswerRecorder
              logId={current.log_id}
              onStatusChange={setMicStatus}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
