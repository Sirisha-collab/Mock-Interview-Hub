
import json
import os
import wave
import tempfile
from vosk import Model, KaldiRecognizer
from dotenv import load_dotenv
from pydub import AudioSegment

load_dotenv()

VOSK_MODEL_PATH = os.getenv("VOSK_MODEL_PATH")
print(f"VOSK_MODEL_PATH: {VOSK_MODEL_PATH}")

_model: Model | None = None

class VoskModelNotFoundError(Exception):
    pass


def load_model():
    global _model

    if _model is not None:
        return _model

    if not VOSK_MODEL_PATH:
        raise VoskModelNotFoundError(
            "VOSK_MODEL_PATH is not set in environment variables"
        )

    if not os.path.exists(VOSK_MODEL_PATH):
        raise VoskModelNotFoundError(
            f"Vosk model not found at: {VOSK_MODEL_PATH}"
        )

    _model = Model(VOSK_MODEL_PATH)

    return _model


def get_model() -> Model:
    if _model is None:
        return load_model()
    return _model

def _convert_to_wav(input_path: str) -> str:

    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)

    audio = audio.normalize() # added to convert audio to text properly
    wav_fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(wav_fd)
    audio.export(wav_path, format="wav")
    return wav_path


def transcribe_audio_file(input_path: str) -> str:

    model = get_model()
    wav_path = _convert_to_wav(input_path)

    try:
        wf = wave.open(wav_path, "rb")
        recognizer = KaldiRecognizer(model, wf.getframerate())
        recognizer.SetWords(False)

        results = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                partial = json.loads(recognizer.Result())
                if partial.get("text"):
                    results.append(partial["text"])

        final = json.loads(recognizer.FinalResult())
        if final.get("text"):
            results.append(final["text"])

        wf.close()
        return " ".join(results).strip()
    finally:

        if os.path.exists(wav_path):
            os.remove(wav_path)
