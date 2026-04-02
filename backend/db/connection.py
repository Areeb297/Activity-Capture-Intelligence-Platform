"""
Database connection for NeonDB (serverless PostgreSQL).

NeonDB's PgBouncer pooler closes idle connections aggressively, which causes
ThreadedConnectionPool to hand out stale/closed connections and throw:
  psycopg2.OperationalError: SSL connection has been closed unexpectedly

Fix: create a fresh psycopg2 connection per request. NeonDB's pooler is
designed for short-lived connections — this is the recommended pattern.
"""
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from core.config import settings


@contextmanager
def get_conn():
    """
    Open a fresh connection to NeonDB, yield it, then close it.
    Commits on success, rolls back on exception.
    """
    conn = psycopg2.connect(dsn=settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Keep these as no-ops so main.py startup/shutdown hooks don't break
def init_pool() -> None:
    pass


def close_pool() -> None:
    pass
