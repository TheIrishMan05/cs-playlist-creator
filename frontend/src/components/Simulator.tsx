import { useState, useEffect } from 'react';
import { Activity, Zap, Pause, Play } from 'lucide-react';
import { useAppState } from '../context/AppState';

export function Simulator() {
  const { state, dispatch } = useAppState();
  const { pulse } = state;
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, 5x

  useEffect(() => {
    let interval: number | null = null;
    if (isSimulating) {
      interval = window.setInterval(() => {
        // Simulate gradual pulse change: random walk between 60-180
        const change = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const newPulse = Math.max(60, Math.min(180, pulse + change));
        dispatch({ type: 'SET_PULSE', payload: newPulse });
      }, 1000 / simulationSpeed);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isSimulating, simulationSpeed, pulse, dispatch]);

  const startSimulation = () => {
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const resetToResting = () => {
    dispatch({ type: 'SET_PULSE', payload: 60 });
  };

  const simulateWorkout = () => {
    setIsSimulating(false);
    const steps = [80, 120, 150, 180, 140, 100];
    steps.forEach((step, i) => {
      setTimeout(() => {
        dispatch({ type: 'SET_PULSE', payload: step });
      }, i * 1000);
    });
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5" />
        Pulse Simulator
      </h2>
      <p className="text-neutral-400 mb-6">
        Simulate heart rate changes to see how the playlist adapts in real‑time.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-3 font-medium ${isSimulating
                  ? 'bg-red-900/30 text-red-300 border border-red-700'
                  : 'bg-primary-900/30 text-primary-300 border border-primary-700'
                }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="h-5 w-5" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Start Simulation
                </>
              )}
            </button>
            <div className="flex-shrink-0">
              <div className="text-sm text-neutral-400 mb-1">Speed</div>
              <div className="flex gap-2">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    className={`px-3 py-1 rounded-lg text-sm ${simulationSpeed === speed
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-700 text-neutral-300'
                      }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={simulateWorkout}
              className="py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Simulate Workout
            </button>
            <button
              onClick={resetToResting}
              className="py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg"
            >
              Reset to Resting
            </button>
          </div>
        </div>

        {/* Visualization */}
        <div className="bg-neutral-900/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-neutral-300">Simulation Status</div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`}></div>
              <span className="text-sm text-neutral-400">
                {isSimulating ? 'Live' : 'Paused'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Current BPM</span>
              <span className="text-2xl font-bold text-white">{pulse}</span>
            </div>
            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-300"
                style={{ width: `${((pulse - 60) / 120) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>60</span>
              <span>90</span>
              <span>120</span>
              <span>150</span>
              <span>180</span>
            </div>
          </div>
          <div className="mt-6 text-xs text-neutral-500">
            The simulator updates the heart rate slider automatically, triggering playlist refreshes when changes exceed 10 BPM.
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-700">
        <div className="text-neutral-300 mb-2">User ID Note</div>
        <p className="text-sm text-neutral-500">
          User ID can be set in the header for personalized vector blending and feedback tracking.
          The simulator focuses on heart‑rate simulation only.
        </p>
      </div>
    </div>
  );
}