import React from 'react';
import { Smile, Frown, Meh, Flame } from 'lucide-react';
import { useAppState } from '../context/AppState';
import { Mood, moodOptions } from '../types';

const moodIcons: Record<Mood, React.ReactNode> = {
  sad: <Frown className="h-6 w-6" />,
  neutral: <Meh className="h-6 w-6" />,
  happy: <Smile className="h-6 w-6" />,
  stressed: <Flame className="h-6 w-6" />,
};

export function MoodSelector() {
  const { state, dispatch } = useAppState();
  const { mood } = state;

  const handleSelect = (selectedMood: Mood | null) => {
    dispatch({ type: 'SET_MOOD', payload: selectedMood });
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Smile className="h-5 w-5" />
        Mood Selector
      </h2>
      <p className="text-neutral-400 mb-6">Select your current mood to influence track recommendations.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {moodOptions.map((option) => {
          const isSelected = mood === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all duration-200 ${isSelected
                  ? 'border-primary-500 bg-primary-900/30 text-white'
                  : 'border-neutral-700 bg-neutral-900/50 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800'
                }`}
              aria-label={`Select ${option.label} mood`}
            >
              <div className="text-3xl mb-2">{option.emoji}</div>
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-neutral-400 mt-1">
                {option.value === 'sad' && 'Low energy, melancholic'}
                {option.value === 'neutral' && 'Balanced, calm'}
                {option.value === 'happy' && 'Upbeat, positive'}
                {option.value === 'stressed' && 'High energy, tense'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-700">
        <div className="flex items-center justify-between">
          <span className="text-neutral-300">Selected mood:</span>
          <div className="flex items-center gap-3">
            {mood ? (
              <>
                <span className="text-2xl">{moodOptions.find(o => o.value === mood)?.emoji}</span>
                <span className="text-white font-semibold text-lg">
                  {moodOptions.find(o => o.value === mood)?.label}
                </span>
              </>
            ) : (
              <span className="text-neutral-400 italic">No mood selected</span>
            )}
          </div>
          <button
            onClick={() => handleSelect(null)}
            className="px-4 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 rounded-lg transition"
            disabled={!mood}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}