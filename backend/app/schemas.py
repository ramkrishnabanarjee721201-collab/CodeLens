from pydantic import BaseModel, Field


class ReviewRequest(BaseModel):
    language: str = Field(..., examples=["python"])
    code: str = Field(..., min_length=1)


class ReviewComment(BaseModel):
    severity: str
    line: int | None = None
    issue: str
    suggestion: str


class ReviewResponse(BaseModel):
    summary: str
    comments: list[ReviewComment]
