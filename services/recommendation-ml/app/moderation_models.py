from pydantic import BaseModel, Field
from typing import Optional


class NsfwRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None


class NsfwResponse(BaseModel):
    nsfw_score: float = Field(ge=0.0, le=1.0)
    category: str  # "safe", "suggestive", "nsfw"
    safe: bool
    processing_time_ms: int
