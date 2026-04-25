import requests
import time
from database import SessionLocal, init_db
from models import Track

DEEZER_API = "https://api.deezer.com"

def normalize(val, min_v, max_v):
    return max(0.0, min(1.0, (val - min_v) / (max_v - min_v)))

def load_tracks():
    init_db()
    db = SessionLocal()
    try:
        resp = requests.get(f"{DEEZER_API}/chart/0/tracks", params={"limit": 100})
        resp.raise_for_status()
        tracks_data = resp.json()["data"]

        added = 0
        for item in tracks_data:
            if db.query(Track).filter_by(deezer_id=item["id"]).first():
                continue


            detail_resp = requests.get(f"{DEEZER_API}/track/{item['id']}")
            if detail_resp.status_code != 200:
                time.sleep(0.5)
                continue
                
            detail = detail_resp.json()
            bpm = detail.get("bpm", 120)
            gain = detail.get("gain", 0.0)
            
  
            norm_bpm = normalize(bpm, 60, 180)
            energy = normalize(gain, -1.0, 1.0)
            valence = 0.5 
            
            track = Track(
                deezer_id=detail["id"],
                title=detail["title"],
                artist=detail["artist"]["name"],
                genre=detail.get("genre", {}).get("name") if detail.get("genre") else None,
                bpm=bpm,
                energy=energy,
                valence=valence,
                embedding=[norm_bpm, energy, valence]
            )
            db.add(track)
            added += 1
            time.sleep(0.1) 

        db.commit()
        print(f"Загружено {added} уникальных треков.")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    load_tracks()