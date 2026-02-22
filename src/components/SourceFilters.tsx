'use client';

import { ImageSource } from '@/app/page';

interface SourceFiltersProps {
  activeSources: ImageSource[];
  onToggleSource: (source: ImageSource) => void;
  sourceLabels: Record<ImageSource, string>;
}

const SOURCE_ICONS: Record<ImageSource, string> = {
  google: '🔍',
  bing: '🔎',
  flickr: '📷',
  unsplash: '📸',
  zillow: '🏠',
  redfin: '🏡',
  loc: '🏛️',
  wikimedia: '📚',
  archive: '📜',
  nypl: '🗽',
  maps: '🗺️',
};

const SOURCE_DESCRIPTIONS: Record<ImageSource, string> = {
  google: 'Google Images',
  bing: 'Bing Image Search',
  flickr: 'Flickr photos',
  unsplash: 'High-quality free photos',
  zillow: 'Real estate listings',
  redfin: 'Property photos',
  loc: 'Library of Congress historical collection',
  wikimedia: 'Wikimedia Commons public domain',
  archive: 'Internet Archive historical images',
  nypl: 'New York Public Library digital collections',
  maps: 'David Rumsey historical map collection',
};

const MODERN_SOURCES: ImageSource[] = ['google', 'bing', 'flickr', 'unsplash', 'zillow', 'redfin'];
const HISTORICAL_SOURCES: ImageSource[] = ['loc', 'wikimedia', 'archive', 'nypl', 'maps'];

export default function SourceFilters({ activeSources, onToggleSource, sourceLabels }: SourceFiltersProps) {
  const toggleAllModern = () => {
    const allModernActive = MODERN_SOURCES.every(s => activeSources.includes(s));
    if (allModernActive) {
      // Deactivate all modern
      MODERN_SOURCES.forEach(s => {
        if (activeSources.includes(s)) onToggleSource(s);
      });
    } else {
      // Activate all modern
      MODERN_SOURCES.forEach(s => {
        if (!activeSources.includes(s)) onToggleSource(s);
      });
    }
  };

  const toggleAllHistorical = () => {
    const allHistoricalActive = HISTORICAL_SOURCES.every(s => activeSources.includes(s));
    if (allHistoricalActive) {
      // Deactivate all historical
      HISTORICAL_SOURCES.forEach(s => {
        if (activeSources.includes(s)) onToggleSource(s);
      });
    } else {
      // Activate all historical
      HISTORICAL_SOURCES.forEach(s => {
        if (!activeSources.includes(s)) onToggleSource(s);
      });
    }
  };

  const renderSourceButton = (source: ImageSource) => {
    const isActive = activeSources.includes(source);
    const isHistorical = HISTORICAL_SOURCES.includes(source);
    
    return (
      <button
        key={source}
        onClick={() => onToggleSource(source)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive
            ? isHistorical
              ? 'bg-amber-600/20 border border-amber-500 text-amber-400'
              : 'bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--accent)]'
            : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
        }`}
        title={SOURCE_DESCRIPTIONS[source]}
      >
        <span>{SOURCE_ICONS[source]}</span>
        <span>{sourceLabels[source]}</span>
        {isActive && <span className="text-xs">✓</span>}
      </button>
    );
  };

  return (
    <div className="card">
      {/* Modern Sources */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--muted)]">📷 Modern Sources</h3>
          <button
            onClick={toggleAllModern}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Toggle all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODERN_SOURCES.map(renderSourceButton)}
        </div>
      </div>

      {/* Historical Sources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-amber-400">📜 Historical Archives</h3>
          <button
            onClick={toggleAllHistorical}
            className="text-xs text-amber-400 hover:underline"
          >
            Toggle all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {HISTORICAL_SOURCES.map(renderSourceButton)}
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          Historical sources include public domain images from national archives and libraries.
        </p>
      </div>
    </div>
  );
}
