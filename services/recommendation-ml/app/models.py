from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RecommendRequest(BaseModel):
    user_id: str
    limit: int = Field(default=50, ge=1, le=200)
    exclude_ids: list[str] = Field(default_factory=list)


class RecommendationItem(BaseModel):
    user_id: str
    score: float = Field(ge=0.0, le=1.0)


class RecommendResponse(BaseModel):
    recommendations: list[RecommendationItem]


class UpdateEmbeddingRequest(BaseModel):
    user_id: str


class BatchUpdateResponse(BaseModel):
    updated_count: int
    duration_seconds: float
    model_version: str


class HealthResponse(BaseModel):
    status: str
    model_version: str
    embedding_count: int
    last_update: Optional[datetime] = None
