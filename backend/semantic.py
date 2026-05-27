from __future__ import annotations

import hashlib
import json
import math
import os
import re
from functools import lru_cache
from typing import Iterable

SEMANTIC_VECTOR_DIM = 384
SEMANTIC_MODEL = os.getenv(
    "SEMANTIC_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)

LYRICS_EXCERPT_CHARS = 1800

THEME_DEFINITIONS = {
    "love": {
        "label": "love, romance, tenderness, devotion",
        "keywords": [
            "love",
            "lover",
            "romance",
            "romantic",
            "kiss",
            "heart",
            "darling",
            "baby",
            "forever",
            "together",
            "любов",
            "люблю",
            "сердц",
            "поцел",
            "роман",
        ],
    },
    "breakup": {
        "label": "breakup, heartbreak, letting go",
        "keywords": [
            "breakup",
            "goodbye",
            "left me",
            "miss you",
            "cry",
            "tears",
            "heartbreak",
            "broken",
            "разлук",
            "расстав",
            "скуч",
            "слез",
            "прощ",
        ],
    },
    "loneliness": {
        "label": "loneliness, isolation, feeling unseen",
        "keywords": [
            "alone",
            "lonely",
            "silence",
            "empty",
            "nobody",
            "stranger",
            "invisible",
            "lost",
            "sad",
            "melancholy",
            "blue",
            "один",
            "одинок",
            "пуст",
            "тишин",
            "потер",
            "груст",
            "печал",
            "тоск",
        ],
    },
    "party": {
        "label": "party, dancing, nightlife, celebration",
        "keywords": [
            "party",
            "club",
            "dance",
            "dancing",
            "drink",
            "lights",
            "dj",
            "вечерин",
            "танц",
            "клуб",
            "ночь",
            "огни",
        ],
    },
    "confidence": {
        "label": "confidence, ambition, self-belief",
        "keywords": [
            "win",
            "winner",
            "money",
            "power",
            "dream",
            "hustle",
            "strong",
            "fire",
            "king",
            "queen",
            "побед",
            "сильн",
            "мечт",
            "деньги",
            "огонь",
        ],
    },
    "rebellion": {
        "label": "rebellion, anger, conflict, resistance",
        "keywords": [
            "fight",
            "riot",
            "rage",
            "war",
            "enemy",
            "break the rules",
            "rebel",
            "hate",
            "борьб",
            "войн",
            "злост",
            "ненав",
            "бунт",
        ],
    },
    "nostalgia": {
        "label": "nostalgia, memory, longing for the past",
        "keywords": [
            "remember",
            "memories",
            "yesterday",
            "old days",
            "childhood",
            "back then",
            "past",
            "вспом",
            "памят",
            "детств",
            "прошл",
            "раньше",
        ],
    },
    "hope": {
        "label": "hope, healing, moving forward",
        "keywords": [
            "hope",
            "rise",
            "sun",
            "morning",
            "better",
            "heal",
            "free",
            "alive",
            "happy",
            "joy",
            "надеж",
            "солнц",
            "утр",
            "свобод",
            "жив",
            "радост",
            "счаст",
            "весел",
            "весёл",
        ],
    },
    "road": {
        "label": "travel, road, motion, escape",
        "keywords": [
            "road",
            "drive",
            "driving",
            "car",
            "highway",
            "city",
            "train",
            "run away",
            "путь",
            "дорог",
            "поезд",
            "город",
            "машин",
            "бежать",
        ],
    },
    "calm": {
        "label": "calm, softness, rest, focus",
        "keywords": [
            "calm",
            "soft",
            "quiet",
            "sleep",
            "dreaming",
            "rain",
            "ocean",
            "breathe",
            "спок",
            "тих",
            "сон",
            "дожд",
            "дыш",
            "нежн",
        ],
    },
}


def clean_lyrics(lyrics: str | None) -> str:
    if not lyrics:
        return ""

    text = re.sub(r"\[[^\]]+\]", " ", lyrics)
    text = re.sub(r"\(\s*(chorus|verse|bridge|intro|outro)[^)]+\)", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_theme_labels(text: str | None, limit: int = 3) -> list[str]:
    if not text:
        return []

    lowered = text.lower()
    scores: list[tuple[int, str]] = []
    for theme in THEME_DEFINITIONS.values():
        score = 0
        for keyword in theme["keywords"]:
            keyword = keyword.lower()
            if " " in keyword:
                score += lowered.count(keyword) * 3
            else:
                score += len(re.findall(rf"(?<!\w){re.escape(keyword)}\w*", lowered))
        if score:
            scores.append((score, theme["label"]))

    scores.sort(key=lambda item: item[0], reverse=True)
    return [label for _, label in scores[:limit]]


def infer_mood_tags(bpm: float | None, energy: float | None, valence: float | None) -> list[str]:
    tags: list[str] = []

    if bpm is not None:
        if bpm < 85:
            tags.append("slow tempo")
        elif bpm > 125:
            tags.append("fast tempo")
        else:
            tags.append("moderate tempo")

    if energy is not None:
        if energy < 0.35:
            tags.append("low energy")
        elif energy > 0.7:
            tags.append("high energy")
        else:
            tags.append("medium energy")

    if valence is not None:
        if valence < 0.35:
            tags.append("melancholic")
        elif valence > 0.65:
            tags.append("upbeat")
        else:
            tags.append("bittersweet")

    return tags


def infer_about(
    *,
    title: str,
    artist: str,
    genre: str | None,
    lyrics: str | None,
    bpm: float | None,
    energy: float | None,
    valence: float | None,
) -> str:
    cleaned = clean_lyrics(lyrics)
    themes = extract_theme_labels(cleaned)
    mood_tags = infer_mood_tags(bpm, energy, valence)

    if not themes:
        themes = _fallback_themes_from_mood(mood_tags, genre)

    theme_text = "; ".join(themes)
    mood_text = ", ".join(mood_tags) if mood_tags else "unspecified mood"
    genre_text = f" in a {genre} setting" if genre else ""

    if cleaned:
        return (
            f"The song centers on {theme_text}{genre_text}. "
            f"The lyrical perspective and sound suggest {mood_text}."
        )

    return (
        f"No lyrics were found, so the description is inferred from metadata: "
        f"{title} by {artist} points to {theme_text}{genre_text}, with {mood_text}."
    )


def build_track_descriptor(
    *,
    title: str,
    artist: str,
    genre: str | None,
    bpm: float | None,
    energy: float | None,
    valence: float | None,
    lyrics: str | None,
    about: str,
) -> str:
    cleaned = clean_lyrics(lyrics)
    payload = {
        "track": {
            "title": title,
            "artist": artist,
            "genre": genre,
        },
        "sound": {
            "bpm": round(float(bpm), 2) if bpm is not None else None,
            "energy": round(float(energy), 3) if energy is not None else None,
            "valence": round(float(valence), 3) if valence is not None else None,
            "mood_tags": infer_mood_tags(bpm, energy, valence),
        },
        "meaning": {
            "about": about,
            "themes": extract_theme_labels(cleaned or about),
            "lyrics_available": bool(cleaned),
        },
        "lyrics_excerpt": cleaned[:LYRICS_EXCERPT_CHARS],
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def build_query_descriptor(query: str) -> str:
    themes = extract_theme_labels(query)
    payload = {
        "playlist_request": query,
        "desired_themes": themes,
        "intent": "find tracks whose lyrical meaning, mood, and metadata match this playlist request",
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]


def embed_texts(texts: Iterable[str]) -> list[list[float]]:
    prepared = [text if text and text.strip() else "empty music descriptor" for text in texts]
    model = _load_sentence_transformer()

    if model is not None:
        try:
            vectors = model.encode(
                prepared,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return [_coerce_vector(vector) for vector in vectors]
        except Exception:
            pass

    return [_hash_embedding(text) for text in prepared]


def cosine_similarity(vec1: Iterable[float] | None, vec2: Iterable[float] | None) -> float:
    if vec1 is None or vec2 is None:
        return 0.0

    left = [float(value) for value in vec1]
    right = [float(value) for value in vec2]
    if not left or not right:
        return 0.0

    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    if norm_left == 0 or norm_right == 0:
        return 0.0

    return dot / (norm_left * norm_right)


@lru_cache(maxsize=1)
def _load_sentence_transformer():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(SEMANTIC_MODEL)
    except Exception:
        return None


def _fallback_themes_from_mood(mood_tags: list[str], genre: str | None) -> list[str]:
    tags = set(mood_tags)
    themes: list[str] = []

    if "melancholic" in tags or "low energy" in tags:
        themes.append("introspection, softness, melancholy")
    if "upbeat" in tags or "high energy" in tags:
        themes.append("movement, confidence, uplift")
    if genre:
        themes.append(f"{genre} atmosphere")

    return themes or ["general emotional storytelling"]


def _coerce_vector(vector) -> list[float]:
    if hasattr(vector, "tolist"):
        vector = vector.tolist()

    values = [float(value) for value in vector]
    if len(values) == SEMANTIC_VECTOR_DIM:
        return values

    if len(values) > SEMANTIC_VECTOR_DIM:
        return _normalize(values[:SEMANTIC_VECTOR_DIM])

    return _normalize(values + [0.0] * (SEMANTIC_VECTOR_DIM - len(values)))


def _hash_embedding(text: str) -> list[float]:
    tokens = re.findall(r"[\w']+", text.lower(), flags=re.UNICODE)
    features: list[str] = []
    features.extend(tokens)

    for index in range(len(tokens) - 1):
        features.append(f"{tokens[index]}_{tokens[index + 1]}")

    for token in tokens:
        if len(token) > 4:
            for index in range(len(token) - 3):
                features.append(token[index : index + 4])

    if not features:
        features = ["empty"]

    vector = [0.0] * SEMANTIC_VECTOR_DIM
    for feature in features:
        digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
        position = int.from_bytes(digest[:4], byteorder="big") % SEMANTIC_VECTOR_DIM
        sign = 1.0 if digest[4] & 1 else -1.0
        vector[position] += sign

    return _normalize(vector)


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]
