import { useEffect, useState } from "react";
import Card from "../components/Card.jsx";
import Badge, { statusBadge } from "../components/Badge.jsx";
import { ErrorBanner, LoadingState, EmptyState, Toast } from "../components/Feedback.jsx";
import { getReviewItems, deleteReviewItem, getCategories } from "../api/client.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "answered", label: "Answered" },
  { value: "skipped", label: "Skipped" },
  { value: "shown", label: "Shown, not resolved" },
];

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Review() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reviewItems, cats] = await Promise.all([
        getReviewItems({ status: status || undefined, category: category || undefined }),
        getCategories(),
      ]);
      setItems(reviewItems);
      setCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category]);

  const handleDelete = async (logId) => {
    try {
      await deleteReviewItem(logId);
      setToast("Entry removed.");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-signal-dim">Session history</p>
        <h1 className="font-display text-3xl text-ink-900 mt-1">Review your answers</h1>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-black/10 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-signal focus:border-signal outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-black/10 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-signal focus:border-signal outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <LoadingState label="Loading review history…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing to review yet"
            subtitle="Practice a few questions and your answered and skipped questions will show up here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = statusBadge(item.status);
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
                        {item.transcript || (
                          <span className="italic text-ink-600">
                            No speech was detected in this recording.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.log_id)}
                    className="text-xs text-ink-600 hover:text-rose shrink-0"
                  >
                    Delete
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
