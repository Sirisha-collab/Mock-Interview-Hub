# Retry / revision feature — wiring it in

Matched to your actual `models.py` and `practice.py`, including the `/api`
router prefix.

## Does anything existing change? No.

`Base.metadata.create_all` only creates tables that are **missing**. It never
alters or drops one that already exists.

| Table | What happens |
|---|---|
| `questions` | untouched, all rows kept |
| `practice_logs` | untouched, all rows kept |
| `session_state` | untouched, your current cycle survives |
| `retry_questions` | **created**, empty |

No migration, no Alembic, no deleting `app.db`. The one line added inside the
existing `Question` class is a `relationship()` — ORM-level only, no column, no
DDL.

---

## 1. `backend/app/models.py`

Append the `RetryQuestion` class from `models_addition.py`, and add the single
`retries = relationship(...)` line inside `Question`, next to `logs`. Every
import it needs (`Column`, `Integer`, `Text`, `DateTime`, `ForeignKey`,
`relationship`, `utcnow`) is already at the top of your file.

## 2. `backend/app/routers/retry.py`

New file, drop it in as-is. Prefix is `/api/retry` to sit alongside
`/api/practice`. Response models live inside the file rather than in
`schemas.py`, so the whole feature is one deletable unit.

## 3. `backend/app/main.py`

```python
from .routers import questions, practice, transcribe, review, stats, retry
...
app.include_router(retry.router)
```

Restart uvicorn and check `http://localhost:8000/docs` for the **Retry** tag.

## 4. `frontend/src/api/client.js`

Six calls. Use the same base your existing `/api/practice/next` call uses —
if that's written as `${API_BASE}/api/practice/next`, keep the `/api` below; if
`API_BASE` already ends in `/api`, drop it from these paths.

```js
export async function listRetryQuestions() {
  const res = await fetch(`${API_BASE}/api/retry`);
  if (!res.ok) throw new Error("Could not load your revision list.");
  return res.json();
}

export async function getRetryIds() {
  const res = await fetch(`${API_BASE}/api/retry/ids`);
  if (!res.ok) throw new Error("Could not load your revision list.");
  return res.json();
}

export async function markForRetry(questionId, reason = null) {
  const res = await fetch(`${API_BASE}/api/retry/${questionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Could not save that question for revision.");
  return res.json();
}

export async function unmarkRetry(questionId) {
  const res = await fetch(`${API_BASE}/api/retry/${questionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove that question from revision.");
  return res.json();
}

export async function clearRetryPool() {
  const res = await fetch(`${API_BASE}/api/retry`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not clear your revision list.");
  return res.json();
}

export async function startRetryAttempt(questionId) {
  const res = await fetch(`${API_BASE}/api/retry/${questionId}/attempt`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Could not start that revision question.");
  return res.json();
}
```

## 5. Frontend files

| File | Action |
|---|---|
| `src/components/AnswerRecorder.jsx` | new — the mic panel, lifted out of Practice |
| `src/pages/Practice.jsx` | replace — shorter, plus the retry button |
| `src/pages/Retry.jsx` | new — the revision list and session |

Route (likely `App.jsx`):

```jsx
import Retry from "./pages/Retry.jsx";
...
<Route path="/retry" element={<Retry />} />
```

Sidebar entry, alongside the others:

```jsx
{ to: "/retry", label: "Revision" }
```

---

## Endpoint summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/retry` | the revision list, with question text |
| GET | `/api/retry/ids` | ids only, so Practice can light up its button |
| POST | `/api/retry/{question_id}` | add a question (idempotent) |
| DELETE | `/api/retry/{question_id}` | remove one |
| DELETE | `/api/retry` | clear the list |
| POST | `/api/retry/{question_id}/attempt` | open a log row for recording |

---

## How it behaves

**During practice** — a question you can't answer takes one click:
*Couldn't answer — save for retry*. It goes into the pool, `POST
/api/practice/skip/{log_id}` fires so your existing stats stay honest, and the
next question loads. If it's already in the pool the button flips to *Remove
from revision*.

**On the Revision page** — the saved questions in one list. *Practice this*
drills one; *Start revision session* shuffles the pool and runs it end to end
with the full record → Vosk flow. Each question offers *Still shaky — keep it*
or *Got it — remove from revision*, so the list shrinks as you learn.

## Three notes on how this sits with your existing logic

**`SessionState` is never touched by revision.** `next_question` pops an id out
of `remaining_ids`; `/api/retry/{id}/attempt` deliberately does not. Revising a
question does not consume it from your main cycle, so the two progress counters
stay independent — which is the behaviour you want, since a question you're
stuck on should still come round again normally.

**`practice_logs` stays clean.** The revision session creates a log row only at
the moment you press record. Browsing past three questions writes nothing.

**Revision answers appear in Review and Statistics.** They're ordinary
`practice_logs` rows, so a revision answer counts as answered like any other. If
you'd rather keep them apart, that needs a `source` column on `practice_logs` —
a real schema change on an existing table, unlike everything above. Say the word
and I'll write it with the `ALTER TABLE`.
