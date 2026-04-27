import React, { useState } from 'react';
import { Heart, Wifi, WifiOff, User } from 'lucide-react';
import { useAppState } from '../context/AppState';

export function Header() {
  const { state, dispatch } = useAppState();
  const { connectionStatus, userId } = state;
  const [inputUserId, setInputUserId] = useState(userId?.toString() || '');

  const handleSetUserId = () => {
    const id = parseInt(inputUserId, 10);
    if (!isNaN(id) && id > 0) {
      dispatch({ type: 'SET_USER_ID', payload: id });
    } else {
      dispatch({ type: 'SET_USER_ID', payload: null });
    }
  };

  const handleClearUserId = () => {
    dispatch({ type: 'SET_USER_ID', payload: null });
    setInputUserId('');
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Heart className="h-8 w-8 text-red-500 animate-heartbeat" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Playlist AI</h1>
            <p className="text-sm text-neutral-400">Музыка под ритм сердца</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User ID input */}
          <div className="hidden md:flex items-center gap-2 bg-neutral-800 px-3 py-2 rounded-lg">
            <User className="h-4 w-4 text-neutral-400" />
            <input
              type="number"
              min="1"
              value={inputUserId}
              onChange={(e) => setInputUserId(e.target.value)}
              placeholder="User ID"
              className="w-20 bg-transparent text-white text-sm placeholder-neutral-500 focus:outline-none"
            />
            <button
              onClick={handleSetUserId}
              className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 rounded transition"
            >
              Set
            </button>
            {userId && (
              <button
                onClick={handleClearUserId}
                className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-neutral-300">
              {connectionStatus === 'connected' ? 'Сервер подключен' :
               connectionStatus === 'disconnected' ? 'Сервер недоступен' : 'Проверка соединения...'}
            </span>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 bg-neutral-800 px-4 py-2 rounded-lg">
            <span className="text-neutral-400 text-sm">Live pulse:</span>
            <span className="text-white font-semibold text-lg">{state.pulse}</span>
            <span className="text-neutral-400 text-sm">BPM</span>
          </div>
        </div>
      </div>
    </header>
  );
}