'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Image as DreiImage, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { ImageResult } from '@/app/page';

interface View3DProps {
  images: ImageResult[];
  centerCoordinates?: { lat: number; lng: number };
}

interface ImagePlaneProps {
  image: ImageResult;
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick: () => void;
}

function ImagePlane({ image, position, rotation = [0, 0, 0], onClick }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[2, 1.5]} />
        <Suspense fallback={
          <meshBasicMaterial color="#333" />
        }>
          <ImageMaterial url={image.thumbnail || image.url} />
        </Suspense>
      </mesh>
      {hovered && (
        <Html position={[0, -1, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap max-w-[200px] truncate">
            {image.title}
            {image.year && <span className="text-amber-400 ml-1">({image.year})</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function ImageMaterial({ url }: { url: string }) {
  return (
    <meshBasicMaterial>
      <DreiImage url={url} transparent />
    </meshBasicMaterial>
  );
}

function CenterMarker() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <circleGeometry args={[15, 64]} />
      <meshStandardMaterial color="#1a1a1a" transparent opacity={0.5} />
    </mesh>
  );
}

function Scene({ images, onSelectImage }: { images: ImageResult[]; onSelectImage: (img: ImageResult) => void }) {
  const { camera } = useThree();
  
  // Separate images with position data from those without
  const mappedImages: { image: ImageResult; position: [number, number, number]; rotation: [number, number, number] }[] = [];
  
  // Distribute images in a circle around the center
  // In a real implementation, we'd use actual GPS coordinates and camera angles
  const radius = 8;
  const angleStep = (2 * Math.PI) / Math.max(images.length, 1);
  
  images.forEach((image, index) => {
    const angle = index * angleStep;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 1 + (index % 3) * 0.5; // Slight vertical variation
    
    // Face toward center
    const rotationY = Math.atan2(-x, -z);
    
    mappedImages.push({
      image,
      position: [x, y, z],
      rotation: [0, rotationY, 0],
    });
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <CenterMarker />
      <Ground />
      
      {mappedImages.map(({ image, position, rotation }) => (
        <ImagePlane
          key={image.id}
          image={image}
          position={position}
          rotation={rotation}
          onClick={() => onSelectImage(image)}
        />
      ))}
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        target={[0, 1, 0]}
      />
    </>
  );
}

export default function View3D({ images, centerCoordinates }: View3DProps) {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  return (
    <div className="relative">
      {/* 3D Canvas */}
      <div className="h-[600px] rounded-lg overflow-hidden border border-[var(--border)] bg-[#0a0a0a]">
        <Canvas camera={{ position: [0, 5, 12], fov: 60 }}>
          <Scene images={images} onSelectImage={setSelectedImage} />
        </Canvas>
      </div>

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded">
        <div>🖱️ Drag to rotate • Scroll to zoom • Click image to view</div>
        {centerCoordinates && (
          <div className="mt-1 text-[var(--muted)]">
            📍 Center: {centerCoordinates.lat.toFixed(4)}, {centerCoordinates.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Image count */}
      <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-2 rounded">
        {images.length} images mapped
      </div>

      {/* Selected Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
            />
            <div className="bg-[var(--card)] rounded-lg p-4 mt-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedImage.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-[var(--muted)]">
                  <span>{selectedImage.source}</span>
                  {selectedImage.year && (
                    <span className="text-amber-400">{selectedImage.year}</span>
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
                <button
                  onClick={() => setSelectedImage(null)}
                  className="btn btn-primary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
