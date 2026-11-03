"""
APScheduler configuration for automated background deadline monitoring in SIH26264.
Executes periodic SLA compliance evaluations and dispatches reminders safely.
"""

from datetime import datetime, timezone
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.database import SessionLocal
from app.services.reminder_service import ReminderService

logger = logging.getLogger(__name__)

# Single scheduler instance
scheduler = BackgroundScheduler(daemon=True, timezone="UTC")


def run_scheduled_deadline_check():
    """
    Periodic job invoked by APScheduler every hour.
    Safely opens an isolated database session and executes ReminderService checks.
    """
    logger.info("APScheduler: Triggering periodic hourly deadline check...")
    db = SessionLocal()
    try:
        result = ReminderService.check_and_generate_reminders(db)
        logger.info(
            "APScheduler: Periodic check finished. Evaluated=%d, Created=%d at %s",
            result.processed,
            result.new_notifications_created,
            result.timestamp,
        )
    except Exception as e:
        logger.error("APScheduler: Error during automated deadline check: %s", e, exc_info=True)
    finally:
        db.close()


def start_scheduler():
    """
    Starts the background scheduler during FastAPI lifespan startup.
    Ensures idempotent startup without registering duplicate jobs.
    """
    global scheduler
    if scheduler.running:
        logger.warning("APScheduler is already running.")
        return

    # If scheduler was previously shut down (e.g. across test cycles or restarts),
    # re-instantiate it so it can be cleanly started.
    if hasattr(scheduler, "state") and scheduler.state == 2:
        scheduler = BackgroundScheduler(daemon=True, timezone="UTC")

    # Add the hourly deadline check with fixed ID to prevent duplication
    scheduler.add_job(
        run_scheduled_deadline_check,
        trigger=IntervalTrigger(hours=1),
        id="hourly_deadline_check",
        name="Hourly Complaint Statutory SLA Deadline Monitor",
        replace_existing=True,
        misfire_grace_time=300,
    )

    try:
        scheduler.start()
        logger.info("APScheduler started successfully with job 'hourly_deadline_check'.")
    except Exception as e:
        logger.error("Failed to start APScheduler: %s", e)


def shutdown_scheduler():
    """
    Gracefully shuts down the scheduler during FastAPI lifespan shutdown.
    """
    if scheduler.running:
        try:
            scheduler.shutdown(wait=False)
            logger.info("APScheduler shut down gracefully.")
        except Exception as e:
            logger.error("Error shutting down APScheduler: %s", e)
