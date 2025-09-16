from api import create_app
from api.admin.routes import bp as admin_bp
from flask_cors import CORS
import os

app = create_app()

origins = os.getenv("ADMIN_FRONTEND_ORIGIN", "http://localhost:5174")

CORS(
    app,
    resources={r"/api/admin/*": {"origins": [origins]}},
    supports_credentials=True,
    expose_headers=["Authorization", "Content-Type"],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
)

app.register_blueprint(admin_bp, url_prefix="/api/admin/v1")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=os.getenv("FLASK_ENV") == "development")
