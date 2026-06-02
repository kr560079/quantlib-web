from __future__ import annotations
import os
import httpx
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

EQUITY_URL = os.getenv("EQUITY_SERVICE_URL", "http://localhost:8001")
FIXED_INCOME_URL = os.getenv("FIXED_INCOME_SERVICE_URL", "http://localhost:8002")
RISK_URL = os.getenv("RISK_SERVICE_URL", "http://localhost:8003")

_ROUTES: dict[str, str] = {
    "equity": EQUITY_URL,
    "fixed-income": FIXED_INCOME_URL,
    "risk": RISK_URL,
}

app = FastAPI(title="QuantLib Web — API Gateway", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_client = httpx.AsyncClient(timeout=60.0)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}


@app.api_route(
    "/api/v1/{service}/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
)
async def proxy(service: str, path: str, request: Request) -> Response:
    target = _ROUTES.get(service)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Unknown service: '{service}'")

    url = f"{target}/{path}"
    if request.query_params:
        url += f"?{request.query_params}"

    body = await request.body()
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length", "transfer-encoding")
    }

    try:
        resp = await _client.request(
            method=request.method,
            url=url,
            content=body,
            headers=headers,
        )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=dict(resp.headers),
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Service '{service}' is unavailable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"Service '{service}' timed out")
