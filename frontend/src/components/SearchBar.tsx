import { Search, X } from 'lucide-react';
import { useAppState } from '../context/AppState';

export function SearchBar() {
  const { state, dispatch } = useAppState();
  const { query } = state;

  const handleChange = (value: string) => {
    if (value !== query) {
      dispatch({ type: 'SET_QUERY', payload: value });
    }
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Search className="h-5 w-5" />
        Semantic Playlist Search
      </h2>
      <p className="text-neutral-400 mb-6">
        Describe the playlist you want. Search will match the meaning of lyrics, track context, and mood descriptors.
      </p>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-neutral-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Sad indie for a late night walk, energetic tracks about confidence..."
          className="w-full pl-12 pr-12 py-4 bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Search tracks"
        />
        {query && (
          <button
            onClick={() => handleChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <span className="text-sm text-neutral-400">Quick suggestions:</span>
        {[
          'music about lonely city nights',
          'warm love songs for a slow evening',
          'confident tracks for a workout',
          'calm focus music with soft lyrics',
          'nostalgic road trip songs',
        ].map((tag) => (
          <button
            key={tag}
            onClick={() => handleChange(tag)}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg text-sm transition"
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-neutral-300">Search status:</span>
            <span
              className={`ml-3 px-3 py-1 rounded-full text-sm ${query ? 'bg-primary-900/30 text-primary-300' : 'bg-neutral-900 text-neutral-400'}`}
            >
              {query ? `Active: "${query}"` : 'Inactive'}
            </span>
          </div>
          <div className="text-sm text-neutral-400">
            {query ? 'Semantic ranking active' : 'Pulse ranking active'}
          </div>
        </div>
      </div>
    </div>
  );
}
