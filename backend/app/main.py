import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import Base, engine
from .routers import questions, practice, transcribe, review, stats
from .vosk_utils import load_model, VoskModelNotFoundError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("interview_practice")


@asynccontextmanager
async def lifespan(app: FastAPI):

    # Create database tables if they don't exist yet.
    Base.metadata.create_all(bind=engine)

    try:
        load_model()
        logger.info("Vosk model loaded successfully.")
    except VoskModelNotFoundError as e:
        logger.warning(
            "Vosk model was not found at startup. Transcription requests will "
            "fail until a model is installed. Details: %s", e
        )
    yield
    # No special shutdown logic needed.


app = FastAPI(
    title="Interview Practice Application API",
    description="Offline interview practice app: manage questions, run practice "
                 "sessions, transcribe spoken answers locally with Vosk, and "
                 "review statistics.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the Vite dev server (default port 5173) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):

    logger.exception("Unhandled error while processing %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Check the backend logs for details."},
    )


app.include_router(questions.router)
app.include_router(practice.router)
app.include_router(transcribe.router)
app.include_router(review.router)
app.include_router(stats.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
