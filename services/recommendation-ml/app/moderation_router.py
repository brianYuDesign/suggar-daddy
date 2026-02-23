import logging

from fastapi import APIRouter, HTTPException

from .moderation_models import NsfwRequest, NsfwResponse
from .nsfw_detector import predict

logger = logging.getLogger(__name__)

moderation_router = APIRouter(prefix="/api/moderation", tags=["moderation"])


@moderation_router.post("/nsfw", response_model=NsfwResponse)
async def detect_nsfw(body: NsfwRequest):
    """Analyse an image for NSFW content."""
    if not body.image_url and not body.image_base64:
        raise HTTPException(
            status_code=400,
            detail="Either image_url or image_base64 must be provided",
        )

    try:
        result = predict(
            image_url=body.image_url,
            image_base64=body.image_base64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"NSFW detection failed: {exc}")
        raise HTTPException(status_code=500, detail="NSFW detection failed")

    return NsfwResponse(**result)


@moderation_router.get("/health")
async def moderation_health():
    """Health check for the moderation sub-system."""
    return {"status": "ok", "service": "nsfw-moderation"}
