from datetime import UTC, datetime, timedelta

import pytest

from app.domain.models import SnapshotAggregationPeriod, TimeWindow
from app.time.windows import aggregation_period_to_timedelta, ensure_timezone, trailing_window


def test_trailing_window_supports_standard_ranges() -> None:
    now = datetime(2026, 7, 29, 12, 0, tzinfo=UTC)

    window = trailing_window("24h", now=now)

    assert window.start == now - timedelta(hours=24)
    assert window.end == now


def test_time_window_rejects_naive_timestamps() -> None:
    with pytest.raises(ValueError):
        TimeWindow(datetime(2026, 7, 29), datetime(2026, 7, 30))


def test_time_window_helpers_prepare_aggregation_periods() -> None:
    assert aggregation_period_to_timedelta(SnapshotAggregationPeriod.HOURLY) == timedelta(hours=1)
    assert aggregation_period_to_timedelta(SnapshotAggregationPeriod.INSTANT) is None
    assert ensure_timezone(datetime(2026, 7, 29), "UTC").tzinfo is not None
