"""
DataTalk Python Sidecar — loopback-only FastAPI on port 8090.
Runs sandboxed Python execution (pandas / matplotlib / scipy / sklearn) that
has no viable JS replacement. The Node Express backend (:8080) is the only
caller — the frontend never talks to this service directly.
"""
import io
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

# Ensure UTF-8 output on Windows
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import pandas as pd

from code_sandbox import execute_code

app = FastAPI(title="DataTalk Sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "sidecar"}


class ExecuteCodeRequest(BaseModel):
    code: str
    session_id: Optional[str] = None
    rows: Optional[List[Dict[str, Any]]] = None  # JSON rows -> dataframe
    timeout_s: Optional[int] = 30


class Artifact(BaseModel):
    type: str  # "image"
    b64: str


class ExecuteCodeResponse(BaseModel):
    stdout: str
    stderr: str
    result_json: Optional[Any] = None
    artifacts: List[Artifact] = []
    error: Optional[str] = None
    success: bool


@app.post("/execute-code", response_model=ExecuteCodeResponse)
def execute_code_endpoint(req: ExecuteCodeRequest):
    df = pd.DataFrame(req.rows) if req.rows else pd.DataFrame()
    result = execute_code(req.code, dataframe=df if not df.empty else None)
    artifacts = [Artifact(type="image", b64=fig) for fig in result.figures]
    return ExecuteCodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        artifacts=artifacts,
        error=result.error,
        success=result.success,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8090,
        workers=1,
        log_level="info",
    )
