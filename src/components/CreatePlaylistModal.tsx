import React, { useState } from 'react';
import { X, Plus, Layers, Mic2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { HomeSection } from '../types/music.ts';

const GRADIENT_PRESETS = [
  { label: 'Emerald Teal', value: 'from-emerald-500 to-teal-700', bg: 'bg-gradient-to-r from-emerald-500 to-teal-700' },
  { label: 'Violet Indigo', value: 'from-violet-500 to-purple-800', bg: 'bg-gradient-to-r from-violet-500 to-purple-800' },
  { label: 'Sapphire Blue', value: 'from-blue-500 to-indigo-800', bg: 'bg-gradient-to-r from-blue-500 to-indigo-800' },
  { label: 'Sunset Rose', value: 'from-rose-500 to-orange-700', bg: 'bg-gradient-to-r from-rose-500 to-orange-700' },
  { label: 'Amber Gold', value: 'from-amber-500 to-yellow-700', bg: 'bg-gradient-to-r from-amber-500 to-yellow-700' },
  { label: 'Cyan Ocean', value: 'from-cyan-500 to-blue-700', bg: 'bg-gradient-to-r from-cyan-500 to-blue-700' },
];

export const CreatePlaylistModal: React.FC = () => {
  const { isCreatePlaylistOpen, setIsCreatePlaylistOpen, createPlaylist, artists } = useMusic();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSection, setSelectedSection] = useState<HomeSection>('hindi');
  const [selectedArtistId, setSelectedArtistId] = useState<string>(
    artists[0]?.id || 'artist-arijit-singh'
  );
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value);

  if (!isCreatePlaylistOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const matchedArtist = artists.find((a) => a.id === selectedArtistId);
    createPlaylist(name.trim(), description.trim(), {
      section: selectedSection,
      artistId: selectedArtistId,
      artistName: matchedArtist?.name,
      coverGradient: selectedGradient,
    });
    setName('');
    setDescription('');
    setIsCreatePlaylistOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Playlist</h3>
              <p className="text-xs text-slate-400">
                Choose Genre Category & Featured Singer
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreatePlaylistOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Playlist Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yo Yo Honey Singh Non-Stop Hits"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Genre Category *</span>
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value as HomeSection)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="hindi">Bollywood & Hindi Superhits</option>
                <option value="bhojpuri">Bhojpuri Desi Dhamaka & Folk</option>
                <option value="bhakti">Bhakti Bhavana (Devotional)</option>
                <option value="english">English Songs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Featured Singer *</span>
              </label>
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                {artists.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a mood or description..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cover Color Theme
            </label>
            <div className="flex items-center gap-2.5">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setSelectedGradient(p.value)}
                  className={`w-7 h-7 rounded-lg ${p.bg} transition-all ${
                    selectedGradient === p.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsCreatePlaylistOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl shadow-md transition-colors"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
