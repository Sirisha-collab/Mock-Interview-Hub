
# Mock-Interview-Hub
Every great career begins with a confident conversation. Practice interviews with an AI coach that helps you think clearly, answer confidently, and grow with every session.

A fully offline Interview Practice Application:

- **Backend:** Python + FastAPI + SQLite
- **Frontend:** React + Vite + Tailwind CSS
- **Speech-to-text:** [Vosk](https://alphacephei.com/vosk/) — runs entirely on your
  machine, no internet connection or cloud API needed once set up.

Features:

1. Add, edit, delete, search, and categorize interview questions.
2. Practice sessions that pick a random question at a time, never repeating a
   question until every question in the bank has been asked, with **Skip**
   and **Next** controls.
3. Record your spoken answer straight from the browser, send it to the local
   FastAPI backend, and see it transcribed by Vosk immediately.
4. A Review page to read back everything you've answered or skipped.
5. A Statistics dashboard: total/answered/skipped/unanswered questions, most
   and least practiced categories, and daily practice streaks.
6. A clean, responsive UI across five pages: Dashboard, Questions, Practice,
   Review, and Statistics.

---

## 1. Prerequisites

Install these once, before anything else:

| Tool | Minimum version | Check with |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| ffmpeg | any recent version | `ffmpeg -version` |

**Installing ffmpeg** (required so the backend can convert your recorded
audio into the format Vosk expects):

- **Windows:** `winget install ffmpeg` (or download from
  https://www.gyan.dev/ffmpeg/builds/ and add the `bin` folder to your PATH)
- **macOS:** `brew install ffmpeg`
- **Linux (Debian/Ubuntu):** `sudo apt install ffmpeg`

You will also need a **microphone** and a browser that supports the
`MediaRecorder` API (Chrome, Edge, or Firefox all work well). Because the app
runs on `http://localhost`, browsers treat it as a "secure context," so
microphone access works without HTTPS.

---

## 2. Project structure

```
interview-practice-app/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint
│   │   ├── database.py        # SQLite/SQLAlchemy setup
│   │   ├── models.py          # ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── vosk_utils.py      # Vosk model loading + transcription
│   │   └── routers/
│   │       ├── questions.py   # CRUD, search, categories
│   │       ├── practice.py    # random no-repeat question selection
│   │       ├── transcribe.py  # audio upload -> Vosk -> transcript
│   │       ├── review.py      # review past answers
│   │       └── stats.py       # statistics dashboard
│   ├── requirements.txt
│   └── vosk-model/            # you create this — see Step 4
└── frontend/
    ├── src/
    │   ├── pages/              # Dashboard, Questions, Practice, Review, Statistics
    │   ├── components/         # Sidebar, Card, Badge, Modal, Feedback
    │   └── api/client.js       # all HTTP calls to the backend
    ├── package.json
    └── vite.config.js
```

---

## 3. Backend setup (FastAPI)

Open a terminal in VS Code (`` Ctrl+` `` / `` Cmd+` ``) and run:

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv

# macOS/Linux:
source venv/bin/activate
# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

> **VS Code tip:** After creating the venv, run "Python: Select Interpreter"
> from the Command Palette and choose `backend/venv`, so IntelliSense and the
> integrated terminal both use the right environment.

---

## 4. Download the offline Vosk speech model

Vosk needs a language model on disk. This is a one-time download.

1. Go to https://alphacephei.com/vosk/models
2. Download a small English model — **`vosk-model-small-en-us-0.15`**
   (~40 MB) is a good starting point for everyday use. For higher accuracy
   (at the cost of a larger download and more memory), use
   `vosk-model-en-us-0.22` instead.
3. Unzip it.
4. Rename (or copy) the unzipped folder to `backend/vosk-model`, so that this
   file exists:
   ```
   backend/vosk-model/README
   backend/vosk-model/am/
   backend/vosk-model/conf/
   ...
   ```

If you'd rather keep the model somewhere else, set an environment variable
instead of moving it:

```bash
export VOSK_MODEL_PATH=/path/to/vosk-model-small-en-us-0.15   # macOS/Linux
setx VOSK_MODEL_PATH "C:\path\to\vosk-model-small-en-us-0.15"  # Windows
```

If the model isn't found, the backend still starts up normally (you'll see a
warning in the terminal), and every other feature keeps working — you'll just
get a clear error message if you try to record an answer until the model is
in place.

---

## 5. Run the backend

From `backend/`, with the virtual environment activated:

```bash
uvicorn app.main:app --reload --port 8000
```

You should see log output ending in something like:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:interview_practice:Vosk model loaded successfully.
INFO:     Application startup complete.
```

Leave this terminal running. You can browse to
http://localhost:8000/docs to see interactive API documentation
(Swagger UI) for every endpoint.

The SQLite database file (`interview_practice.db`) is created automatically
in `backend/` the first time you run the app — no manual setup needed.

---

## 6. Run the frontend

Open a **second** terminal in VS Code:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL, typically:

```
  VITE ready
  ➜  Local:   http://localhost:5173/
```

Open that URL in your browser. The frontend is pre-configured to talk to the
backend at `http://localhost:8000` (see `frontend/src/api/client.js` if you
ever need to change that).

---

## 7. Using the app

1. **Questions** — add your interview questions and tag each with a category
   (e.g. Behavioral, Technical, System Design). You can search, filter by
   category, edit, or delete questions at any time.
2. **Practice** — click **Start practicing** from the Dashboard, or open the
   Practice page directly. A random question appears. Click the round mic
   button to start recording, click it again (it turns red while recording)
   to stop — your answer is uploaded and transcribed automatically, and the
   text appears right below the recorder. Use **Skip question** to move on
   without answering, or **Next question →** after answering. Once every
   question has been shown, the app automatically reshuffles and starts a new
   cycle. **Reset practice cycle** clears progress early if you want to start
   over.
3. **Review** — browse everything you've answered or skipped, filterable by
   status and category.
4. **Statistics** — see totals, a status breakdown chart, category
   breakdown, and your current/longest daily practice streaks.

---

## 8. Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| "Could not reach the backend" banner in the UI | The FastAPI server isn't running, or is running on a different port. Confirm `uvicorn` is active on port 8000. |
| Microphone button shows a permissions error | Your browser blocked microphone access for `localhost`. Check the site permissions icon in the address bar and allow the microphone, then reload. |
| Transcription fails with a "Vosk model not found" style error | The `backend/vosk-model` folder is missing or misnamed. Revisit Step 4. |
| Transcription fails mentioning ffmpeg | ffmpeg isn't installed or isn't on your PATH. Revisit the Prerequisites section, then restart the backend terminal so it picks up the updated PATH. |
| Transcript comes back empty | Vosk didn't detect speech in the recording — try speaking closer to the mic, check your input device, or try a longer/clearer answer. |
| CORS errors in the browser console | You're running the frontend on a port other than 5173. Either use the default port, or add your dev URL to the `allow_origins` list in `backend/app/main.py`. |
| Port 8000 or 5173 already in use | Stop whatever else is using that port, or run `uvicorn app.main:app --reload --port 8001` (and update `API_BASE_URL` in `frontend/src/api/client.js` to match). |

  you start the server.
>>>>>>> dbb6c6d (Initial commit)
