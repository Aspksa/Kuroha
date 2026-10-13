from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    environment: str


class ReadyResponse(BaseModel):
    ready: bool


class InfoResponse(BaseModel):
    name: str
    version: str
    api_version: str
    capabilities: list[str]


class PublicSettings(BaseModel):
    site_name: str
    theme: Literal["dark", "light"]


class SettingsUpdate(BaseModel):
    site_name: str | None = Field(default=None, min_length=1, max_length=80)
    theme: Literal["dark", "light"] | None = None
