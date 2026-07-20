
# Mock-Interview-Hub
Every great career begins with a confident conversation. Practice interviews with an AI coach that helps you think clearly, answer confidently, and grow with every session.

A fully offline Interview Practice Application:

- **Backend:** Python + FastAPI + SQLite
- **Frontend:** React + Vite + Tailwind CSS
- **Speech-to-text:** [Vosk](https://alphacephei.com/vosk/) — runs entirely on your
  machine, no internet connection or cloud API needed once set up.

**Features:**

1. Add, edit, delete, search, and categorize interview questions.
2. Practice sessions that pick a random question at a time with **Skip**
   and **Next** controls.
3. Record and see it transcribed by Vosk immediately.
4. A Review page to read back everything you've answered or skipped.
5. A Statistics dashboard: total/answered/skipped/unanswered questions
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
---

## 4. Run the backend

From `backend/`, with the virtual environment activated:

```bash
uvicorn app.main:app --reload --port 8000
```

## 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```
---

## 6. Troubleshooting

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
