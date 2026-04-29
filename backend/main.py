from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import numpy as np
import httpx

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


import logging

logger = logging.getLogger(__name__)

@app.get("/audio-proxy")
async def audio_proxy(url: str = Query(..., description="URL of the audio to proxy")):
    """
    Proxy audio requests to bypass CORS restrictions.
    Fetches audio from the given URL and returns it with appropriate CORS headers.
    Supports multiple audio sources with different header configurations.
    """
    logger.info(f"Audio proxy request for URL: {url[:100]}...")
    
    # Define different header configurations for different audio sources
    header_configs = [
        # Configuration 1: Deezer-specific headers
        {
            'name': 'deezer',
            'headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.deezer.com/',
                'Origin': 'https://www.deezer.com',
            },
            'condition': lambda u: 'deezer' in u.lower() or 'cdn-preview' in u.lower()
        },
        # Configuration 2: SoundHelix - minimal headers
        {
            'name': 'soundhelix',
            'headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'audio/*',
            },
            'condition': lambda u: 'soundhelix' in u.lower()
        },
        # Configuration 3: Mixkit - generic headers
        {
            'name': 'mixkit',
            'headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'audio/*',
                'Referer': 'https://mixkit.co/',
            },
            'condition': lambda u: 'mixkit' in u.lower()
        },
        # Configuration 4: Default generic headers for any URL
        {
            'name': 'default',
            'headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'audio/*, */*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            'condition': lambda u: True  # Always matches
        }
    ]
    
    # Select the appropriate header configuration
    selected_config = None
    for config in header_configs:
        if config['condition'](url):
            selected_config = config
            logger.info(f"Selected header config: {config['name']} for URL")
            break
    
    if not selected_config:
        selected_config = header_configs[-1]  # Use default
    
    last_error = None
    last_status_code = None
    
    # Try with the selected configuration first
    for attempt in range(2):  # Try up to 2 times with different approaches
        try:
            headers = selected_config['headers']
            
            # On second attempt for Deezer URLs, try without referrer/origin
            if attempt == 1 and selected_config['name'] == 'deezer':
                headers = headers.copy()
                headers.pop('Referer', None)
                headers.pop('Origin', None)
                logger.info("Retrying Deezer URL without referrer/origin headers")
            
            async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as client:
                response = await client.get(url)
                logger.info(f"Audio proxy response status: {response.status_code}, content-type: {response.headers.get('content-type')}")
                
                if response.status_code == 200:
                    # Determine content type
                    content_type = response.headers.get("content-type", "audio/mpeg")
                    
                    # Return the audio with CORS headers
                    return Response(
                        content=response.content,
                        media_type=content_type,
                        headers={
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, OPTIONS",
                            "Access-Control-Allow-Headers": "*",
                            "Access-Control-Max-Age": "86400",
                            "Cache-Control": "public, max-age=3600"
                        }
                    )
                else:
                    last_status_code = response.status_code
                    logger.warning(f"Audio source returned {response.status_code} for URL: {url[:100]}...")
                    
                    # Check if this is an expired Deezer URL
                    is_deezer_url = 'deezer' in url.lower() or 'cdn-preview' in url.lower()
                    is_expired = response.status_code == 403 and is_deezer_url
                    
                    # If this is the first attempt and we got 403/404, try next config
                    if attempt == 0 and response.status_code in [403, 404, 500]:
                        continue
                    else:
                        # Provide more helpful error message for expired Deezer URLs
                        if is_expired:
                            raise HTTPException(
                                status_code=410,  # 410 Gone - more appropriate for expired content
                                detail="Audio preview has expired. Deezer preview URLs are time-limited and need to be refreshed."
                            )
                        else:
                            raise HTTPException(
                                status_code=response.status_code,
                                detail=f"{response.status_code}: Audio source returned {response.status_code}"
                            )
                        
        except httpx.RequestError as e:
            last_error = str(e)
            logger.error(f"httpx.RequestError (attempt {attempt+1}): {str(e)}")
            
            # If this is the first attempt, try next config
            if attempt == 0:
                continue
            else:
                raise HTTPException(status_code=502, detail=f"Failed to fetch audio: {str(e)}")
    
    # If we get here, all attempts failed
    error_detail = f"All attempts failed. Last status: {last_status_code}, error: {last_error}"
    logger.error(error_detail)
    raise HTTPException(status_code=502, detail=error_detail)