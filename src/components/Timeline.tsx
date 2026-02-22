'use client';

import { useState, useMemo } from 'react';
import { ImageResult } from '@/app/page';

interface TimelineProps {
  images: ImageResult[];
}

const SOURCE_COLORS: Record<string, string> = {
  google: 'bg-blue-500',
  bing: 'bg-teal-500',
  flickr: 'bg-pink-500',
  unsplash: 'bg-gray-500',
  zillow: 'bg-blue-600',
  redfin: 'bg-red-500',
  loc: 'bg-amber-600',
  wikimedia: 'bg-green-600',
  archive: 'bg-orange-600',
  nypl: 'bg-purple-600',
  maps: 'bg-yellow-600',
};

interface TimelinePeriod {
  label: string;
  startYear: number;
  endYear: number;
  images: ImageResult[];
}

export default function Timeline({ images }: TimelineProps) {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  // Group images by time periods
  const periods = useMemo(() => {
    const now = new Date().getFullYear();
    
    // Define periods
    const periodDefs: { label: string; start: number; end: number }[] = [
      { label: '2020s', start: 2020, end: now },
      { label: '2010s', start: 2010, end: 2019 },
      { label: '2000s', start: 2000, end: 2009 },
      { label: '1990s', start: 1990, end: 1999 },
      { label: '1980s', start: 1980, end: 1989 },
      { label: '1970s', start: 1970, end: 1979 },
      { label: '1960s', start: 1960, end: 1969 },
      { label: '1950s', start: 1950, end: 1959 },
      { label: '1940s', start: 1940, end: 1949 },
      { label: '1930s', start: 1930, end: 1939 },
      { label: '1920s', start: 1920, end: 1929 },
      { label: '1910s', start: 1910, end: 1919 },
      { label: '1900s', start: 1900, end: 1909 },
      { label: '1800s', start: 1800, end: 1899 },
      { label: 'Earlier', start: 0, end: 1799 },
    ];

    const result: TimelinePeriod[] = [];
    const undated: ImageResult[] = [];

    // Sort images by year
    const sortedImages = [...images].sort((a, b) => {
      if (!a.year && !b.year) return 0;
      if (!a.year) return 1;
      if (!b.year) return -1;
      return b.year - a.year; // Most recent first
    });

    // Group into periods
    for (const img of sortedImages) {
      if (!img.year) {
        undated.push(img);
        continue;
      }

      const period = periodDefs.find(p => img.year! >= p.start && img.year! <= p.end);
      if (period) {
        let existing = result.find(r => r.label === period.label);
        if (!existing) {
          existing = {
            label: period.label,
            startYear: period.start,
            endYear: period.end,
            images: [],
          };
          result.push(existing);
        }
        existing.images.push(img);
      }
    }

    // Add undated images as "Unknown Date"
    if (undated.length > 0) {
      result.push({
        label: 'Modern / Unknown Date',
        startYear: now,
        endYear: now,
        images: undated,
      });
    }

    // Sort periods by start year (most recent first)
    return result.sort((a, b) => b.startYear - a.startYear);
  }, [images]);

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  const handleImageError = (id: string) => {
    setErrorImages(prev => new Set(prev).add(id));
  };

  // Get year range for display
  const yearRange = useMemo(() => {
    const years = images.filter(img => img.year).map(img => img.year!);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return { min, max, span: max - min };
  }, [images]);

  return (
    <>
      {/* Timeline Header */}
      {yearRange && (
        <div className="mb-8 text-center">
          <div className="inline-block bg-[var(--card)] rounded-full px-6 py-2 border border-[var(--border)]">
            <span className="text-2xl font-bold">{yearRange.min}</span>
            <span className="mx-4 text-[var(--muted)]">→</span>
            <span className="text-2xl font-bold">{yearRange.max}</span>
            <span className="ml-3 text-[var(--muted)] text-sm">
              ({yearRange.span} years of history)
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[var(--border)]" />

        {/* Periods */}
        <div className="space-y-8">
          {periods.map((period) => (
            <div key={period.label} className="relative">
              {/* Period marker */}
              <div className="absolute left-6 w-4 h-4 rounded-full bg-[var(--accent)] border-4 border-[var(--background)]" />
              
              {/* Period content */}
              <div className="ml-16">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold">{period.label}</h3>
                  <span className="text-sm text-[var(--muted)]">
                    {period.images.length} image{period.images.length !== 1 ? 's' : ''}
                  </span>
                  {period.label !== 'Modern / Unknown Date' && (
                    <span className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded">
                      Historical
                    </span>
                  )}
                </div>

                {/* Image grid for this period */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {period.images
                    .filter(img => !errorImages.has(img.id))
                    .map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer aspect-square"
                      onClick={() => setSelectedImage(image)}
                    >
                      {/* Loading placeholder */}
                      {!loadedImages.has(image.id) && (
                        <div className="absolute inset-0 bg-[var(--card)] rounded-lg animate-pulse" />
                      )}
                      
                      {/* Image */}
                      <img
                        src={image.thumbnail || image.url}
                        alt={image.title}
                        className={`w-full h-full object-cover rounded-lg transition-all duration-300 ${
                          loadedImages.has(image.id) ? 'opacity-100' : 'opacity-0'
                        } group-hover:scale-105 group-hover:shadow-xl`}
                        loading="lazy"
                        onLoad={() => handleImageLoad(image.id)}
                        onError={() => handleImageError(image.id)}
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-white text-xs font-medium truncate">{image.title}</p>
                          {image.year && (
                            <p className="text-white/80 text-xs">{image.year}</p>
                          )}
                        </div>
                      </div>

                      {/* Source Badge */}
                      <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] text-white ${SOURCE_COLORS[image.source] || 'bg-gray-500'}`}>
                        {image.source}
                      </div>

                      {/* Year Badge */}
                      {image.year && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/70 text-white">
                          {image.year}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>

            {/* Info Bar */}
            <div className="bg-[var(--card)] rounded-lg p-4 mt-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedImage.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-[var(--muted)]">
                  <span className={`w-2 h-2 rounded-full ${SOURCE_COLORS[selectedImage.source] || 'bg-gray-500'}`} />
                  <span>{selectedImage.source}</span>
                  {selectedImage.year && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400">{selectedImage.year}</span>
                    </>
                  )}
                  {selectedImage.date && (
                    <>
                      <span>•</span>
                      <span>{selectedImage.date}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={selectedImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost text-sm"
                >
                  View Source ↗
                </a>
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-sm"
                >
                  Open Full Size ↗
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="btn btn-ghost text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
