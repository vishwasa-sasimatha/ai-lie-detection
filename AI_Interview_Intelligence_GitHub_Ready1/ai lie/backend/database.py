# ============================================================
# AI INTERVIEW INTELLIGENCE
# database.py
# ============================================================

import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


# ============================================================
# MONGODB CONFIGURATION
# ============================================================

MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://127.0.0.1:27017"
)

DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "ai_interview_intelligence"
)


# ============================================================
# MONGODB CLIENT
# ============================================================

try:

    client = MongoClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=5000
    )

    # Test connection
    client.admin.command("ping")

    print("MongoDB connected successfully.")

except Exception as error:

    print("MongoDB connection failed:")
    print(error)

    client = None


# ============================================================
# DATABASE
# ============================================================

db = (
    client[DATABASE_NAME]
    if client is not None
    else None
)


# ============================================================
# COLLECTIONS
# ============================================================

candidates_collection = (
    db["candidates"]
    if db is not None
    else None
)

interviews_collection = (
    db["interviews"]
    if db is not None
    else None
)

reports_collection = (
    db["reports"]
    if db is not None
    else None
)