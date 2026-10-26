import React, { useState, useEffect } from 'react';
import { X, Edit3, Layers, Mic2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Playlist, HomeSection } from '../types/music.ts';
import { resolvePlaylistSection, resolvePlaylistArtist } from '../utils/audioUtils.ts';

interface EditPlaylistModalProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_OPTIONS: { value: HomeSection; label: string }[] = [
  { value: 'hindi', label: 'Bollywood & Hindi Superhits' },
  { value: 'bhojpuri', label: 'Bhojpuri Desi Dhamaka & Folk Beats' },
  { value: 'bhakti', label: 'Bhakti Bhavana (Devotional)' },
  { value: 'english', label: 'English Songs' },
];

export const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  playlist,
  isOpen,
  onClose,
}) => {
  const { editPlaylist, updatePlaylistPlacement, artists, tracks } = useMusic();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<HomeSection>('hindi');
  const [artistId, setArtistId] = useState<string>('');

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description);
      setSection(resolvePlaylistSection(playlist));
      const resolvedArt = resolvePlaylistArtist(playlist, artists, tracks);
      setArtistId(resolvedArt?.id || artists[0]?.id || 'artist-1');
    }
  }, [playlist, artists, tracks]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const selectedArtist = artists.find((a) => a.id === artistId) || artists[0];
    editPlaylist(playlist.id, name.trim(), description.trim());
    updatePlaylistPlacement(
      playlist.id,
      section,
      selectedArtist?.id || artists[0]?.id || 'artist-1'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Playlist & Placement</h3>
              <p className="text-xs text-slate-400">
                Update details, Genre Category, and Featured Singer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Synthwave"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Place 1: Genre Category */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Genre Category
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as HomeSection)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-500"
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Place 2: Featured Singer */}
          <div>
            <label className="block text-xs font-semibold text-emerald-300 mb-1.5 flex items-center gap-1.5">
              <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
              Featured Singer
            </label>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-500"
            >
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name} ({artist.language})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a description..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl shadow-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
