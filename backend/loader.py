import requests
import time
import random
from database import SessionLocal, init_db
from models import Track

DEEZER_API = "https://api.deezer.com"

def normalize(val, min_v, max_v):
    return max(0.0, min(1.0, (val - min_v) / (max_v - min_v)))

def generate_energy_valence(bpm, genre=None):
    """Generate plausible energy and valence based on BPM and genre."""
    # Energy: higher for faster BPM, with some randomness
    energy = normalize(bpm, 60, 180) * 0.7 + random.uniform(0.1, 0.3)
    energy = max(0.1, min(1.0, energy))
    
    # Valence: mood-like, random but biased by energy
    valence = random.uniform(0.2, 0.9)
    if genre and any(g in genre.lower() for g in ['rock', 'metal', 'hiphop']):
        valence = random.uniform(0.3, 0.7)  # more neutral
    return round(energy, 3), round(valence, 3)

def load_tracks(use_mock_fallback=False):
    init_db()
    db = SessionLocal()
    added = 0
    
    try:
        if use_mock_fallback:
            print("Using mock data fallback...")
            tracks_data = []
        else:
            resp = requests.get(f"{DEEZER_API}/chart/0/tracks", params={"limit": 100})
            resp.raise_for_status()
            tracks_data = resp.json()["data"]
            print(f"Fetched {len(tracks_data)} tracks from Deezer.")
    except Exception as e:
        print(f"Deezer API failed: {e}. Falling back to mock data.")
        tracks_data = []
        use_mock_fallback = True
    
    if not tracks_data:
        # Generate mock tracks
        mock_titles = [
            "Blinding Lights", "Stay", "As It Was", "Bad Habits", "Heat Waves",
            "Levitating", "Save Your Tears", "Shivers", "Industry Baby", "Good 4 U",
            "Kill Bill", "Flowers", "Anti-Hero", "Creepin'", "Unholy"
        ]
        mock_artists = [
            "The Weeknd", "The Kid LAROI", "Harry Styles", "Ed Sheeran", "Glass Animals",
            "Dua Lipa", "The Weeknd", "Ed Sheeran", "Lil Nas X", "Olivia Rodrigo",
            "SZA", "Miley Cyrus", "Taylor Swift", "Metro Boomin", "Sam Smith"
        ]
        for i in range(30):
            tracks_data.append({
                "id": 1000000 + i,
                "title": mock_titles[i % len(mock_titles)],
                "artist": {"name": mock_artists[i % len(mock_artists)]},
                "bpm": random.randint(70, 160),
                "preview": f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{(i % 10) + 1}.mp3",
                "genre": {"name": random.choice(["Pop", "Rock", "Hip Hop", "Electronic", "R&B"])}
            })
    
    for item in tracks_data:
        if db.query(Track).filter_by(deezer_id=item["id"]).first():
            continue
        
        # For mock data, we already have bpm and preview
        if use_mock_fallback:
            bpm = item["bpm"]
            preview_url = item.get("preview")
            genre = item.get("genre", {}).get("name")
        else:
            # Fetch track details from Deezer
            detail_resp = requests.get(f"{DEEZER_API}/track/{item['id']}")
            if detail_resp.status_code != 200:
                time.sleep(0.5)
                continue
            detail = detail_resp.json()
            bpm = detail.get("bpm", random.randint(70, 160))
            preview_url = detail.get("preview")
            genre = detail.get("genre", {}).get("name") if detail.get("genre") else None
        
        # Generate energy and valence
        energy, valence = generate_energy_valence(bpm, genre)
        norm_bpm = normalize(bpm, 60, 180)
        
        track = Track(
            deezer_id=item["id"],
            title=item["title"],
            artist=item["artist"]["name"],
            genre=genre,
            bpm=float(bpm),
            energy=energy,
            valence=valence,
            embedding=[norm_bpm, energy, valence],
            preview_url=preview_url
        )
        db.add(track)
        added += 1
        if not use_mock_fallback:
            time.sleep(0.1)  # respect rate limits
    
    db.commit()
    print(f"Loaded {added} unique tracks.")
    db.close()

if __name__ == "__main__":
    load_tracks(use_mock_fallback=False)