import requests
import time
import random
from database import SessionLocal, init_db
from models import Track

DEEZER_API = "https://api.deezer.com"

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
    "acoustic"
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
        if any(g in genre_lower for g in ['rock', 'metal', 'hiphop']):
            valence = random.uniform(0.3, 0.7)  
        elif any(g in genre_lower for g in ['ambient', 'classical', 'chill']):
            valence = random.uniform(0.2, 0.6)  
    return round(energy, 3), round(valence, 3)

def search_deezer_tracks(query, limit=20):
    """Search tracks on Deezer by query."""
    try:
        resp = requests.get(
            f"{DEEZER_API}/search",
            params={"q": query, "limit": limit}
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
        detail_resp = requests.get(f"{DEEZER_API}/track/{track_id}")
        if detail_resp.status_code == 200:
            return detail_resp.json()
    except:
        pass
    return None

def load_tracks(use_mock_fallback=False):
    init_db()
    db = SessionLocal()
    added = 0
    all_tracks = []
    
    try:
        if use_mock_fallback:
            print("Using mock data fallback...")
            tracks_data = []
        else:
            print("Loading tracks from Deezer chart...")
            chart_resp = requests.get(
                f"{DEEZER_API}/chart/0/tracks", 
                params={"limit": 50}
            )
            chart_resp.raise_for_status()
            chart_tracks = chart_resp.json().get("data", [])
            all_tracks.extend(chart_tracks)
            print(f"Fetched {len(chart_tracks)} tracks from chart.")
            
            print("Loading tracks from low-BPM genres...")
            for genre in LOW_BPM_GENRES:
                genre_tracks = search_deezer_tracks(f"genre:{genre}", limit=10)
                all_tracks.extend(genre_tracks)
                print(f"  {genre}: {len(genre_tracks)} tracks")
                time.sleep(0.2) 
            
            print("Loading tracks by low-BPM keywords...")
            keyword_searches = [
                "bpm:60-80",
                "slow tempo",
                "relaxing",
                "meditation music",
                "study music"
            ]
            for keyword in keyword_searches:
                keyword_tracks = search_deezer_tracks(keyword, limit=10)
                all_tracks.extend(keyword_tracks)
                print(f"  '{keyword}': {len(keyword_tracks)} tracks")
                time.sleep(0.2)
            
            seen_ids = set()
            unique_tracks = []
            for track in all_tracks:
                if track["id"] not in seen_ids:
                    seen_ids.add(track["id"])
                    unique_tracks.append(track)
            
            all_tracks = unique_tracks
            print(f"Total unique tracks to process: {len(all_tracks)}")
            
    except Exception as e:
        print(f"Deezer API failed: {e}. No fallback available.")
        db.close()
        return

    if not all_tracks:
        print("No tracks data available. Exiting without loading tracks.")
        db.close()
        return

    for item in all_tracks:
        if db.query(Track).filter_by(deezer_id=item["id"]).first():
            continue
        
        detail = fetch_track_details(item["id"])
        if not detail:
            time.sleep(0.5)
            continue

        bpm = detail.get("bpm")
        if bpm is None or bpm == 0:
            genre_name = detail.get("genre", {}).get("name", "") if detail.get("genre") else ""
            if genre_name and any(g in genre_name.lower() for g in LOW_BPM_GENRES):
                bpm = random.randint(60, 90) 
            else:
                bpm = random.randint(60, 160)
        
        preview_url = detail.get("preview")
        genre = detail.get("genre", {}).get("name") if detail.get("genre") else None
        
        # Генерируем energy и valence
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
            time.sleep(0.1) 

    db.commit()
    print(f"Loaded {added} unique tracks.")
    
    tracks_with_bpm = db.query(Track).all()
    low_bpm_count = sum(1 for t in tracks_with_bpm if t.bpm < 80)
    print(f"Tracks with BPM < 80: {low_bpm_count}")
    print(f"Total tracks in database: {len(tracks_with_bpm)}")
    
    db.close()

if __name__ == "__main__":
    load_tracks(use_mock_fallback=False)