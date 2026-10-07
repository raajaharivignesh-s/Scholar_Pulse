import base64, hashlib, hmac, os
from datetime import datetime, timedelta, timezone
import jwt
from app.config import settings

ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return "scrypt$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode()

def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, salt_b64, digest_b64 = encoded.split("$")
        if scheme != "scrypt": return False
        salt = base64.urlsafe_b64decode(salt_b64)
        expected = base64.urlsafe_b64decode(digest_b64)
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user_id), "iat": now, "exp": now + timedelta(days=1)}, settings.jwt_secret, algorithm=ALGORITHM)

def decode_access_token(token: str) -> int:
    return int(jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])["sub"])
