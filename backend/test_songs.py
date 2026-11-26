import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import Mock, patch

import httpx
from fastapi.testclient import TestClient

from main import app


SONG = {
    "name": "Evening",
    "loopSeconds": 8,
    "tracks": [
        {
            "id": "drums",
            "name": "Drums",
            "instrument": "drum-kit",
            "blocks": [
                {"id": "kick", "start": 0, "duration": 0.25, "note": "C2", "velocity": 94},
                {"id": "snare", "start": 1, "duration": 0.25, "note": "D2"},
            ],
        },
        {"id": "piano", "name": "Piano", "instrument": "program:0", "blocks": []},
    ],
}


class SongApiTest(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        path = Path(directory) / "library.sqlite3"
        self.db_path = path
        self.enterContext(patch.dict(os.environ, {"ANYBEAT_DB_PATH": str(path)}))

    def test_manual_demo_import_preserves_existing_songs_and_edits(self):
        def import_demos():
            result = subprocess.run(
                [sys.executable, "-m", "import_demo_songs"],
                cwd=Path(__file__).parent,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

        with TestClient(app) as client:
            self.assertEqual(client.get("/api/songs").json(), [])
            existing = client.post("/api/songs", json={**SONG, "name": "Original"}).json()

            import_demos()
            summaries = client.get("/api/songs").json()
            self.assertEqual(len(summaries), 20)
            self.assertEqual(sum(summary["name"] == "Original" for summary in summaries), 2)
            for summary in summaries:
                with self.subTest(song_id=summary["id"]):
                    self.assertEqual(client.get(f"/api/songs/{summary['id']}").status_code, 200)
            original_id = "demo-original"
            original = client.get(f"/api/songs/{original_id}").json()
            self.assertEqual(original["name"], "Original")
            self.assertTrue(original["tracks"][0]["blocks"])

            renamed = {**original, "name": "Edited demo"}
            self.assertEqual(
                client.put(f"/api/songs/{original_id}", json={
                    key: value for key, value in renamed.items() if key != "id"
                }).status_code,
                200,
            )

            import_demos()
            self.assertEqual(len(client.get("/api/songs").json()), 20)
            self.assertEqual(client.get(f"/api/songs/{original_id}").json(), renamed)
            self.assertEqual(client.get(f"/api/songs/{existing['id']}").json(), existing)

    def test_song_survives_app_restart(self):
        with TestClient(app) as client:
            response = client.post("/api/songs", json=SONG)
            self.assertEqual(response.status_code, 201, response.text)
            song_id = response.json()["id"]

        with TestClient(app) as client:
            response = client.get(f"/api/songs/{song_id}")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"id": song_id, **SONG})

    def test_generation_saves_a_playable_song_with_its_prompt(self):
        generated = {**SONG, "name": "Happy Loop"}
        openai_response = Mock()
        openai_response.json.return_value = {
            "status": "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(generated)}]}],
        }
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), patch("httpx.post", return_value=openai_response):
            with TestClient(app) as client:
                response = client.post("/api/songs/generate", json={"prompt": "  create a happy song  "})
                self.assertEqual(response.status_code, 201, response.text)
                saved = response.json()
                self.assertEqual(saved, {"id": saved["id"], **generated, "generationPrompt": "  create a happy song  "})
                self.assertEqual(client.get(f"/api/songs/{saved['id']}").json(), saved)
                self.assertEqual(client.get("/api/songs").json()[0]["id"], saved["id"])

    def test_editing_generated_song_keeps_original_prompt(self):
        openai_response = Mock()
        openai_response.json.return_value = {
            "status": "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(SONG)}]}],
        }
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), patch("httpx.post", return_value=openai_response):
            with TestClient(app) as client:
                saved = client.post("/api/songs/generate", json={"prompt": "an evening song"}).json()
                edited = {**SONG, "name": "Edited"}
                response = client.put(f"/api/songs/{saved['id']}", json=edited)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json(), {"id": saved["id"], **edited, "generationPrompt": "an evening song"})
                self.assertEqual(client.get(f"/api/songs/{saved['id']}").json(), response.json())

    def test_generation_failures_save_nothing(self):
        invalid = {**SONG, "tracks": [{**SONG["tracks"][0], "instrument": "program:128"}]}
        for output in (invalid, {**SONG, "loopSeconds": 20}, {**SONG, "tracks": []}):
            with self.subTest(output=output):
                openai_response = Mock()
                openai_response.json.return_value = {
                    "status": "completed",
                    "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(output)}]}],
                }
                with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), patch("httpx.post", return_value=openai_response) as post:
                    with TestClient(app) as client:
                        response = client.post("/api/songs/generate", json={"prompt": "make a song"})
                        self.assertEqual(response.status_code, 502, response.text)
                        self.assertEqual(client.get("/api/songs").json(), [])
                        post.assert_called_once()

    def test_generation_rejects_invalid_input_and_missing_configuration(self):
        with patch("httpx.post") as post, patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            with TestClient(app) as client:
                for prompt in ("", "   ", 42):
                    with self.subTest(prompt=prompt):
                        self.assertEqual(client.post("/api/songs/generate", json={"prompt": prompt}).status_code, 422)
                self.assertEqual(client.post("/api/songs/generate", json={"prompt": "happy"}).status_code, 503)
                self.assertEqual(client.get("/api/songs").json(), [])
                post.assert_not_called()

    def test_openai_error_saves_nothing_and_does_not_expose_credentials(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-test-key"}), patch("httpx.post", side_effect=httpx.TimeoutException("timed out")):
            with TestClient(app) as client:
                response = client.post("/api/songs/generate", json={"prompt": "happy"})
                self.assertEqual(response.status_code, 502, response.text)
                self.assertNotIn("secret-test-key", response.text)
                self.assertEqual(client.get("/api/songs").json(), [])

    def test_incomplete_or_malformed_openai_response_saves_nothing(self):
        for payload in (
            {"status": "incomplete", "output": []},
            {"status": "completed", "output": None},
            {"status": "completed", "output": [None]},
            [],
        ):
            with self.subTest(payload=payload):
                openai_response = Mock()
                openai_response.json.return_value = payload
                with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), patch("httpx.post", return_value=openai_response):
                    with TestClient(app) as client:
                        response = client.post("/api/songs/generate", json={"prompt": "happy"})
                        self.assertEqual(response.status_code, 502, response.text)
                        self.assertEqual(client.get("/api/songs").json(), [])

    def test_existing_library_is_migrated_without_losing_songs(self):
        with closing(sqlite3.connect(self.db_path)) as connection, connection:
            connection.execute(
                "CREATE TABLE songs (id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT INTO songs VALUES (?, ?, ?, ?, ?)",
                ("old-song", SONG["name"], json.dumps({key: SONG[key] for key in ("loopSeconds", "tracks")}), "old", "old"),
            )
        with TestClient(app) as client:
            response = client.get("/api/songs/old-song")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"id": "old-song", **SONG})

    def test_list_and_update_songs_with_duplicate_names(self):
        with TestClient(app) as client:
            self.assertEqual(client.get("/api/songs").json(), [])
            first = client.post("/api/songs", json=SONG).json()["id"]
            second = client.post("/api/songs", json=SONG).json()["id"]
            self.assertNotEqual(first, second)
            summaries = client.get("/api/songs").json()
            self.assertEqual([song["id"] for song in summaries], [second, first])
            self.assertEqual(summaries[0]["name"], "Evening")
            self.assertGreaterEqual(summaries[0]["updatedAt"], summaries[1]["updatedAt"])

            changed = {**SONG, "loopSeconds": 12, "tracks": SONG["tracks"][::-1]}
            response = client.put(f"/api/songs/{first}", json=changed)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"id": first, **changed})
            self.assertEqual(client.get(f"/api/songs/{first}").json(), response.json())
            self.assertEqual(client.get(f"/api/songs/{second}").json(), {"id": second, **SONG})
            self.assertEqual([song["id"] for song in client.get("/api/songs").json()], [first, second])

    def test_invalid_song_leaves_saved_data_unchanged(self):
        with TestClient(app) as client:
            song_id = client.post("/api/songs", json=SONG).json()["id"]
            for invalid in (
                {**SONG, "loopSeconds": 0.5},
                {**SONG, "tracks": []},
                {**SONG, "tracks": [{**SONG["tracks"][0], "instrument": "program:128"}]},
            ):
                with self.subTest(invalid=invalid):
                    self.assertEqual(client.post("/api/songs", json=invalid).status_code, 422)
                    self.assertEqual(client.put(f"/api/songs/{song_id}", json=invalid).status_code, 422)

            self.assertEqual(client.get(f"/api/songs/{song_id}").json(), {"id": song_id, **SONG})
            self.assertEqual(len(client.get("/api/songs").json()), 1)

    def test_unknown_song_returns_not_found(self):
        with TestClient(app) as client:
            self.assertEqual(client.get("/api/songs/unknown").status_code, 404)
            self.assertEqual(client.put("/api/songs/unknown", json=SONG).status_code, 404)

    def test_nonfinite_json_number_returns_validation_error(self):
        with TestClient(app) as client:
            song_id = client.post("/api/songs", json=SONG).json()["id"]
            payload = '{"name":"Invalid","loopSeconds":1e309,"tracks":[]}'
            for method, url in (("POST", "/api/songs"), ("PUT", f"/api/songs/{song_id}")):
                with self.subTest(method=method):
                    response = client.request(
                        method, url, content=payload, headers={"Content-Type": "application/json"}
                    )
                    self.assertEqual(response.status_code, 422, response.text)
            self.assertEqual(client.get(f"/api/songs/{song_id}").json(), {"id": song_id, **SONG})
