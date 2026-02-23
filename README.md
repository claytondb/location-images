# 📍 Location Spy

Find images of any location through time. Aggregates photos from modern sources and historical archives to show how places have changed over decades.

## Features

### 🔍 Multi-Source Search
Search across 10+ image sources simultaneously:
- **Modern:** Google, Bing, Flickr, Unsplash
- **Real Estate:** Zillow, Redfin
- **Historical:** Library of Congress, Wikimedia Commons, Internet Archive, NYPL
- **Maps:** Historical maps and surveys

### 📅 Timeline View
See images arranged chronologically to visualize how a location changed over time.

### 🌐 3D View
Explore images positioned on an interactive 3D globe using Three.js.

### 🎯 Geo-Search
Search by coordinates with configurable radius (1-50 km) for precise location matching.

### 📜 Historical Archives
Automatic integration with:
- Library of Congress digital collections
- Internet Archive's historical photos
- Wikimedia Commons
- New York Public Library

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **3D:** Three.js (dynamic import, client-only)
- **APIs:** Multiple image search APIs

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Usage

1. Enter an address, city, or landmark
2. Select which sources to search
3. Toggle geo-search for coordinate-based filtering
4. Toggle "Photos only" to filter out icons/illustrations
5. View results as Grid, Timeline, or 3D globe

## Search Options

| Option | Description |
|--------|-------------|
| **Photos only** | Filter out icons, logos, and illustrations |
| **Geo-search** | Search by coordinates instead of text |
| **Radius** | How far from coordinates to search (1-50 km) |

## Example Searches

- `Keaau, Hawaii` - See how a small town changed over decades
- `Empire State Building, New York` - Historical construction photos
- `1600 Pennsylvania Avenue` - Historical images of the White House

## Project Structure

```
src/
├── app/
│   ├── page.tsx         # Main search interface
│   └── api/
│       └── search/      # Image search API
├── components/
│   ├── ImageGrid.tsx    # Grid view
│   ├── Timeline.tsx     # Chronological view
│   ├── View3D.tsx       # 3D globe view
│   ├── SearchForm.tsx   # Search input
│   └── SourceFilters.tsx
└── lib/
```

## Sources

Images are sourced from public APIs and archives:
- Google Images API
- Bing Image Search
- Flickr API
- Library of Congress API
- Internet Archive
- Wikimedia Commons API

---

*See how places change through time* 🕰️
