from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import numpy as np

from database import SessionLocal, engine
from models import Track, User, Feedback

app = FastAPI(title="AI Playlist + Hybrid Search + Online Learning")

# Add CORS middleware to allow requests from frontend dev server and Docker frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:80", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def pulse_to_vector(pulse: int, mood: Optional[str] = None) -> list[float]:
    norm_pulse = max(0.0, min(1.0, (pulse - 60) / 120))
    vec = [norm_pulse, norm_pulse, 0.5]
    
    if mood == "sad":
        vec[2] = 0.2; vec[1] = min(vec[1], 0.4)
    elif mood == "happy":
        vec[2] = 0.8
    elif mood == "stressed":
        vec[1] = 0.9; vec[2] = 0.3
    return vec

def update_user_embedding(db: Session, user_id: int, track_embedding: list[float], rating: int, lr: float = 0.1):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        user = User(id=user_id, embedding=track_embedding)
        db.add(user)
        db.commit()
        return

    current = np.array(user.embedding)
    target = np.array(track_embedding)
    new_emb = current + lr * rating * (target - current)
    user.embedding = np.clip(new_emb, 0, 1).tolist()
    db.commit()

@app.get("/recommend")
def recommend(
    pulse: int = Query(..., ge=60, le=180),
    mood: str = Query(None),
    user_id: int = Query(None, description="ID пользователя для персонализации"),
    query: str = Query(None, description="Текстовый запрос для гибридного поиска"),
    db: Session = Depends(get_db)
):
    target_vec = pulse_to_vector(pulse, mood)
    
    if user_id:
        user = db.query(User).filter_by(id=user_id).first()
        if user and user.embedding:
            target_vec = (0.7 * np.array(target_vec) + 0.3 * np.array(user.embedding)).tolist()


    vec_dist = Track.embedding.cosine_distance(target_vec)
    vec_score = 1 - vec_dist
    
    fts_rank = None
    if query:
        from sqlalchemy import func
        search_q = func.plainto_tsquery('simple', query)
        fts_rank = func.ts_rank_cd(Track.fts_vector, search_q)
        

    min_bpm = max(60, pulse - 20)
    max_bpm = min(180, pulse + 20)
    q = db.query(Track).filter(Track.bpm.between(min_bpm, max_bpm))


    if fts_rank is not None:
        combined = (0.6 * vec_score) + (0.4 * fts_rank)
        q = q.order_by(combined.desc())
    else:
        q = q.order_by(vec_dist)

    results = q.limit(10).all()
    
    def cosine_similarity(vec1, vec2):
        # vec1 is list, vec2 may be list or numpy array
        import numpy as np
        if hasattr(vec2, 'tolist'):
            vec2 = vec2.tolist()
        # ensure both are lists of floats
        v1 = [float(x) for x in vec1]
        v2 = [float(x) for x in vec2]
        dot = sum(a*b for a,b in zip(v1, v2))
        norm1 = sum(a*a for a in v1) ** 0.5
        norm2 = sum(b*b for b in v2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)
    
    return [{
        "id": t.id,
        "title": t.title,
        "artist": t.artist,
        "bpm": t.bpm,
        "energy": round(t.energy, 2),
        "valence": round(t.valence, 2),
        "score": round(cosine_similarity(target_vec, t.embedding), 3) if fts_rank is None else None,
        "preview_url": t.preview_url
    } for t in results]


class FeedbackRequest(BaseModel):
    user_id: int
    track_id: int
    rating: int 

@app.post("/feedback")
def log_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    track = db.query(Track).filter_by(id=data.track_id).first()
    if not track:
        raise HTTPException(404, "Track not found")
        
    fb = Feedback(**data.dict())
    db.add(fb)
    
    update_user_embedding(db, data.user_id, track.embedding, data.rating)
    
    return {"status": "ok", "message": "Preference vector updated"}