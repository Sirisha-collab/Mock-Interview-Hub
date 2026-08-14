import { useEffect, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import AnswerRecorder from "../components/AnswerRecorder.jsx";
import {
  listRetryQuestions,
  unmarkRetry,
  clearRetryPool,
  startRetryAttempt,
} from "../api/client.js";

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Retry() {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Session state. `queue` holds the question objects, ordered when it starts.
  const [queue, setQueue] = useState(null);
  const [index, setIndex] = useState(0);
  const [micStatus, setMicStatus] = useState("idle");

  const busy = micStatus === "recording" || micStatus === "processing";
  const inSession = queue !== null;
  const currentQuestion = inSession && index < queue.length ? queue[index] : null;

  const loadPool = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listRetryQuestions();
      setPool(data.questions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, []);

  const startSession = (questions) => {
    setError("");
    setIndex(0);
    setMicStatus("idle");
    setQueue(questions);
  };

  const endSession = () => {
    setQueue(null);
    setIndex(0);
    loadPool();
  };

  const goNext = () => setIndex((i) => i + 1);

  // Only called when you actually press record, so a question you skim past
  // never leaves a stray row in practice_logs.
  const openAttempt = async () => {
    const data = await startRetryAttempt(currentQuestion.id);
    return data.log_id;
  };

  // "I've got this now" — drop it from the pool and move on.
  const handleMastered = async () => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    try {
      await unmarkRetry(questionId);
      setPool((p) => p.filter((q) => q.id !== questionId));
    } catch (e) {
      setError(e.message);
    }
    goNext();
  };

  const handleRemoveFromList = async (questionId) => {
    try {
      await unmarkRetry(questionId);
      setPool((p) => p.filter((q) => q.id !== questionId));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Remove every question from your revision list?")) return;
    try {
      await clearRetryPool();
      setPool([]);
    } catch (e) {
      setError(e.message);
    }
  };

  // ---------------------------------------------------------------- session
  if (inSession) {
    const finished = index >= queue.length;

    return (
      <div>
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow text-signal-dim">Revision session</p>
            <h1 className="font-display text-3xl text-ink-900 mt-1">Second time around</h1>
          </div>
          <button
            onClick={endSession}
            disabled={busy}
            className="text-sm font-medium text-ink-600 hover:text-ink-900 self-start disabled:opacity-50"
          >
            ← Back to revision list
          </button>
        </header>

        <ErrorBanner message={error} />

        {finished ? (
          <Card className="p-10 text-center">
            <p className="font-display text-2xl text-ink-900 mb-2">Session complete</p>
            <p className="text-sm text-ink-600 mb-6">
              You worked through {queue.length} question{queue.length === 1 ? "" : "s"}.
              Anything you marked as understood is off the list; the rest is still waiting.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => startSession(shuffle(queue))}
                className="px-4 py-2.5 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper"
              >
                Run it again
              </button>
              <button
                onClick={endSession}
                className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900"
              >
                Back to list
              </button>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="p-7 md:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{currentQuestion.category}</Badge>
                  <Badge tone="neutral">Revision</Badge>
                </div>
                <span className="eyebrow text-ink-600">
                  {index + 1} of {queue.length}
                </span>
              </div>

              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-rose h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((index + 1) / queue.length) * 100}%` }}
                  />
                </div>
              </div>

              <p className="font-display text-2xl md:text-3xl text-ink-900 leading-snug flex-1">
                {currentQuestion.text}
              </p>

              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  onClick={goNext}
                  disabled={busy}
                  className="px-4 py-2.5 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper disabled:opacity-50"
                >
                  Still shaky — keep it
                </button>
                <button
                  onClick={handleMastered}
                  disabled={busy}
                  className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 disabled:opacity-50"
                >
                  ✓ Got it — remove from revision
                </button>
              </div>
            </Card>

            <Card className="p-7 flex flex-col items-center justify-center text-center">
              <AnswerRecorder
                resolveLogId={openAttempt}
                resetKey={currentQuestion.id}
                onStatusChange={setMicStatus}
                emptyHint="Answer it out loud again and compare with last time."
              />
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------- list
  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow text-signal-dim">Revision list</p>
          <h1 className="font-display text-3xl text-ink-900 mt-1">Questions to retry</h1>
          <p className="text-sm text-ink-600 mt-2">
            Everything you marked as “couldn't answer” during practice, kept in one place.
          </p>
        </div>
        {pool.length > 0 && (
          <div className="flex flex-wrap gap-3 self-start">
            <button
              onClick={handleClearAll}
              className="px-4 py-2.5 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper"
            >
              Clear list
            </button>
            <button
              onClick={() => startSession(shuffle(pool))}
              className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900"
            >
              Start revision session ({pool.length})
            </button>
          </div>
        )}
      </header>

      <ErrorBanner message={error} onRetry={loadPool} />

      {loading ? (
        <LoadingState label="Loading your revision list…" />
      ) : pool.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl text-ink-900 mb-2">Nothing to revise</p>
          <p className="text-sm text-ink-600">
            When a question stumps you during practice, hit{" "}
            <strong>Couldn't answer — save for retry</strong> and it will show up here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pool.map((q) => (
            <Card key={q.id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {q.category && <Badge tone="neutral">{q.category}</Badge>}
                  </div>
                  <p className="text-ink-900 leading-snug">{q.text}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startSession([q])}
                    className="px-3 py-2 text-sm font-medium border border-black/10 rounded-lg text-ink-700 hover:bg-paper"
                  >
                    Practice this
                  </button>
                  <button
                    onClick={() => handleRemoveFromList(q.id)}
                    className="px-3 py-2 text-sm font-medium text-ink-600 hover:text-rose"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
