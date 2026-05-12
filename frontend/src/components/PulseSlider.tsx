import React from 'react';
import { Sliders } from 'lucide-react';
import { useAppState } from '../context/AppState';

export function PulseSlider() {
  const { state, dispatch } = useAppState();
  const { pulse } = state;

  const handlePulseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_PULSE', payload: parseInt(e.target.value, 10) });
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Heart Rate Input
        </h2>
        <div className="text-sm text-neutral-400 px-3 py-1 bg-neutral-700 rounded-lg">
          Manual Mode Only
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-neutral-300">Current Pulse</span>
            <div className="text-3xl font-bold text-white">{pulse} <span className="text-lg text-neutral-400">BPM</span></div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="60"
              max="180"
              value={pulse}
              onChange={handlePulseChange}
              className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-neutral-900"
              aria-label="Adjust heart rate"
            />
            <div className="flex justify-between text-sm text-neutral-400 mt-2">
              <span>60 BPM</span>
              <span>120 BPM</span>
              <span>180 BPM</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => dispatch({ type: 'SET_PULSE', payload: 60 })}
            className="py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
          >
            Resting (60)
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PULSE', payload: 120 })}
            className="py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
          >
            Walking (120)
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PULSE', payload: 180 })}
            className="py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
          >
            Running (180)
          </button>
        </div>
      </div>
    </div>
  );
}