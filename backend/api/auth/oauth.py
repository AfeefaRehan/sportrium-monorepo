import os, secrets
from flask import Blueprint, request, redirect, session
from requests_oauthlib import OAuth2Session
from flask_jwt_extended import create_access_token
from ..extensions import db
from ..models import User, SocialIdentity

bp = Blueprint("oauth", __name__)
SESSION_KEY = "oauth_state"

def _frontend_redirect(jwt=None, error=None):
    app_url = os.getenv("FRONTEND_APP_URL", "http://localhost:5173")
    if jwt:
        return redirect(f"{app_url}/auth/callback?token={jwt}")
    if error:
        return redirect(f"{app_url}/auth/callback?error={error}")
    return redirect(app_url)

# ---------- Google ----------
@bp.get("/google/start")
def google_start():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    scope = ["openid","email","profile"]
    oauth = OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scope)
    auth_url, state = oauth.authorization_url("https://accounts.google.com/o/oauth2/auth", access_type="offline", prompt="consent")
    session[SESSION_KEY] = state
    return redirect(auth_url)

@bp.get("/google/callback")
def google_cb():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    state = session.get(SESSION_KEY)
    if not state:
        return _frontend_redirect(error="state_missing")

    oauth = OAuth2Session(client_id, redirect_uri=redirect_uri, state=state)
    token = oauth.fetch_token(
        "https://oauth2.googleapis.com/token",
        client_secret=client_secret,
        authorization_response=request.url
    )
    userinfo = oauth.get("https://www.googleapis.com/oauth2/v1/userinfo").json()
    provider = "google"
    provider_user_id = userinfo.get("id") or userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not provider_user_id:
        return _frontend_redirect(error="google_no_id")

    si = SocialIdentity.query.filter_by(provider=provider, provider_user_id=provider_user_id).first()
    if si:
        user = db.session.get(User, si.user_id)
    else:
        user = User.query.filter_by(email=email).first() if email else None
        if not user:
            user = User(display_name=name or "User", email=email or f"no-email+{secrets.token_hex(4)}@example.com", password_hash="")
            db.session.add(user); db.session.commit()
        db.session.add(SocialIdentity(user_id=user.id, provider=provider, provider_user_id=provider_user_id, email=email, raw_profile_json=userinfo))
        db.session.commit()

    jwt = create_access_token(identity=str(user.id))
    return _frontend_redirect(jwt=jwt)

# ---------- Facebook ----------
@bp.get("/facebook/start")
def fb_start():
    app_id = os.getenv("FACEBOOK_APP_ID")
    redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")
    scope = ["public_profile","email"]
    oauth = OAuth2Session(app_id, redirect_uri=redirect_uri, scope=scope)
    auth_url, state = oauth.authorization_url("https://www.facebook.com/v18.0/dialog/oauth")
    session[SESSION_KEY] = state
    return redirect(auth_url)

@bp.get("/facebook/callback")
def fb_cb():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")
    state = session.get(SESSION_KEY)
    if not state:
        return _frontend_redirect(error="state_missing")

    oauth = OAuth2Session(app_id, redirect_uri=redirect_uri, state=state)
    token = oauth.fetch_token(
        "https://graph.facebook.com/v18.0/oauth/access_token",
        client_secret=app_secret,
        authorization_response=request.url
    )
    profile = oauth.get("https://graph.facebook.com/me?fields=id,name,email,picture").json()
    provider = "facebook"
    provider_user_id = profile.get("id")
    email = profile.get("email")
    name = profile.get("name")

    if not provider_user_id:
        return _frontend_redirect(error="facebook_no_id")

    si = SocialIdentity.query.filter_by(provider=provider, provider_user_id=provider_user_id).first()
    if si:
        user = db.session.get(User, si.user_id)
    else:
        user = User.query.filter_by(email=email).first() if email else None
        if not user:
            user = User(display_name=name or "User", email=email or f"no-email+{secrets.token_hex(4)}@example.com", password_hash="")
            db.session.add(user); db.session.commit()
        db.session.add(SocialIdentity(user_id=user.id, provider=provider, provider_user_id=provider_user_id, email=email, raw_profile_json=profile))
        db.session.commit()

    jwt = create_access_token(identity=str(user.id))
    return _frontend_redirect(jwt=jwt)
