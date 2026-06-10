from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.reviewer import review_code
from app.schemas import ReviewRequest, ReviewResponse

app = FastAPI(title="CodeLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "Welcome to CodeLens!"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/review", response_model=ReviewResponse)
def review(request: ReviewRequest) -> ReviewResponse:
    return review_code(request)

