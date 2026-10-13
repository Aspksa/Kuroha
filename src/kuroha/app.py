from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from kuroha import __version__
from kuroha.engine import KurohaEngine
from kuroha.models import ChatRequest, ChatResponse, HealthResponse, InfoResponse

app = FastAPI(
    title="Kuroha API",
    version=__version__,
    description="HTTP interface for the Kuroha core.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = KurohaEngine()


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)


@app.get("/api/info", response_model=InfoResponse)
def info() -> InfoResponse:
    return InfoResponse(
        name="Kuroha",
        version=__version__,
        capabilities=["chat", "session-memory", "web-api"],
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        reply, session_id = engine.respond(payload.message, payload.session_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ChatResponse(reply=reply, session_id=session_id)
