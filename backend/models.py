from pydantic import BaseModel


class ItemUpdate(BaseModel):
    prompt: str | None = None
    tags: list[str] | None = None
    workflow_name: str | None = None


class ItemResponse(BaseModel):
    id: str
    type: str
    file_name: str | None = None
    prompt: str = ""
    tags: list[str] = []
    workflow_name: str | None = None
    width: int | None = None
    height: int | None = None
    duration: float | None = None
    has_audio: bool = False
    reference_image_path: str | None = None
    created_at: str
