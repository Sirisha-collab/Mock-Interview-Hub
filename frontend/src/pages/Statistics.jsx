import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Card from "../components/Card.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import { getStatistics } from "../api/client.js";

const PIE_COLORS = ["#3DDC97", "#F2A93B", "#E5646B"];

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <LoadingState label="Crunching your numbers…" />;

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-signal-dim">Progress</p>
        <h1 className="font-display text-3xl text-ink-900 mt-1">Statistics dashboard</h1>
      </header>

      <ErrorBanner message={error} onRetry={load} />

      {stats && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <Card className="p-6">
              <p className="eyebrow text-ink-600 mb-4">Question status breakdown</p>
              <div className="flex items-center gap-6">
                <div style={{ width: 160, height: 160 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Answered", value: stats.answered_count },
                          { name: "Skipped", value: stats.skipped_count },
                          { name: "Unanswered", value: stats.unanswered_count },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {PIE_COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  <LegendRow color={PIE_COLORS[0]} label="Answered" value={stats.answered_count} />
                  <LegendRow color={PIE_COLORS[1]} label="Skipped" value={stats.skipped_count} />
                  <LegendRow color={PIE_COLORS[2]} label="Unanswered" value={stats.unanswered_count} />
                  <p className="text-ink-600 pt-2 border-t border-black/5 mt-2">
                    {stats.total_questions} total questions
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="eyebrow text-ink-600 mb-4">Practice streaks</p>
              <div className="flex gap-8 mb-4">
                <div>
                  <p className="font-display text-4xl text-ink-900">{stats.current_streak_days}</p>
                  <p className="text-sm text-ink-600 mt-1">current streak (days)</p>
                </div>
                <div>
                  <p className="font-display text-4xl text-ink-900">{stats.longest_streak_days}</p>
                  <p className="text-sm text-ink-600 mt-1">longest streak (days)</p>
                </div>
              </div>
              <p className="text-sm text-ink-600">
                Most practiced category:{" "}
                <span className="font-medium text-ink-900">
                  {stats.most_practiced_category || "—"}
                </span>
              </p>
              <p className="text-sm text-ink-600 mt-1">
                Least practiced category:{" "}
                <span className="font-medium text-ink-900">
                  {stats.least_practiced_category || "—"}
                </span>
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <p className="eyebrow text-ink-600 mb-4">Questions and attempts by category</p>
            {stats.category_breakdown.length === 0 ? (
              <p className="text-sm text-ink-600">Add some questions to see category breakdowns.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.category_breakdown} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e2da" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total_questions" name="Questions" fill="#2A3947" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="times_practiced" name="Times practiced" fill="#3DDC97" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-ink-700">{label}</span>
      <span className="ml-auto font-medium text-ink-900">{value}</span>
    </div>
  );
}
