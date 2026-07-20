import os
import tempfile
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..vosk_utils import transcribe_audio_file, VoskModelNotFoundError

router = APIRouter(prefix="/api/transcribe", tags=["Transcription"])

# Reject absurdly large uploads (e.g. > 25 MB) to avoid memory issues.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("/{log_id}", response_model=schemas.TranscribeResponse)
async def transcribe_answer(
    log_id: int,
    audio: UploadFile = File(..., description="Recorded audio answer (webm, wav, ogg, m4a, etc.)"),
    db: Session = Depends(get_db),
):

    log = db.query(models.PracticeLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail=f"Practice log {log_id} not found.")

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)

    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            size = 0
            while chunk := await audio.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Audio file is too large (max 25 MB).")
                tmp_file.write(chunk)

        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        try:
            transcript = transcribe_audio_file(tmp_path)
        except VoskModelNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except Exception as e:
            # Covers ffmpeg-not-found and any other audio decoding failures.
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not process the audio file. Make sure ffmpeg is installed "
                    f"and on your PATH. Original error: {e}"
                ),
            )

        if not transcript:
            transcript = ""

        log.transcript = transcript
        log.status = "answered"
        db.commit()

        return schemas.TranscribeResponse(
            log_id=log.id,
            transcript=transcript,
            message="Transcription complete." if transcript else "No speech was detected in the recording.",
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
