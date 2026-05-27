import os
import random
import re
import time
from urllib.parse import quote

import requests
from sqlalchemy import text

from database import SessionLocal, init_db
from models import Track
from semantic import build_track_descriptor, clean_lyrics, embed_texts, infer_about

DEEZER_API = "https://api.deezer.com"
LRCLIB_API = "https://lrclib.net/api"
LYRICS_OVH_API = "https://api.lyrics.ovh/v1"

TARGET_TRACK_COUNT = int(os.getenv("TRACK_LOAD_LIMIT", "200"))
REQUEST_TIMEOUT = 12

HTTP_HEADERS = {
    "User-Agent": "cs-playlist-creator/1.0 (semantic playlist search)",
}

LOW_BPM_GENRES = [
    "ambient",
    "classical",
    "chillout",
    "downtempo",
    "lounge",
    "trip hop",
    "jazz",
    "blues",
    "soul",
    "acoustic",
]

CATALOG_SEARCHES = [
    "pop",
    "rock",
    "indie",
    "hip hop",
    "rap",
    "r&b",
    "electronic",
    "dance",
    "house",
    "techno",
    "metal",
    "punk",
    "folk",
    "country",
    "latin",
    "k-pop",
    "j-pop",
    "soundtrack",
    "sad songs",
    "love songs",
    "night drive",
    "party",
    "workout",
    "relaxing",
    "study music",
]

MOCK_TRACK_BLUEPRINTS = [
    (
        "Late City Lights",
        "Demo Echo",
        "indie",
        "I walk alone under city lights, carrying old memories and a quiet heart.",
        82,
        0.34,
        0.26,
    ),
    (
        "Golden Morning",
        "Sample Days",
        "pop",
        "The sun is rising, joy is coming back, and every step feels alive.",
        118,
        0.74,
        0.83,
    ),
    (
        "Road Away",
        "Northline",
        "rock",
        "We drive through the night, chasing freedom on the highway away from fear.",
        128,
        0.78,
        0.58,
    ),
    (
        "Soft Rain Focus",
        "Quiet Room",
        "ambient",
        "Soft rain, slow breathing, calm thoughts, and a room made for rest.",
        68,
        0.22,
        0.42,
    ),
    (
        "Heartbreak Loop",
        "Violet Static",
        "r&b",
        "I miss your voice, the goodbye still hurts, and the night keeps every tear.",
        90,
        0.46,
        0.22,
    ),
]


def normalize(val, min_v, max_v):
    return max(0.0, min(1.0, (val - min_v) / (max_v - min_v)))


def generate_energy_valence(bpm, genre=None):
    """Generate plausible energy and valence based on BPM and genre."""
    energy = normalize(bpm, 60, 180) * 0.7 + random.uniform(0.1, 0.3)
    energy = max(0.1, min(1.0, energy))

    valence = random.uniform(0.2, 0.9)
    if genre:
        genre_lower = genre.lower()
        if any(g in genre_lower for g in ["rock", "metal", "hiphop", "hip hop"]):
            valence = random.uniform(0.3, 0.7)
        elif any(g in genre_lower for g in ["ambient", "classical", "chill"]):
            valence = random.uniform(0.2, 0.6)
    return round(energy, 3), round(valence, 3)


def search_deezer_tracks(query, limit=25):
    """Search tracks on Deezer by query."""
    try:
        resp = requests.get(
            f"{DEEZER_API}/search",
            params={"q": query, "limit": limit},
            headers=HTTP_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])
    except Exception as e:
        print(f"Search failed for '{query}': {e}")
        return []


def fetch_track_details(track_id):
    """Fetch detailed information for a track."""
    try:
        detail_resp = requests.get(
            f"{DEEZER_API}/track/{track_id}",
            headers=HTTP_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        if detail_resp.status_code == 200:
            return detail_resp.json()
    except Exception:
        pass
    return None


def fetch_lyrics(title, artist, duration=None):
    """Fetch lyrics from public APIs. Returns (lyrics, source)."""
    lyrics = fetch_lrclib_lyrics(title, artist, duration)
    if lyrics:
        return lyrics, "lrclib"

    lyrics = fetch_lyrics_ovh(title, artist)
    if lyrics:
        return lyrics, "lyrics.ovh"

    return None, None


def fetch_lrclib_lyrics(title, artist, duration=None):
    cleaned_title = clean_title_for_lyrics(title)
    params = {
        "track_name": cleaned_title,
        "artist_name": artist,
    }
    if duration:
        params["duration"] = int(duration)

    try:
        response = requests.get(
            f"{LRCLIB_API}/get",
            params=params,
            headers=HTTP_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            lyrics = extract_lrclib_lyrics(response.json())
            if lyrics:
                return lyrics
    except Exception:
        pass

    try:
        response = requests.get(
            f"{LRCLIB_API}/search",
            params={"track_name": cleaned_title, "artist_name": artist},
            headers=HTTP_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            for candidate in response.json()[:3]:
                lyrics = extract_lrclib_lyrics(candidate)
                if lyrics:
                    return lyrics
    except Exception:
        pass

    return None


def fetch_lyrics_ovh(title, artist):
    try:
        url = f"{LYRICS_OVH_API}/{quote(artist, safe='')}/{quote(clean_title_for_lyrics(title), safe='')}"
        response = requests.get(url, headers=HTTP_HEADERS, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            lyrics = response.json().get("lyrics")
            cleaned = clean_lyrics(lyrics)
            if len(cleaned) >= 80:
                return cleaned
    except Exception:
        pass
    return None


def extract_lrclib_lyrics(payload):
    if payload.get("instrumental"):
        return None

    lyrics = payload.get("plainLyrics") or strip_synced_lyrics(payload.get("syncedLyrics"))
    cleaned = clean_lyrics(lyrics)
    if len(cleaned) < 80:
        return None
    return cleaned


def strip_synced_lyrics(synced_lyrics):
    if not synced_lyrics:
        return None
    lines = []
    for line in synced_lyrics.splitlines():
        lines.append(re.sub(r"^\[[0-9:.]+\]\s*", "", line).strip())
    return "\n".join(line for line in lines if line)


def clean_title_for_lyrics(title):
    title = re.sub(r"\s+-\s+.*$", "", title)
    title = re.sub(r"\((feat\.|ft\.|with|remaster|radio edit|live).*?\)", "", title, flags=re.I)
    title = re.sub(r"\[(feat\.|ft\.|with|remaster|radio edit|live).*?\]", "", title, flags=re.I)
    return re.sub(r"\s+", " ", title).strip()


def collect_deezer_candidates(target_count):
    all_tracks = []

    print("Loading tracks from Deezer chart...")
    try:
        chart_resp = requests.get(
            f"{DEEZER_API}/chart/0/tracks",
            params={"limit": min(100, target_count)},
            headers=HTTP_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        chart_resp.raise_for_status()
        chart_tracks = chart_resp.json().get("data", [])
        all_tracks.extend(chart_tracks)
        print(f"Fetched {len(chart_tracks)} tracks from chart.")
    except Exception as e:
        print(f"Chart load failed: {e}")

    searches = [f"genre:{genre}" for genre in LOW_BPM_GENRES] + CATALOG_SEARCHES
    for query in searches:
        query_tracks = search_deezer_tracks(query, limit=25)
        all_tracks.extend(query_tracks)
        print(f"  {query}: {len(query_tracks)} tracks")
        if len(all_tracks) >= target_count * 3:
            break
        time.sleep(0.15)

    seen_ids = set()
    unique_tracks = []
    for track in all_tracks:
        track_id = track.get("id")
        if track_id and track_id not in seen_ids:
            seen_ids.add(track_id)
            unique_tracks.append(track)

    print(f"Total unique candidates: {len(unique_tracks)}")
    return unique_tracks


def collect_mock_candidates(target_count):
    return [
        {
            "id": -(index + 1),
            "title": MOCK_TRACK_BLUEPRINTS[index % len(MOCK_TRACK_BLUEPRINTS)][0],
            "artist": {"name": MOCK_TRACK_BLUEPRINTS[index % len(MOCK_TRACK_BLUEPRINTS)][1]},
            "_mock": True,
            "_blueprint_index": index % len(MOCK_TRACK_BLUEPRINTS),
        }
        for index in range(target_count)
    ]


def prepare_track_data(item):
    detail = fetch_track_details(item["id"])
    if not detail:
        return None

    bpm = detail.get("bpm")
    genre = detail.get("genre", {}).get("name") if detail.get("genre") else None
    if bpm is None or bpm == 0:
        if genre and any(g in genre.lower() for g in LOW_BPM_GENRES):
            bpm = random.randint(60, 90)
        else:
            bpm = random.randint(60, 160)

    bpm = float(bpm)
    energy, valence = generate_energy_valence(bpm, genre)
    norm_bpm = normalize(bpm, 60, 180)

    title = detail.get("title") or item["title"]
    artist = detail.get("artist", {}).get("name") or item["artist"]["name"]
    lyrics, lyrics_source = fetch_lyrics(title, artist, detail.get("duration"))
    about = infer_about(
        title=title,
        artist=artist,
        genre=genre,
        lyrics=lyrics,
        bpm=bpm,
        energy=energy,
        valence=valence,
    )
    semantic_descriptor = build_track_descriptor(
        title=title,
        artist=artist,
        genre=genre,
        bpm=bpm,
        energy=energy,
        valence=valence,
        lyrics=lyrics,
        about=about,
    )

    return {
        "deezer_id": item["id"],
        "title": title,
        "artist": artist,
        "genre": genre,
        "bpm": bpm,
        "energy": energy,
        "valence": valence,
        "embedding": [norm_bpm, energy, valence],
        "lyrics": lyrics,
        "lyrics_source": lyrics_source,
        "about": about,
        "semantic_descriptor": semantic_descriptor,
        "preview_url": "/static/audio/demo1.mp3",
    }


def prepare_mock_track_data(item):
    title, artist, genre, lyrics, bpm, energy, valence = MOCK_TRACK_BLUEPRINTS[item["_blueprint_index"]]
    title = f"{title} {abs(item['id'])}"
    norm_bpm = normalize(bpm, 60, 180)
    about = infer_about(
        title=title,
        artist=artist,
        genre=genre,
        lyrics=lyrics,
        bpm=bpm,
        energy=energy,
        valence=valence,
    )
    semantic_descriptor = build_track_descriptor(
        title=title,
        artist=artist,
        genre=genre,
        bpm=bpm,
        energy=energy,
        valence=valence,
        lyrics=lyrics,
        about=about,
    )
    return {
        "deezer_id": item["id"],
        "title": title,
        "artist": artist,
        "genre": genre,
        "bpm": float(bpm),
        "energy": energy,
        "valence": valence,
        "embedding": [norm_bpm, energy, valence],
        "lyrics": lyrics,
        "lyrics_source": "mock",
        "about": about,
        "semantic_descriptor": semantic_descriptor,
        "preview_url": "/static/audio/demo1.mp3",
    }


def load_tracks(use_mock_fallback=False, target_count=TARGET_TRACK_COUNT):
    init_db()
    db = SessionLocal()
    prepared = []
    added = 0
    updated = 0

    try:
        current_count = db.query(Track).count()
        candidates = (
            collect_mock_candidates(target_count)
            if use_mock_fallback
            else collect_deezer_candidates(target_count)
        )
        if not candidates:
            print("No tracks data available. Exiting without loading tracks.")
            return

        needed_new = max(0, target_count - current_count)
        prepared_new = 0

        for index, item in enumerate(candidates, start=1):
            existing = db.query(Track).filter_by(deezer_id=item["id"]).first()
            if existing and existing.semantic_embedding is not None and existing.about:
                continue
            if not existing and prepared_new >= needed_new:
                continue

            print(f"[{index}/{len(candidates)}] Preparing {item['artist']['name']} - {item['title']}")
            data = prepare_mock_track_data(item) if item.get("_mock") else prepare_track_data(item)
            if not data:
                continue

            prepared.append((existing, data))
            if existing:
                updated += 1
            else:
                prepared_new += 1

            if prepared_new >= needed_new and needed_new > 0:
                break

            time.sleep(0.2)

        if not prepared:
            print("No new semantic data to load.")
            return

        print(f"Embedding {len(prepared)} track descriptors...")
        descriptors = [data["semantic_descriptor"] for _, data in prepared]
        semantic_embeddings = embed_texts(descriptors)

        for (existing, data), semantic_embedding in zip(prepared, semantic_embeddings):
            if existing:
                update_existing_track(existing, data, semantic_embedding)
            else:
                db.add(Track(**data, semantic_embedding=semantic_embedding))
                added += 1

        db.commit()
        refresh_fts_vectors(db)

        total_tracks = db.query(Track).count()
        tracks_with_lyrics = db.query(Track).filter(Track.lyrics.isnot(None)).count()
        tracks_with_semantics = db.query(Track).filter(Track.semantic_embedding.isnot(None)).count()

        print(f"Loaded {added} new tracks and refreshed {updated} existing tracks.")
        print(f"Total tracks in database: {total_tracks}")
        print(f"Tracks with lyrics: {tracks_with_lyrics}")
        print(f"Tracks with semantic embeddings: {tracks_with_semantics}")
    finally:
        db.close()


def update_existing_track(track, data, semantic_embedding):
    for field, value in data.items():
        setattr(track, field, value)
    track.semantic_embedding = semantic_embedding


def refresh_fts_vectors(db):
    db.execute(text("""
        UPDATE tracks
        SET fts_vector = to_tsvector('simple',
            COALESCE(title, '') || ' ' ||
            COALESCE(artist, '') || ' ' ||
            COALESCE(genre, '') || ' ' ||
            COALESCE(about, '') || ' ' ||
            COALESCE(lyrics, ''));
    """))
    db.commit()


if __name__ == "__main__":
    load_tracks(use_mock_fallback=False)
