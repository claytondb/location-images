'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import ImageGrid from '@/components/ImageGrid';
import Timeline from '@/components/Timeline';
import SearchForm from '@/components/SearchForm';
import SourceFilters from '@/components/SourceFilters';

// Dynamic import for 3D view (Three.js needs client-side only)
const View3D = dynamic(() => import('@/components/View3D'), { 
  ssr: false,
  loading: () => <div className="h-[600px] bg-[var(--card)] rounded-lg flex items-center justify-center">Loading 3D view...</div>
});

export interface ImageResult {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  sourceUrl: string;
  width?: number;
  height?: number;
  year?: number;
  date?: string;
  isHistorical?: boolean;
}

export type ImageSource = 'google' | 'bing' | 'flickr' | 'unsplash' | 'zillow' | 'redfin' | 'loc' | 'wikimedia' | 'archive' | 'nypl' | 'maps';

const SOURCE_LABELS: Record<ImageSource, string> = {
  google: 'Google',
  bing: 'Bing',
  flickr: 'Flickr',
  unsplash: 'Unsplash',
  zillow: 'Zillow',
  redfin: 'Redfin',
  loc: 'Library of Congress',
  wikimedia: 'Wikimedia Commons',
  archive: 'Internet Archive',
  nypl: 'NYPL',
  maps: 'Historical Maps',
};

type ViewMode = 'grid' | 'timeline' | '3d';

const RECENT_SEARCHES_KEY = 'locationspy-recent-searches';
const MAX_RECENT_SEARCHES = 5;

export default function Home() {
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<ImageSource[]>(['google', 'bing', 'flickr', 'unsplash', 'loc', 'wikimedia', 'archive']);
  const [selectedSource, setSelectedSource] = useState<ImageSource | 'all' | 'historical'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [geoSearch, setGeoSearch] = useState(true);
  const [geoRadius, setGeoRadius] = useState(10); // km
  const [photosOnly, setPhotosOnly] = useState(true);
  const [usedCoordinates, setUsedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save a search to recent searches
  const addRecentSearch = (location: string) => {
    const updated = [location, ...recentSearches.filter(s => s !== location)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSearch = async (location: string, coordinates?: { lat: number; lng: number }) => {
    setLoading(true);
    setError(null);
    setImages([]);
    setSearchedLocation(location);
    setUsedCoordinates(null);
    addRecentSearch(location);

    try {
      const params = new URLSearchParams({
        location,
        sources: activeSources.join(','),
        safeSearch: 'true',
        geoSearch: geoSearch.toString(),
        photosOnly: photosOnly.toString(),
        radius: geoRadius.toString(),
      });
      
      if (coordinates) {
        params.set('lat', coordinates.lat.toString());
        params.set('lng', coordinates.lng.toString());
      }

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setImages(data.images || []);
      
      // Store coordinates if geo-search was used
      if (data.coordinates) {
        setUsedCoordinates(data.coordinates);
      }
      
      // Auto-switch to timeline if we have historical images
      const hasHistorical = (data.images || []).some((img: ImageResult) => img.isHistorical || img.year);
      if (hasHistorical) {
        setViewMode('timeline');
      }
    } catch (err) {
      setError('Failed to search for images. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = selectedSource === 'all' 
    ? images 
    : selectedSource === 'historical'
    ? images.filter(img => img.isHistorical || img.year)
    : images.filter(img => img.source === selectedSource);

  const sourceCounts = images.reduce((acc, img) => {
    acc[img.source] = (acc[img.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const historicalCount = images.filter(img => img.isHistorical || img.year).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <h1 className="text-xl font-bold">Location Images</h1>
          </div>
          <div className="text-sm text-[var(--muted)]">
            Aggregate images from any location across time
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <div className="mb-6">
          <SearchForm onSearch={handleSearch} loading={loading} />
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--muted)]">Recent:</span>
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(search)}
                  className="text-sm px-3 py-1 bg-[var(--card)] border border-[var(--border)] rounded-full hover:border-[var(--accent)] transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Source Filters */}
        <div className="mb-6">
          <SourceFilters
            activeSources={activeSources}
            onToggleSource={(source) => {
              setActiveSources(prev => 
                prev.includes(source) 
                  ? prev.filter(s => s !== source)
                  : [...prev, source]
              );
            }}
            sourceLabels={SOURCE_LABELS}
          />
        </div>

        {/* Search Options */}
        <div className="card mb-6">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-3">🔧 Search Options</h3>
          <div className="flex flex-wrap gap-6">
            {/* Photos Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={photosOnly}
                onChange={(e) => setPhotosOnly(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span className="text-sm">Photos only</span>
              <span className="text-xs text-[var(--muted)]">(filter out icons/illustrations)</span>
            </label>

            {/* Geo-Search Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={geoSearch}
                onChange={(e) => setGeoSearch(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span className="text-sm">Geo-search</span>
              <span className="text-xs text-[var(--muted)]">(search by coordinates)</span>
            </label>

            {/* Radius Selector (only show if geo-search is on) */}
            {geoSearch && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted)]">Radius:</span>
                <select
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(parseInt(e.target.value))}
                  className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm"
                >
                  <option value="1">1 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                </select>
              </div>
            )}
          </div>

          {/* Show coordinates if geo-search was used */}
          {usedCoordinates && (
            <div className="mt-3 text-xs text-[var(--muted)]">
              📍 Searching near: {usedCoordinates.lat.toFixed(4)}, {usedCoordinates.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="card bg-red-500/10 border-red-500/50 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin text-4xl mb-4">🔄</div>
            <p className="text-[var(--muted)]">Searching for images of {searchedLocation}...</p>
            <p className="text-sm text-[var(--muted)] mt-2">Including historical archives...</p>
          </div>
        )}

        {/* Results */}
        {!loading && images.length > 0 && (
          <div>
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {filteredImages.length} images found for "{searchedLocation}"
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  From {Object.keys(sourceCounts).length} sources
                  {historicalCount > 0 && ` • ${historicalCount} historical`}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex bg-[var(--card)] rounded-lg p-1 border border-[var(--border)]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded text-sm transition-all ${
                      viewMode === 'grid'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    ⊞ Grid
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1.5 rounded text-sm transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    📅 Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`px-3 py-1.5 rounded text-sm transition-all ${
                      viewMode === '3d'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    🌐 3D
                  </button>
                </div>
              </div>
            </div>

            {/* Source Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedSource === 'all'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              >
                All ({images.length})
              </button>
              {historicalCount > 0 && (
                <button
                  onClick={() => setSelectedSource('historical')}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedSource === 'historical'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-900/30 border border-amber-600/50 text-amber-400 hover:border-amber-500'
                  }`}
                >
                  📜 Historical ({historicalCount})
                </button>
              )}
              {Object.entries(sourceCounts).map(([source, count]) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source as ImageSource)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedSource === source
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                >
                  {SOURCE_LABELS[source as ImageSource] || source} ({count})
                </button>
              ))}
            </div>

            {/* Image Display */}
            {viewMode === 'grid' && <ImageGrid images={filteredImages} />}
            {viewMode === 'timeline' && <Timeline images={filteredImages} />}
            {viewMode === '3d' && (
              <Suspense fallback={<div className="h-[600px] bg-[var(--card)] rounded-lg flex items-center justify-center">Loading 3D view...</div>}>
                <View3D images={filteredImages} centerCoordinates={usedCoordinates || undefined} />
              </Suspense>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && searchedLocation && (
          <div className="text-center py-16">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-[var(--muted)]">No images found for "{searchedLocation}"</p>
            <p className="text-sm text-[var(--muted)] mt-2">Try a different location or enable more sources</p>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchedLocation && (
          <div className="text-center py-16">
            <span className="text-6xl mb-6 block">🏠</span>
            <h2 className="text-2xl font-bold mb-4">Find images of any location through time</h2>
            <p className="text-[var(--muted)] max-w-md mx-auto mb-6">
              Enter an address, city, or landmark to aggregate images from modern sources 
              and historical archives. See how places have changed over decades.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="px-3 py-1 bg-[var(--card)] rounded-full">📷 Modern Photos</span>
              <span className="px-3 py-1 bg-amber-900/30 text-amber-400 rounded-full">📜 Historical Archives</span>
              <span className="px-3 py-1 bg-[var(--card)] rounded-full">🗺️ Vintage Maps</span>
              <span className="px-3 py-1 bg-[var(--card)] rounded-full">🏠 Real Estate</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-sm text-[var(--muted)]">
          Images sourced from public APIs, archives, and search engines. Historical images from Library of Congress, Internet Archive, and Wikimedia Commons.
        </div>
      </footer>
    </div>
  );
}
