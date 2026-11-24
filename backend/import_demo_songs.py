from pathlib import Path

from pydantic import TypeAdapter

from songs import SavedSong, connect, database_path, initialize_library, timestamp


def main() -> None:
    seed = Path(__file__).with_name("demo_songs.json")
    demos = TypeAdapter(list[SavedSong]).validate_json(seed.read_bytes())
    if len({demo.id for demo in demos}) != len(demos):
        raise ValueError("Demo song IDs must be unique")

    path = database_path()
    initialize_library(path)
    now = timestamp()
    with connect(path) as connection:
        # Rows with the same timestamp list newest first, so insert in reverse catalog order.
        result = connection.executemany(
            """
            INSERT INTO songs (id, name, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            ((demo.id, demo.name, demo.storage_payload(), now, now) for demo in reversed(demos)),
        )
    print(f"Imported {result.rowcount} demo songs. Skipped {len(demos) - result.rowcount} already present.")


if __name__ == "__main__":
    main()
