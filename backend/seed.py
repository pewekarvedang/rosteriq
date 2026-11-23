#!/usr/bin/env python
"""
RosterIQ Standalone Database Seeder
Can be executed as part of CI/CD, Docker entrypoints, or Render release commands:
    python seed.py
"""
import sys
import logging
from app.database import engine, Base, SessionLocal, check_db_connection
from app.utils.seed_data import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("rosteriq.seeder")


def main():
    logger.info("Checking database connectivity...")
    if not check_db_connection():
        logger.error("Failed to connect to database. Please verify DATABASE_URL.")
        sys.exit(1)

    logger.info("Ensuring database tables are registered...")
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    logger.info("Running idempotent database seed...")
    with SessionLocal() as db:
        seed_database(db)

    logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    main()
