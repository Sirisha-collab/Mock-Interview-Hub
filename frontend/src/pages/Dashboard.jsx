import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import { getStatistics } from "../api/client.js";

const TONE_TEXT_CLASSES = {
  "ink-900": "text-ink-900",
  "signal-dim": "text-signal-dim",
  amber: "text-amber",
  rose: "text-rose",
};

function StatTile({ label, value, tone = "ink-900" }) {
  return (
    <Card className="px-5 py-5">
      <p className="eyebrow text-ink-600">{label}</p>
      <p className={`font-display text-4xl mt-2 ${TONE_TEXT_CLASSES[tone] || TONE_TEXT_CLASSES["ink-900"]}`}>
        {value}
      </p>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStatistics();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow text-signal-dim">Studio overview</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink-900 mt-1">
          Good to see you back at the mic.
        </h1>
        <p className="text-ink-600 mt-2 max-w-xl">
          Track your question bank, jump into a practice round, and keep an eye on your
          progress — all running locally, fully offline.
        </p>
      </header>

      <ErrorBanner message={error} onRetry={load} />
      {loading ? (
        <LoadingState label="Loading your stats…" />
      ) : (
        stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatTile label="Total questions" value={stats.total_questions} />
              <StatTile label="Answered" value={stats.answered_count} tone="signal-dim" />
              <StatTile label="Skipped" value={stats.skipped_count} tone="amber" />
              <StatTile label="Unanswered" value={stats.unanswered_count} tone="rose" />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="p-6 md:col-span-2">
                <p className="eyebrow text-ink-600 mb-3">Practice streak</p>
                <div className="flex items-end gap-6">
                  <div>
                    <p className="font-display text-5xl text-ink-900">
                      {stats.current_streak_days}
                    </p>
                    <p className="text-sm text-ink-600 mt-1">day current streak</p>
                  </div>
                  <div className="border-l border-black/10 pl-6">
                    <p className="font-display text-3xl text-ink-900">
                      {stats.longest_streak_days}
                    </p>
                    <p className="text-sm text-ink-600 mt-1">longest streak</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 flex flex-col justify-between">
                <div>
                  <p className="eyebrow text-ink-600 mb-2">Most practiced</p>
                  <p className="font-display text-xl text-ink-900">
                    {stats.most_practiced_category || "—"}
                  </p>
                  <p className="eyebrow text-ink-600 mt-4 mb-2">Least practiced</p>
                  <p className="font-display text-xl text-ink-900">
                    {stats.least_practiced_category || "—"}
                  </p>
                </div>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Link to="/practice">
                <Card className="p-6 hover:-translate-y-0.5 transition-transform h-full">
                  <p className="font-display text-lg text-ink-900">Start practicing</p>
                  <p className="text-sm text-ink-600 mt-1">
                    Jump into a randomized round of questions.
                  </p>
                </Card>
              </Link>
              <Link to="/questions">
                <Card className="p-6 hover:-translate-y-0.5 transition-transform h-full">
                  <p className="font-display text-lg text-ink-900">Manage questions</p>
                  <p className="text-sm text-ink-600 mt-1">
                    Add, edit, or organize your question bank.
                  </p>
                </Card>
              </Link>
              <Link to="/review">
                <Card className="p-6 hover:-translate-y-0.5 transition-transform h-full">
                  <p className="font-display text-lg text-ink-900">Review answers</p>
                  <p className="text-sm text-ink-600 mt-1">
                    Read back what you said in past sessions.
                  </p>
                </Card>
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
}
