import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppStateProvider } from './context/AppState';
import { Header } from './components/Header';
import { PulseSlider } from './components/PulseSlider';
import { MoodSelector } from './components/MoodSelector';
import { SearchBar } from './components/SearchBar';
import { TrackList } from './components/TrackList';
import { Simulator } from './components/Simulator';
import { AudioPlayer } from './components/AudioPlayer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <div className="min-h-screen bg-neutral-900 text-white">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <PulseSlider />
                <MoodSelector />
                <SearchBar />
                <Simulator />
              </div>
              <div className="lg:col-span-1">
                <TrackList />
              </div>
            </div>
          </main>
          <AudioPlayer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#27272a',
                color: '#fff',
                border: '1px solid #3f3f46',
              },
            }}
          />
        </div>
      </AppStateProvider>
    </QueryClientProvider>
  );
}

export default App;