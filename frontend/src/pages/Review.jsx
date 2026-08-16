import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Badge, { statusBadge } from "../components/Badge.jsx";
import { ErrorBanner, LoadingState, EmptyState, Toast } from "../components/Feedback.jsx";
import { getReviewItems, deleteReviewItem, getCategories } from "../api/client.js";

const STATUS_OPTIONS = [
  { value: "answered", label: "Answered" },
  { value: "skipped", label: "Skipped" },
  { value: "unanswered", label: "Unanswered" },
];

function parseTimestamp(iso) {
  if (typeof iso !== "string" || !iso) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(iso) {
  const date = parseTimestamp(iso);
  if (!date) return "Date unavailable";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const selectClass =
  "border border-black/10 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-signal focus:border-signal outline-none";

export default function Review() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("answered");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Latest request
  const requestId = useRef(0);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => {
        // A failed category list 
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    let active = true;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const reviewItems = await getReviewItems({
          status: status || undefined,
          category: category || undefined,
        });
        if (!active || id !== requestId.current) return;
        setItems(reviewItems);
      } catch (e) {
        if (active && id === requestId.current) setError(e.message);
      } finally {
        if (active && id === requestId.current) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [category, status, reloadKey]);

  const handleDelete = async (logId) => {
    if (deletingId) return;
    setDeletingId(logId);
    const snapshot = items;
    setItems((current) => current.filter((i) => i.log_id !== logId));
    try {
      await deleteReviewItem(logId);
      setToast("Entry removed.");
    } catch (e) {
      setItems(snapshot);
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = Boolean(category) || status !== "answered";

  const clearFilters = () => {
    setCategory("");
    setStatus("answered");
  };

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-signal-dim">Session history</p>
        <h1 className="font-display text-3xl text-ink-900 mt-1">Review your answers</h1>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <label className="flex flex-col gap-1">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingState label="Loading review history…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title={filtered ? "No questions match these filters" : "No answered questions yet"}
            subtitle={
              filtered
                ? "Try a different category or status."
                : "Complete some practice questions and your answers will appear here."
            }
          />
          {filtered && (
            <div className="flex justify-center pb-4">
              <button onClick={clearFilters} className="text-sm text-signal hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            const transcript = item.transcript?.trim();
            return (
              <Card key={item.log_id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <Badge tone="neutral">{item.category}</Badge>
                      <span className="text-xs text-ink-600 font-mono">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="font-display text-lg text-ink-900 mb-2">{item.question_text}</p>
                    {item.status === "answered" && (
                      <p className="text-sm text-ink-700 bg-paper rounded-lg p-3 border border-black/5">
                        {transcript || (
                          <span className="italic text-ink-600">
                            No speech was detected in this recording.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.log_id)}
                    disabled={deletingId === item.log_id}
                    aria-label={`Delete answer to: ${item.question_text}`}
                    className="text-xs text-ink-600 hover:text-rose shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === item.log_id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
