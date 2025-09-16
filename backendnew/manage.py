import click
from api import create_app
from api.extensions import db
from api.models import *  # noqa

app = create_app()

@app.cli.command("create-db")
def create_db():
    """Create tables (useful for quick start without migrations)."""
    with app.app_context():
        db.create_all()
    click.echo("DB tables created.")

@app.cli.command("drop-db")
def drop_db():
    with app.app_context():
        db.drop_all()
    click.echo("DB dropped.")


@app.cli.command("make-admin")
@click.argument("email")
def make_admin(email):
    "Set is_admin=True for the given user email"
    with app.app_context():
        from api.models import User
        u = User.query.filter_by(email=email).first()
        if not u:
            click.echo("User not found"); return
        u.is_admin = True
        db.session.commit()
        click.echo(f"User {email} is now admin.")

@app.cli.command("set-password")
@click.argument("email")
@click.argument("password")
def set_password(email, password):
    "Set password for a given user"
    with app.app_context():
        from api.models import User
        from api.utils.security import hash_password
        u = User.query.filter_by(email=email).first()
        if not u:
            click.echo("User not found"); return
        u.password_hash = hash_password(password)
        db.session.commit()
        click.echo("Password updated.")
