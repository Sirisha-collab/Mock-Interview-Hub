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
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import Card from "../components/Card.jsx";
import { ErrorBanner, LoadingState } from "../components/Feedback.jsx";
import { getStatistics } from "../api/client.js";

// Pulled out of the JSX so the chart, the legend and the KPI tiles can never
// drift apart on colour.
const C = {
  answered: "#3DDC97",
  skipped: "#F2A93B",
  unanswered: "#E5646B",
  ink: "#2A3947",
  grid: "#e5e2da",
};

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

  const total = stats?.total_questions || 0;
  const answered = stats?.answered_count || 0;
  const skipped = stats?.skipped_count || 0;
  const unanswered = stats?.unanswered_count || 0;
  const completion = total > 0 ? Math.round((answered / total) * 100) : 0;
  const attempted = answered + skipped;

  // Current streak as a share of your best ever — gives the number something to
  // measure itself against instead of floating on its own.
  const streakRatio =
    stats && stats.longest_streak_days > 0
      ? Math.min(100, Math.round((stats.current_streak_days / stats.longest_streak_days) * 100))
      : 0;

  const pieData = [
    { name: "Answered", value: answered, color: C.answered },
    { name: "Skipped", value: skipped, color: C.skipped },
    { name: "Unanswered", value: unanswered, color: C.unanswered },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow text-signal-dim">Progress</p>
          <h1 className="font-display text-3xl text-ink-900 mt-1">Statistics dashboard</h1>
        </div>
        <button
          onClick={load}
          className="text-sm font-medium text-ink-600 hover:text-ink-900 self-start"
        >
          ↻ Refresh
        </button>
      </header>

      <ErrorBanner message={error} onRetry={load} />

      {stats && (
        <>
          {/* ---------------------------------------------------- KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatTile
              label="Total questions"
              value={total}
              accent={C.ink}
              footnote={`${attempted} attempted`}
            />
            <StatTile
              label="Answered"
              value={answered}
              accent={C.answered}
              footnote={total > 0 ? `${Math.round((answered / total) * 100)}% of bank` : "—"}
            />
            <StatTile
              label="Skipped"
              value={skipped}
              accent={C.skipped}
              footnote={attempted > 0 ? `${Math.round((skipped / attempted) * 100)}% of attempts` : "—"}
            />
            <StatTile
              label="Current streak"
              value={stats.current_streak_days}
              accent={C.unanswered}
              footnote={`best ${stats.longest_streak_days}`}
              suffix={stats.current_streak_days === 1 ? "day" : "days"}
            />
          </div>

          {/* --------------------------------------- coverage + streak row */}
          <div className="grid lg:grid-cols-5 gap-5 mb-5">
            {/* Donut, with the hole finally doing some work */}
            <Card className="p-6 lg:col-span-3">
              <div className="flex items-start justify-between mb-2">
                <p className="eyebrow text-ink-600">Question status</p>
                <span className="text-xs text-ink-500">{total} in bank</span>
              </div>

              {total === 0 ? (
                <EmptyNote>Add some questions to see your breakdown.</EmptyNote>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-7">
                  <div className="relative shrink-0" style={{ width: 176, height: 176 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={84}
                          paddingAngle={3}
                          cornerRadius={6}
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                          animationDuration={700}
                        >
                          {pieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip total={total} />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centre label sits above the SVG rather than inside it —
                        easier to style and it stays crisp at any size. */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-display text-3xl text-ink-900 leading-none">
                        {completion}%
                      </span>
                      <span className="text-[11px] text-ink-500 mt-1 tracking-wide">
                        answered
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <SegmentBar
                      segments={[
                        { value: answered, color: C.answered },
                        { value: skipped, color: C.skipped },
                        { value: unanswered, color: C.unanswered },
                      ]}
                      total={total}
                    />
                    <div className="mt-4 space-y-2.5">
                      <LegendRow color={C.answered} label="Answered" value={answered} total={total} />
                      <LegendRow color={C.skipped} label="Skipped" value={skipped} total={total} />
                      <LegendRow
                        color={C.unanswered}
                        label="Unanswered"
                        value={unanswered}
                        total={total}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Streak, as a ring against your personal best */}
            <Card className="p-6 lg:col-span-2 flex flex-col">
              <p className="eyebrow text-ink-600 mb-2">Practice streak</p>

              <div className="flex items-center gap-5">
                <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
                  <ResponsiveContainer>
                    <RadialBarChart
                      innerRadius="72%"
                      outerRadius="100%"
                      data={[{ value: streakRatio, fill: C.answered }]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar
                        background={{ fill: C.grid }}
                        dataKey="value"
                        cornerRadius={10}
                        animationDuration={700}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display text-3xl text-ink-900 leading-none">
                      {stats.current_streak_days}
                    </span>
                    <span className="text-[11px] text-ink-500 mt-1">
                      {stats.current_streak_days === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-ink-600">Longest run</p>
                  <p className="font-display text-2xl text-ink-900 mt-0.5">
                    {stats.longest_streak_days}
                    <span className="text-sm text-ink-500 font-sans ml-1.5">
                      {stats.longest_streak_days === 1 ? "day" : "days"}
                    </span>
                  </p>
                  <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                    {stats.current_streak_days === 0
                      ? "Practice today to start a new run."
                      : stats.current_streak_days >= stats.longest_streak_days
                      ? "You're at your personal best."
                      : `${stats.longest_streak_days - stats.current_streak_days} more to match your best.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-black/5 space-y-2.5">
                <CategoryPill
                  label="Most practiced"
                  value={stats.most_practiced_category}
                  color={C.answered}
                />
                <CategoryPill
                  label="Least practiced"
                  value={stats.least_practiced_category}
                  color={C.skipped}
                />
              </div>
            </Card>
          </div>

          {/* ------------------------------------------- category breakdown */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="eyebrow text-ink-600">By category</p>
                <p className="text-xs text-ink-500 mt-1">
                  Questions in the bank against how often you've practised them.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-ink-600">
                <SwatchLabel color={C.ink} label="Questions" />
                <SwatchLabel color={C.answered} label="Times practiced" />
              </div>
            </div>

            {stats.category_breakdown.length === 0 ? (
              <EmptyNote>Add some questions to see category breakdowns.</EmptyNote>
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={stats.category_breakdown}
                    barGap={6}
                    margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient id="gradQuestions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.ink} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={C.ink} stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="gradPracticed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.answered} stopOpacity={1} />
                        <stop offset="100%" stopColor={C.answered} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={C.grid} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: C.grid }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(42,57,71,0.05)" }}
                      content={<ChartTooltip />}
                    />
                    <Bar
                      dataKey="total_questions"
                      name="Questions"
                      fill="url(#gradQuestions)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={38}
                      animationDuration={700}
                    />
                    <Bar
                      dataKey="times_practiced"
                      name="Times practiced"
                      fill="url(#gradPracticed)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={38}
                      animationDuration={700}
                      animationBegin={120}
                    />
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

/* -------------------------------------------------------------- partials */

function StatTile({ label, value, accent, footnote, suffix }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      {/* thin accent rule, the only colour the tile needs */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <p className="eyebrow text-ink-600">{label}</p>
      <p className="font-display text-3xl text-ink-900 mt-2 leading-none">
        {value}
        {suffix && <span className="text-sm text-ink-500 font-sans ml-1.5">{suffix}</span>}
      </p>
      {footnote && <p className="text-xs text-ink-500 mt-2">{footnote}</p>}
    </Card>
  );
}

function SegmentBar({ segments, total }) {
  if (!total) return null;
  return (
    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-black/5">
      {segments.map((s, i) =>
        s.value > 0 ? (
          <span
            key={i}
            className="h-full transition-all duration-500"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
          />
        ) : null
      )}
    </div>
  );
}

function LegendRow({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-700">{label}</span>
      <span className="ml-auto font-medium text-ink-900 tabular-nums">{value}</span>
      <span className="text-xs text-ink-500 w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

function CategoryPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-ink-600">{label}</span>
      <span className="ml-auto font-medium text-ink-900 truncate max-w-[55%]">
        {value || "—"}
      </span>
    </div>
  );
}

function SwatchLabel({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function EmptyNote({ children }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-ink-600">{children}</p>
    </div>
  );
}

// One tooltip for both charts, styled to match the cards instead of recharts'
// default white box.
function ChartTooltip({ active, payload, label, total }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-black/10 bg-white shadow-lg px-3 py-2">
      {label && <p className="text-xs font-medium text-ink-900 mb-1.5">{label}</p>}
      {payload.map((p, i) => {
        const value = p.value;
        const name = p.name || p.payload?.name;
        const color = p.color || p.payload?.color || p.payload?.fill;
        const pct = total ? ` · ${Math.round((value / total) * 100)}%` : "";
        return (
          <p key={i} className="flex items-center gap-2 text-xs text-ink-700">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span>{name}</span>
            <span className="ml-auto font-medium text-ink-900 tabular-nums">
              {value}
              {pct}
            </span>
          </p>
        );
      })}
    </div>
  );
}
