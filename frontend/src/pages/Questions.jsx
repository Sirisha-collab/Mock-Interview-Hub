import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";
import { ErrorBanner, LoadingState, EmptyState, Toast } from "../components/Feedback.jsx";
import {
  getQuestions,
  getCategories,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../api/client.js";

const categories = ["NLP", "LLM", "DL", "ML"];

const CATEGORY_COLORS = [
  "bg-signal-soft text-signal-dim",
  "bg-amber-soft text-amber",
  "bg-rose-soft text-rose",
  "bg-ink-800/5 text-ink-800",
];

function categoryColor(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

//Bulk Upload
function BulkUploadForm({ onCancel, onSaved }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // { total, created, skipped }

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please paste at least one question.");
      return;
    }

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setError("No valid questions found. Make sure each question is on a separate line.");
      return;
    }

    setUploading(true);
    setError("");
    let created = 0;
    let skipped = 0;

    for (const questionText of lines) {
      try {
        await createQuestion({ text: questionText, category });
        created++;
      } catch (err) {
        console.error(`Failed to create question: ${err.message}`);
        skipped++;
      }
    }

    setUploading(false);
    setResults({ total: lines.length, created, skipped });

    // Auto-close after 2 seconds
    setTimeout(() => {
      onSaved();
    }, 2000);
  };

  if (results) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">✓</p>
        <p className="font-display text-lg text-ink-900 mb-2">Import complete!</p>
        <p className="text-sm text-ink-700">
          <span className="font-medium text-signal-dim">{results.created}</span> questions added
          {results.skipped > 0 && (
            <>
              {" "}
              (
              <span className="font-medium text-amber">{results.skipped}</span> skipped due to errors)
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />
      <div>
        <label className="text-sm font-medium text-ink-800 block mb-1.5">Questions</label>
        <p className="text-xs text-ink-600 mb-2">
          Paste your questions below, one per line. They'll all be assigned to the selected category.
        </p>
        <textarea
          className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-signal focus:border-signal outline-none min-h-[200px] font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Example:\nTell me about a time you resolved a conflict\nHow do you approach learning new technologies?\nDescribe your experience with large-scale systems`}
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-800 block mb-1.5">Category</label>
        <select
          className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-signal focus:border-signal outline-none bg-white"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 disabled:opacity-60"
        >
          {uploading ? "Importing…" : "Import questions"}
        </button>
      </div>
    </form>
  );
}

//To add questions
function QuestionForm({ initial, onCancel, onSaved }) {
  const [text, setText] = useState(initial?.text || "");
  const [category, setCategory] = useState(initial?.category || "NLP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Question text cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (initial) {
        await updateQuestion(initial.id, { text, category: category || "NLP" });
      } else {
        await createQuestion({ text, category: category || "NLP" });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />
      <div>
        <label className="text-sm font-medium text-ink-800 block mb-1.5">Question</label>
        <textarea
          className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-signal focus:border-signal outline-none min-h-[100px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Tell me about a time you resolved a conflict on a team."
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-800 block mb-1.5">Category</label>
        <select
          className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-signal focus:border-signal outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="NLP">NLP</option>
          <option value="LLM">LLM</option>
          <option value="DL">DL</option>
          <option value="ML">ML</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Add question"}
        </button>
      </div>
    </form>
  );
}

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | "create" | question object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [q, c] = await Promise.all([
        getQuestions({ search: search || undefined, category: categoryFilter || undefined }),
        getCategories(),
      ]);
      setQuestions(q);
      setCategories(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  const handleSaved = (message) => {
    setModalMode(null);
    setToast(message);
    load();
  };

  const confirmDelete = async () => {
    try {
      await deleteQuestion(deleteTarget.id);
      setToast("Question deleted.");
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    }
  };

  const grouped = useMemo(() => questions, [questions]);

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow text-signal-dim">Question bank</p>
          <h1 className="font-display text-3xl text-ink-900 mt-1">Your questions</h1>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => setModalMode("create")}
            className="px-4 py-2.5 text-sm font-medium bg-ink-950 text-paper rounded-lg hover:bg-ink-900 self-start"
          >
            + Add question
          </button>
          <button
            type="button"
            onClick={() => setModalMode("bulk")}
            className="px-4 py-2.5 text-sm font-medium border border-black/10 text-ink-700 rounded-lg hover:bg-paper"
          >
            ⬆ Bulk import
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search question text…"
          className="flex-1 border border-black/10 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-signal focus:border-signal outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
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
        <LoadingState label="Loading questions…" />
      ) : grouped.length === 0 ? (
        <Card>
          <EmptyState
            title="No questions found"
            subtitle="Add your first interview question to start building your practice bank."
            action={
              <button
                onClick={() => setModalMode("create")}
                className="px-4 py-2 text-sm font-medium bg-ink-950 text-paper rounded-lg"
              >
                + Add question
              </button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-600 eyebrow border-b border-black/5">
                <th className="px-5 py-3 font-medium">Question</th>
                <th className="px-5 py-3 font-medium w-40">Category</th>
                <th className="px-5 py-3 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((q) => (
                <tr key={q.id} className="border-b border-black/5 last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-4 text-ink-900 align-top max-w-md">{q.text}</td>
                  <td className="px-5 py-4 align-top">
                    <Badge className={categoryColor(q.category)}>{q.category}</Badge>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex justify-end gap-3 text-ink-600">
                      <button
                        onClick={() => setModalMode(q)}
                        className="hover:text-ink-900"
                        aria-label={`Edit question ${q.id}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(q)}
                        className="hover:text-rose"
                        aria-label={`Delete question ${q.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalMode && (
        <Modal
          title={
            modalMode === "create"
              ? "Add a question"
              : modalMode === "bulk"
                ? "Bulk import questions"
                : "Edit question"
          }
          onClose={() => setModalMode(null)}
        >
          {modalMode === "bulk" ? (
            <BulkUploadForm
              onCancel={() => setModalMode(null)}
              onSaved={() => {
                setModalMode(null);
                load();
              }}
            />
          ) : (
            <QuestionForm
              initial={modalMode === "create" ? null : modalMode}
              onCancel={() => setModalMode(null)}
              onSaved={() => handleSaved(modalMode === "create" ? "Question added." : "Question updated.")}
            />
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete this question?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-ink-700 mb-5">
            This will permanently remove "{deleteTarget.text}" and all of its practice history.
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium bg-rose text-white rounded-lg hover:opacity-90"
            >
              Delete question
            </button>
          </div>
        </Modal>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
