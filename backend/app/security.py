from typing import Optional

from fastapi import Header, HTTPException, status

from .config import get_settings


async def verify_auth(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    """Optionally verify a Supabase user JWT.

    Enabled only when REQUIRE_AUTH=true and SUPABASE_JWT_SECRET is set. Otherwise
    this is a no-op so the backend is easy to run locally.
    """
    settings = get_settings()
    if not settings.require_auth:
        return None
    if not settings.supabase_jwt_secret:
        # Misconfiguration: auth required but no secret. Fail closed.
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Auth required but SUPABASE_JWT_SECRET missing")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        import jwt

        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc
