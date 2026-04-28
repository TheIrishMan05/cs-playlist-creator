# Heart‑Rate & Mood‑Driven Playlist Generator

A full‑stack application that creates personalized music playlists based on real‑time heart rate and mood input. The system uses vector similarity search (pgvector) to match tracks with the user's physiological and emotional state, and includes a React/TypeScript frontend with real‑time feedback.

**Hackathon Project Plan Alignment**:
- ✅ Manual heart‑rate input (slider + simulator) – no camera‑based rPPG
- ✅ Deezer API integration for track metadata and preview URLs
- ✅ Threshold‑based playlist updates (≥10 BPM change)
- ✅ Personalized vector blending with user feedback
- ✅ Hybrid search: vector cosine + full‑text (TSVECTOR)

## Architecture Overview

```
Frontend (React/TypeScript) ↔ Backend (FastAPI) ↔ PostgreSQL + pgvector
       ↑                               ↑
   Heart‑rate slider              Vector similarity
   Mood selector                  Deezer API integration
   Audio player                   Feedback logging
   Real‑time simulator
```

## Quick Start (Demo)

### 1. Start All Services with Docker Compose
```bash
# Ensure Docker is running
docker-compose up -d
```

This command starts three services:
- **PostgreSQL + pgvector** database on port 5432
- **FastAPI backend** on port 8000 (API docs at http://localhost:8000/docs)
- **React frontend** served by nginx on port 3000 (http://localhost:3000)

### 2. Populate the Database with Tracks
```bash
# Run the loader inside the API container (recommended)
docker exec playlist_api python loader.py
```

If the Deezer API fails (e.g., integer out‑of‑range), the loader will automatically fall back to mock data and insert 30 demo tracks. You can also force mock mode:
```bash
docker exec playlist_api python -c "from loader import load_tracks; load_tracks(use_mock_fallback=True)"
```

### 3. Open the Frontend
Open your browser to **http://localhost:3000**. The frontend is already running inside the Docker container (nginx). No need to run `npm run dev` separately.

### 4. Verify the System
1. **Open the frontend** at [http://localhost:3000](http://localhost:3000).
2. **Set a User ID** (optional) in the header for personalization.
3. **Adjust the heart‑rate slider** (60–180 BPM) – playlist updates when changes exceed 10 BPM.
4. **Select a mood** (😢 Sad, 😐 Neutral, 😊 Happy, 😰 Stressed).
5. **Search** for keywords (artist/title) – hybrid search combines vector similarity with text.
6. **Play previews** – click any track card to hear the 30‑second Deezer preview.
7. **Rate tracks** with stars – feedback is sent to the backend and influences future recommendations.
8. **Use the simulator** to auto‑vary heart rate and watch the playlist adapt.

## Detailed Verification Checklist

### Backend Verification
- [ ] PostgreSQL + pgvector container is running (`docker ps`)
- [ ] FastAPI server is accessible at `http://localhost:8000`
- [ ] API docs available at `http://localhost:8000/docs`
- [ ] `/recommend` endpoint returns tracks with `preview_url`
- [ ] `/feedback` endpoint accepts POST requests and updates user embedding

### Frontend Verification
- [ ] UI loads without errors (check browser console)
- [ ] Heart‑rate slider changes pulse display instantly
- [ ] Mood selection updates UI state
- [ ] Search bar triggers debounced API calls
- [ ] Track cards show titles, artists, BPM, and preview buttons
- [ ] Audio player plays/pauses previews
- [ ] Star ratings send feedback (check network tab)
- [ ] Simulator runs and updates pulse automatically
- [ ] Feedback banner shows contextual messages based on pulse/mood

### Data Flow Verification
- [ ] Changing pulse by ≥10 BPM triggers new recommendations
- [ ] Changing mood triggers new recommendations
- [ ] Search queries combine with vector similarity
- [ ] User ID is included in API requests when set
- [ ] Audio previews use Deezer URLs (no SoundHelix fallback - tracks without previews show disabled button)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recommend` | Returns tracks matching pulse, mood, user_id, and optional query |
| POST | `/feedback` | Logs a user's rating (1–5) and updates their embedding vector |

**Example recommendation request**:
```bash
curl "http://localhost:8000/recommend?pulse=120&mood=happy&user_id=1&query=rock"
```

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app with /recommend and /feedback
│   ├── models.py            # SQLAlchemy models (Track, User, Feedback)
│   ├── database.py          # Database connection and pgvector setup
│   ├── loader.py            # Fetches tracks from Deezer, generates embeddings
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Container definition
├── frontend/
│   ├── src/
│   │   ├── api/             # API client and track service
│   │   ├── components/      # React components (Header, PulseSlider, etc.)
│   │   ├── context/         # AppState React context
│   │   ├── hooks/           # Custom hooks (useAudio, useRecommendationParams)
│   │   └── types.ts         # TypeScript interfaces
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.ts       # Build configuration
│   ├── Dockerfile           # Multi‑stage build for production
│   └── nginx.conf           # Nginx configuration for serving React and proxying API
└── docker-compose.yml       # Defines PostgreSQL + pgvector, FastAPI backend, and frontend services
```

## Key Features Implemented

### Backend
- **Vector embeddings**: Each track and user state represented as 3D vector `[norm_bpm, energy, valence]`
- **Hybrid search**: Combines cosine similarity (pgvector) with full‑text search (TSVECTOR)
- **Personalization**: User embeddings are updated via feedback with a learning rate
- **Deezer integration**: Fetches real track metadata, BPM, and preview URLs
- **Fallback data generation**: When Deezer lacks energy/valence, plausible values are generated

### Frontend
- **Threshold‑based updates**: `useRecommendationParams` hook prevents excessive API calls
- **Real‑time audio**: `useAudio` hook manages HTMLAudioElement for seamless preview playback
- **State management**: React Context + useReducer for global app state
- **Responsive UI**: Tailwind CSS with dark theme and smooth animations
- **Visual feedback**: Dynamic banner that explains how pulse/mood affect recommendations
- **Simulation tools**: Auto‑varying heart rate to demonstrate adaptive behavior

## Configuration

### Environment Variables (Optional)
Create a `.env` file in the backend directory if you need to override defaults:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/playlistdb
DEEZER_API_BASE=https://api.deezer.com
```

### Database Schema
- `tracks`: id, title, artist, bpm, energy, valence, preview_url, embedding
- `users`: id, embedding (personalized vector)
- `feedback`: id, user_id, track_id, rating, created_at

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `pgvector` extension not found | Ensure PostgreSQL container has pgvector installed (already in Dockerfile) |
| Deezer API rate limiting | Loader uses a 1‑second delay between requests; if blocked, use `use_mock_fallback=True` |
| `integer out of range` when loading tracks | Deezer IDs exceed INTEGER range; the model uses `BigInteger`. Re‑initialize database with `init_db(rebuild=True)` after updating models. |
| `column "fts_vector" is of type tsvector but expression is of type text` | The model now uses `TSVECTOR` type. Re‑initialize database with `init_db(rebuild=True)`. |
| `Internal Server Error` with `'numpy.float32' object is not iterable` or `'BinaryExpression' object has no attribute 'eval'` | Fix in `main.py`: replace `vec_score.eval(t)` with cosine similarity calculation. See commit history. |
| Frontend TypeScript errors | Run `npm install` in the `frontend/` directory |
| `npm install` fails on Windows (esbuild) | Use `npm install --legacy-peer-deps` and ensure Node.js version ≥18. |
| Backend import errors | Activate virtual environment and `pip install -r requirements.txt` |
| No audio playback | Some tracks lack preview URLs; tracks without previews show disabled play button |
| Simulator not affecting playlist | Ensure pulse changes exceed 10 BPM threshold |
| `Invalid URL` error in frontend console | The API client expects a valid base URL; in Docker, `API_BASE_URL` is empty. Update `frontend/src/api/client.ts` to handle relative URLs correctly (already fixed in the codebase). |
| Docker build fails with rollup error on Alpine Linux | Switch from `node:20-alpine` to `node:20` base image in `frontend/Dockerfile` (already fixed). |

## Development Notes

- The project follows the updated hackathon plan: **camera‑based pulse detection (rPPG) has been removed** in favor of manual input.
- All audio previews are sourced from Deezer's 30‑second samples; tracks without previews show a disabled play button (no SoundHelix fallback).
- Energy and valence values are not provided by Deezer; they are generated based on BPM and genre heuristics.
- The frontend uses TanStack React Query for efficient data fetching, caching, and background updates.

## License

Academic project for ITMO University P3330 Neurotechnology & Affective Computing, 2026.
