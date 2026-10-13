from __future__ import annotations

from collections.abc import Awaitable, Callable
from urllib.parse import urlsplit

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; "
        "img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; connect-src 'self'"
    ),
}

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class LocalRequestProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, allowed_origins: tuple[str, ...]) -> None:
        super().__init__(app)
        self.allowed_origins = set(allowed_origins)

    @staticmethod
    def _same_local_origin(request: Request, origin: str) -> bool:
        try:
            parsed = urlsplit(origin)
        except ValueError:
            return False
        if parsed.scheme not in {"http", "https"}:
            return False
        if parsed.hostname not in {"127.0.0.1", "localhost"}:
            return False
        request_port = request.url.port or (443 if request.url.scheme == "https" else 80)
        origin_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        return origin_port == request_port

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path.startswith("/api/") and request.method in UNSAFE_METHODS:
            origin = request.headers.get("origin")
            if origin:
                origin_allowed = origin in self.allowed_origins or self._same_local_origin(
                    request, origin
                )
                if not origin_allowed or request.headers.get("x-kuroha") != "1":
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "forbidden_origin",
                                "message": "Cross-origin modifying request is not allowed.",
                            }
                        },
                    )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            response.headers[key] = value
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response


class StaticCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        if not request.url.path.startswith("/api/"):
            if request.url.path.startswith("/assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif request.url.path != "/":
                response.headers.setdefault("Cache-Control", "public, max-age=300")
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        content_length = request.headers.get("content-length")
        effective_limit = self.max_bytes
        if request.url.path.endswith("/backups/import"):
            effective_limit = max(effective_limit, 128 * 1024 * 1024)
        if content_length:
            try:
                too_large = int(content_length) > effective_limit
            except ValueError:
                too_large = True
            if too_large:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": {
                            "code": "request_too_large",
                            "message": "Request body is too large.",
                        }
                    },
                )
        return await call_next(request)
