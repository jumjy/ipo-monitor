"""Load configuration from environment / .env file."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

LINE_NOTIFY_TOKEN: str = os.getenv("LINE_NOTIFY_TOKEN", "")
CHECK_INTERVAL_HOURS: float = float(os.getenv("CHECK_INTERVAL_HOURS", "6"))

EMAIL_FALLBACK: bool = os.getenv("EMAIL_FALLBACK", "false").lower() == "true"
SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")
EMAIL_TO: str = os.getenv("EMAIL_TO", "")

DATA_DIR: Path = Path(__file__).parent / "data"
LOG_DIR: Path = Path(__file__).parent / "logs"

DATA_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)
