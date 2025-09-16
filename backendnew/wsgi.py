# backend/wsgi.py
from api import create_app
from flask_cors import CORS
import os

app = create_app()
CORS(
    app,
    resources={r"/api/.*": {
        "origins": [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")]
    }},
    supports_credentials=True,
    methods=["GET","POST","PATCH","DELETE","OPTIONS"],
    allow_headers=["Content-Type","Authorization"],
)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_ENV") == "development")
