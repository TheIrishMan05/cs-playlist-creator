from sqlalchemy import create_engine, text, Column, String
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/playlist_db")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db(rebuild: bool = False):
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    
    if rebuild:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)
    
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE tracks 
            ADD COLUMN IF NOT EXISTS fts_vector tsvector;
        """))
        
        conn.execute(text("""
            ALTER TABLE tracks
            ALTER COLUMN fts_vector TYPE tsvector
            USING to_tsvector('simple',
                COALESCE(title, '') || ' ' ||
                COALESCE(artist, '') || ' ' ||
                COALESCE(genre, '')); 
        """))

        conn.execute(text("""
        UPDATE tracks 
        SET fts_vector = to_tsvector('simple', 
            COALESCE(title, '') || ' ' || 
            COALESCE(artist, '') || ' ' || 
            COALESCE(genre, ''))
        WHERE fts_vector IS NULL;
    """))
    
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_tracks_vec 
            ON tracks USING hnsw (embedding vector_cosine_ops);
            
            CREATE INDEX IF NOT EXISTS idx_tracks_fts 
            ON tracks USING GIN (fts_vector);
        """))
        conn.commit()