from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from database import Base

class Track(Base):
    __tablename__ = "tracks"
    id = Column(Integer, primary_key=True, index=True)
    deezer_id = Column(Integer, unique=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    genre = Column(String, nullable=True)
    bpm = Column(Float)
    energy = Column(Float)
    valence = Column(Float)
    embedding = Column(Vector(3))
    fts_vector = Column(Text, nullable=True)
    preview_url = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    embedding = Column(Vector(3), nullable=True)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    track_id = Column(Integer, ForeignKey("tracks.id"))
    rating = Column(Integer) 
    pulse = Column(Float)
    mood = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
    user = relationship("User")