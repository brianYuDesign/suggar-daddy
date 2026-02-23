import base64
import io
import logging
import time
from typing import Optional, Tuple

import numpy as np
import requests
from PIL import Image

logger = logging.getLogger(__name__)

_model = None


def _load_model():
    """Lazy-load the opennsfw2 model on first request."""
    global _model
    if _model is None:
        logger.info("Loading opennsfw2 model (first request)...")
        import opennsfw2

        _model = opennsfw2
        logger.info("opennsfw2 model loaded successfully")
    return _model


def _image_from_url(url: str) -> Image.Image:
    """Download an image from a URL and return a PIL Image."""
    response = requests.get(url, timeout=10, stream=True)
    response.raise_for_status()
    return Image.open(io.BytesIO(response.content)).convert("RGB")


def _image_from_base64(data: str) -> Image.Image:
    """Decode a base64 string and return a PIL Image."""
    # Strip optional data-URI prefix (e.g. "data:image/png;base64,")
    if "," in data:
        data = data.split(",", 1)[1]
    image_bytes = base64.b64decode(data)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def _categorize(score: float) -> Tuple[str, bool]:
    """Return (category, safe) based on the NSFW score."""
    if score < 0.5:
        return "safe", True
    elif score < 0.8:
        return "suggestive", False
    else:
        return "nsfw", False


def predict(
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
) -> dict:
    """
    Run NSFW detection on an image supplied via URL or base64.

    Returns a dict with keys: nsfw_score, category, safe, processing_time_ms.
    Raises ValueError for invalid / unreadable images.
    """
    start = time.time()

    # Load image
    try:
        if image_url:
            image = _image_from_url(image_url)
        elif image_base64:
            image = _image_from_base64(image_base64)
        else:
            raise ValueError("Either image_url or image_base64 must be provided")
    except (requests.RequestException, base64.binascii.Error) as exc:
        raise ValueError(f"Failed to load image: {exc}") from exc
    except Exception as exc:
        raise ValueError(f"Invalid image data: {exc}") from exc

    # Resize to the size expected by opennsfw2 (224x224)
    image_resized = image.resize((224, 224))
    img_array = np.array(image_resized, dtype=np.float32)
    # opennsfw2.preprocess_image expects (H, W, 3) or a batch
    img_array = np.expand_dims(img_array, axis=0)

    # Run prediction
    nsfw2 = _load_model()
    predictions = nsfw2.predict_image(image)
    nsfw_score = float(predictions)

    category, safe = _categorize(nsfw_score)
    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "nsfw_score": round(nsfw_score, 4),
        "category": category,
        "safe": safe,
        "processing_time_ms": elapsed_ms,
    }
