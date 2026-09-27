"""Safe local configuration checks; no credential refresh or provider requests."""
import inspect
import os
from pathlib import Path


def provider_status():
    missing = [key for key in ("GOOGLE_CLOUD_PROJECT", "GEMINI_MODEL") if not os.environ.get(key, "").strip()]
    try:
        from google import genai
        if "enterprise" not in inspect.signature(genai.Client).parameters:
            missing.append("compatible google-genai SDK")
    except ImportError:
        missing.append("google-genai SDK")
    credentials = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    adc_root = Path(os.environ.get("CLOUDSDK_CONFIG") or (Path(os.environ.get("APPDATA", Path.home() / ".config")) / "gcloud"))
    credential_file = Path(credentials) if credentials else adc_root / "application_default_credentials.json"
    if not credential_file.is_file():
        missing.append("Google application default credentials")
    eleven_missing = [key for key in ("ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID") if not os.environ.get(key, "").strip()]
    return {
        "gemini": {"configured": not missing, "missing": missing, "authenticationVerified": False},
        "elevenlabs": {"configured": not eleven_missing, "missing": eleven_missing, "authenticationVerified": False},
    }
