import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "run_page"))

from gpxtrackposter.track import calculate_fastest_distance_time


def make_records(distances, timestamps):
    return [
        {"distance": distance, "timestamp": timestamp}
        for distance, timestamp in zip(distances, timestamps)
    ]


def test_fastest_distance_uses_best_section_with_interpolated_boundary():
    records = make_records(
        [0, 2000, 5000, 7000, 11000, 13000],
        [0, 800, 1700, 2300, 3300, 4100],
    )

    assert calculate_fastest_distance_time(records, 5000) == pytest.approx(1300)
    assert calculate_fastest_distance_time(records, 10000) == pytest.approx(2900)


@pytest.mark.parametrize(
    ("distance", "expected_time"),
    [(400, 100), (800, 200), (1000, 250), (1600, 400), (2000, 500)],
)
def test_fastest_distance_supports_short_personal_bests(distance, expected_time):
    records = make_records([0, 1000, 2000], [0, 250, 500])

    assert calculate_fastest_distance_time(records, distance) == pytest.approx(
        expected_time
    )


def test_fastest_distance_supports_half_marathon_personal_best():
    records = make_records([0, 25000], [0, 7500])

    assert calculate_fastest_distance_time(records, 21097.5) == pytest.approx(6329.25)


def test_fastest_distance_does_not_cross_a_distance_reset():
    records = make_records(
        [0, 3000, 0, 3000],
        [0, 900, 1000, 1900],
    )

    assert calculate_fastest_distance_time(records, 5000) is None


def test_fastest_distance_can_start_after_a_pause():
    records = make_records(
        [0, 0, 5000],
        [0, 600, 2100],
    )

    assert calculate_fastest_distance_time(records, 5000) == pytest.approx(1500)
