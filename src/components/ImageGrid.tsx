'use client';

import { useState } from 'react';
import { ImageResult } from '@/app/page';

interface ImageGridProps {
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

export default function ImageGrid({ images }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  const handleImageError = (id: string) => {
    setErrorImages(prev => new Set(prev).add(id));
  };

  const visibleImages = images.filter(img => !errorImages.has(img.id));

  return (
    <>
      {/* Image Grid */}
      <div className="image-grid">
        {visibleImages.map((image) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
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
              className={`w-full rounded-lg transition-all duration-300 ${
                loadedImages.has(image.id) ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-[1.02] group-hover:shadow-xl`}
              loading="lazy"
              onLoad={() => handleImageLoad(image.id)}
              onError={() => handleImageError(image.id)}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-medium truncate">{image.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${SOURCE_COLORS[image.source] || 'bg-gray-500'}`} />
                  <span className="text-white/80 text-xs">{image.source}</span>
                </div>
              </div>
            </div>

            {/* Source Badge */}
            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${SOURCE_COLORS[image.source] || 'bg-gray-500'}`}>
              {image.source}
            </div>

            {/* Year Badge */}
            {image.year && (
              <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs bg-black/70 text-amber-400 font-medium">
                {image.year}
              </div>
            )}

            {/* Historical indicator */}
            {image.isHistorical && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] bg-amber-900/80 text-amber-300">
                📜 Historical
              </div>
            )}
          </div>
        ))}
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
                      <span className="text-amber-400 font-medium">{selectedImage.year}</span>
                    </>
                  )}
                  {selectedImage.isHistorical && (
                    <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 rounded text-xs">Historical</span>
                  )}
                  {selectedImage.width && selectedImage.height && (
                    <span>• {selectedImage.width}x{selectedImage.height}</span>
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
