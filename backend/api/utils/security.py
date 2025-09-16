from ..extensions import bcrypt

def hash_password(pw: str) -> str:
    return bcrypt.generate_password_hash(pw).decode("utf-8")

def check_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.check_password_hash(hashed, pw)
    except Exception:
        return False
