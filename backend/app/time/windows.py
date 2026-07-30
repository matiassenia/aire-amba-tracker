from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from app.domain.models import SnapshotAggregationPeriod, TimeWindow


def now_utc() -> datetime:
    return datetime.now(UTC)


def ensure_timezone(value: datetime, timezone: str = "UTC") -> datetime:
    if value.tzinfo is not None:
        return value
    if timezone.upper() == "UTC":
        return value.replace(tzinfo=UTC)
    return value.replace(tzinfo=ZoneInfo(timezone))


def trailing_window(name: str, now: datetime | None = None) -> TimeWindow:
    match name:
        case "1h" | "last_hour":
            duration = timedelta(hours=1)
        case "24h" | "last_24_hours":
            duration = timedelta(hours=24)
        case "7d" | "last_7_days":
            duration = timedelta(days=7)
        case "30d" | "last_30_days":
            duration = timedelta(days=30)
        case _:
            raise ValueError("unsupported trailing time window")
    return TimeWindow.trailing(duration, now=now)


def aggregation_period_to_timedelta(period: SnapshotAggregationPeriod) -> timedelta | None:
    match period:
        case SnapshotAggregationPeriod.INSTANT:
            return None
        case SnapshotAggregationPeriod.HOURLY:
            return timedelta(hours=1)
        case SnapshotAggregationPeriod.DAILY:
            return timedelta(days=1)
        case SnapshotAggregationPeriod.WEEKLY:
            return timedelta(days=7)
        case SnapshotAggregationPeriod.MONTHLY:
            return timedelta(days=30)
        case SnapshotAggregationPeriod.YEARLY:
            return timedelta(days=365)
