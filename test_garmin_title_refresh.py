import asyncio
import datetime as dt
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "run_page"))

from garmin_sync import get_activity_id_list
from generator.db import Activity, init_db
from utils import make_activities_file


class FakeGarminClient:
    is_only_running = False

    async def get_activities(self, start, limit, activity_type=None):
        if start:
            return []
        return [
            {
                "activityId": 123,
                "activityName": "Evening Run",
                "startTimeGMT": "2024-01-02 03:04:05",
            }
        ]


class GarminTitleRefreshTest(unittest.TestCase):
    def test_activity_list_indexes_title_by_file_and_run_id(self):
        titles = {}
        activity_ids = asyncio.run(
            get_activity_id_list(FakeGarminClient(), activity_title_dict=titles)
        )
        run_id = int(
            dt.datetime(2024, 1, 2, 3, 4, 5, tzinfo=dt.timezone.utc).timestamp() * 1000
        )

        self.assertEqual(activity_ids, ["123"])
        self.assertEqual(titles["123"], "Evening Run")
        self.assertEqual(titles[str(run_id)], "Evening Run")

    def test_existing_activity_name_is_refreshed_without_track_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "data.db")
            json_path = os.path.join(temp_dir, "activities.json")
            run_id = 1_704_164_645_000
            session = init_db(db_path)
            session.add(
                Activity(
                    run_id=run_id,
                    name="Morning Run",
                    distance=5000,
                    moving_time=dt.timedelta(minutes=30),
                    elapsed_time=dt.timedelta(minutes=31),
                    type="Run",
                    subtype="",
                    start_date="2024-01-02 03:04:05",
                    start_date_local="2024-01-02 11:04:05",
                    location_country="",
                    summary_polyline="",
                    average_speed=2.7,
                    elevation_gain=0,
                )
            )
            session.commit()
            session.close()

            make_activities_file(
                db_path,
                temp_dir,
                json_path,
                activity_title_dict={str(run_id): "Evening Run"},
            )

            session = init_db(db_path)
            activity = session.query(Activity).filter_by(run_id=run_id).one()
            self.assertEqual(activity.name, "Evening Run")
            session.close()

            with open(json_path) as activities_file:
                activities = json.load(activities_file)
            self.assertEqual(activities[0]["name"], "Evening Run")


if __name__ == "__main__":
    unittest.main()
