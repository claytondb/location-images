import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ImageResult {
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

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Scrape Google Images
async function scrapeGoogleImages(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Google embeds image data in scripts
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      // Look for image URLs in the script content
      const urlMatches = content.match(/\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
      if (urlMatches) {
        for (const match of urlMatches.slice(0, 15)) {
          const url = match.slice(2, -1); // Remove [" and "
          if (url.includes('gstatic.com') || url.includes('google.com')) continue;
          if (url.length > 500) continue; // Skip data URIs
          
          images.push({
            id: `google-${images.length}-${Date.now()}`,
            url: url,
            thumbnail: url,
            title: `${query} - Image ${images.length + 1}`,
            source: 'google',
            sourceUrl: searchUrl,
          });
        }
      }
    }

    return images.slice(0, 12);
  } catch (error) {
    console.error('Google scrape failed:', error);
    return [];
  }
}

// Scrape Bing Images
async function scrapeBingImages(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&safeSearch=Strict`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Bing uses data attributes on image elements
    $('a.iusc').each((i, el) => {
      if (i >= 12) return false;
      
      const m = $(el).attr('m');
      if (m) {
        try {
          const data = JSON.parse(m);
          if (data.murl) {
            images.push({
              id: `bing-${i}-${Date.now()}`,
              url: data.murl,
              thumbnail: data.turl || data.murl,
              title: data.t || `${query} - Image ${i + 1}`,
              source: 'bing',
              sourceUrl: data.purl || searchUrl,
            });
          }
        } catch {}
      }
    });

    // Fallback: look for img tags
    if (images.length === 0) {
      $('img.mimg').each((i, el) => {
        if (i >= 12) return false;
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.startsWith('data:')) {
          images.push({
            id: `bing-${i}-${Date.now()}`,
            url: src,
            thumbnail: src,
            title: $(el).attr('alt') || `${query} - Image ${i + 1}`,
            source: 'bing',
            sourceUrl: searchUrl,
          });
        }
      });
    }

    return images;
  } catch (error) {
    console.error('Bing scrape failed:', error);
    return [];
  }
}

// Scrape Flickr (public search page)
async function scrapeFlickr(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://www.flickr.com/search/?text=${encodeURIComponent(query)}&safe_search=1`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Flickr embeds photo data in a script
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      if (content.includes('modelExport')) {
        // Extract photo URLs from the model
        const photoMatches = content.match(/"url":"(https:\/\/live\.staticflickr\.com\/[^"]+)"/g);
        if (photoMatches) {
          for (let i = 0; i < Math.min(photoMatches.length, 12); i++) {
            const url = photoMatches[i].match(/"url":"([^"]+)"/)?.[1];
            if (url) {
              // Convert to larger size
              const largeUrl = url.replace(/_[a-z]\.jpg$/, '_b.jpg');
              images.push({
                id: `flickr-${i}-${Date.now()}`,
                url: largeUrl,
                thumbnail: url,
                title: `${query} - Flickr Photo ${i + 1}`,
                source: 'flickr',
                sourceUrl: searchUrl,
              });
            }
          }
        }
        break;
      }
    }

    return images;
  } catch (error) {
    console.error('Flickr scrape failed:', error);
    return [];
  }
}

// Search Unsplash (their source URLs work without API)
async function scrapeUnsplash(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Look for image elements
    $('img[srcset]').each((i, el) => {
      if (i >= 12) return false;
      
      const srcset = $(el).attr('srcset');
      const alt = $(el).attr('alt') || query;
      
      if (srcset && srcset.includes('unsplash.com')) {
        // Get the largest image from srcset
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
        const url = urls[urls.length - 1] || urls[0];
        
        if (url && !images.some(img => img.url === url)) {
          images.push({
            id: `unsplash-${i}-${Date.now()}`,
            url: url,
            thumbnail: urls[0] || url,
            title: alt,
            source: 'unsplash',
            sourceUrl: searchUrl,
          });
        }
      }
    });

    // Fallback to source.unsplash if scraping didn't work
    if (images.length === 0) {
      for (let i = 0; i < 8; i++) {
        images.push({
          id: `unsplash-${i}-${Date.now()}`,
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}&sig=${i}`,
          thumbnail: `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}&sig=${i}`,
          title: `${query} - Unsplash`,
          source: 'unsplash',
          sourceUrl: searchUrl,
        });
      }
    }

    return images;
  } catch (error) {
    console.error('Unsplash scrape failed:', error);
    return [];
  }
}

// Scrape Zillow
async function scrapeZillow(query: string): Promise<ImageResult[]> {
  try {
    // Search Zillow for the location
    const searchUrl = `https://www.zillow.com/homes/${encodeURIComponent(query.replace(/\s+/g, '-'))}_rb/`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Zillow embeds property data in scripts
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('zpid') || content.includes('imgSrc')) {
        // Look for image URLs
        const imgMatches = content.match(/"imgSrc":"(https:\/\/[^"]+)"/g);
        if (imgMatches) {
          for (let j = 0; j < Math.min(imgMatches.length, 10); j++) {
            const url = imgMatches[j].match(/"imgSrc":"([^"]+)"/)?.[1];
            if (url) {
              images.push({
                id: `zillow-${j}-${Date.now()}`,
                url: url.replace(/_[a-z]\.jpg/, '_f.jpg'), // Get full size
                thumbnail: url,
                title: `${query} - Zillow Property ${j + 1}`,
                source: 'zillow',
                sourceUrl: searchUrl,
              });
            }
          }
        }
      }
    });

    // Also check for property cards
    $('img[src*="zillowstatic.com"], img[src*="zillow.com"]').each((i, el) => {
      if (images.length >= 12) return false;
      const src = $(el).attr('src');
      if (src && !src.includes('logo') && !src.includes('icon')) {
        images.push({
          id: `zillow-img-${i}-${Date.now()}`,
          url: src,
          thumbnail: src,
          title: $(el).attr('alt') || `${query} - Zillow ${i + 1}`,
          source: 'zillow',
          sourceUrl: searchUrl,
        });
      }
    });

    return images.slice(0, 12);
  } catch (error) {
    console.error('Zillow scrape failed:', error);
    return [];
  }
}

// Scrape Redfin
async function scrapeRedfin(query: string): Promise<ImageResult[]> {
  try {
    // First, search for the location
    const searchUrl = `https://www.redfin.com/stingray/do/location-autocomplete?v=2&location=${encodeURIComponent(query)}`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    
    const searchText = await searchRes.text();
    // Redfin returns {}&&{...} format
    const jsonStr = searchText.replace(/^\{\}\&\&/, '');
    
    let regionUrl = `https://www.redfin.com/city/0/XX/${encodeURIComponent(query.replace(/\s+/g, '-'))}`;
    
    try {
      const searchData = JSON.parse(jsonStr);
      if (searchData.payload?.sections?.[0]?.rows?.[0]?.url) {
        regionUrl = `https://www.redfin.com${searchData.payload.sections[0].rows[0].url}`;
      }
    } catch {}

    const res = await fetch(regionUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Look for property images
    $('img[src*="ssl.cdn-redfin.com"], img[src*="redfin.com"]').each((i, el) => {
      if (images.length >= 12) return false;
      const src = $(el).attr('src');
      if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
        // Get larger version
        const largeSrc = src.replace(/\/genisys\./, '/bigphoto.').replace(/_[0-9]+\./, '_0.');
        images.push({
          id: `redfin-${i}-${Date.now()}`,
          url: largeSrc,
          thumbnail: src,
          title: $(el).attr('alt') || `${query} - Redfin Property ${i + 1}`,
          source: 'redfin',
          sourceUrl: regionUrl,
        });
      }
    });

    // Also check script tags for image data
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      const imgMatches = content.match(/"(https:\/\/ssl\.cdn-redfin\.com\/photo[^"]+)"/g);
      if (imgMatches) {
        for (const match of imgMatches.slice(0, 10)) {
          const url = match.slice(1, -1);
          if (!images.some(img => img.url.includes(url.split('/').pop() || ''))) {
            images.push({
              id: `redfin-script-${images.length}-${Date.now()}`,
              url: url,
              thumbnail: url,
              title: `${query} - Redfin Property`,
              source: 'redfin',
              sourceUrl: regionUrl,
            });
          }
        }
      }
    });

    return images.slice(0, 12);
  } catch (error) {
    console.error('Redfin scrape failed:', error);
    return [];
  }
}

// Scrape Library of Congress
async function scrapeLibraryOfCongress(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://www.loc.gov/pictures/search/?q=${encodeURIComponent(query)}&fo=json&c=20`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    const data = await res.json();
    const images: ImageResult[] = [];

    if (data.results) {
      for (const item of data.results.slice(0, 12)) {
        const imageUrl = item.image?.full || item.image?.thumb;
        if (imageUrl) {
          // Extract year from date field
          let year: number | undefined;
          if (item.date) {
            const yearMatch = item.date.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
            if (yearMatch) year = parseInt(yearMatch[1]);
          }
          
          images.push({
            id: `loc-${item.pk}-${Date.now()}`,
            url: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
            thumbnail: item.image?.thumb ? (item.image.thumb.startsWith('//') ? `https:${item.image.thumb}` : item.image.thumb) : imageUrl,
            title: item.title || `${query} - Historical`,
            source: 'loc',
            sourceUrl: `https://www.loc.gov${item.link || ''}`,
            year,
            date: item.date,
            isHistorical: true,
          });
        }
      }
    }

    return images;
  } catch (error) {
    console.error('Library of Congress scrape failed:', error);
    return [];
  }
}

// Scrape Wikimedia Commons
async function scrapeWikimediaCommons(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=15&format=json&origin=*`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    const data = await res.json();
    const images: ImageResult[] = [];

    if (data.query?.search) {
      for (const item of data.query.search) {
        const title = item.title;
        // Get actual image URL
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
        
        try {
          const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': USER_AGENT } });
          const infoData = await infoRes.json();
          const pages = infoData.query?.pages;
          
          if (pages) {
            const page = Object.values(pages)[0] as Record<string, unknown>;
            const imageinfo = (page.imageinfo as Record<string, unknown>[])?.[0];
            
            if (imageinfo?.url) {
              const extmeta = imageinfo.extmetadata as Record<string, { value: string }> | undefined;
              let year: number | undefined;
              let dateStr: string | undefined;
              
              // Try to get date from metadata
              if (extmeta?.DateTimeOriginal?.value) {
                dateStr = extmeta.DateTimeOriginal.value;
                const yearMatch = dateStr.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
                if (yearMatch) year = parseInt(yearMatch[1]);
              } else if (extmeta?.DateTime?.value) {
                dateStr = extmeta.DateTime.value;
                const yearMatch = dateStr.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
                if (yearMatch) year = parseInt(yearMatch[1]);
              }

              // Check if it's historical (before 2000)
              const isHistorical = year ? year < 2000 : false;

              images.push({
                id: `wikimedia-${images.length}-${Date.now()}`,
                url: imageinfo.url as string,
                thumbnail: (imageinfo.url as string).replace(/\/([^/]+)$/, '/thumb/$1/400px-$1'),
                title: title.replace('File:', '').replace(/\.[^.]+$/, ''),
                source: 'wikimedia',
                sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
                year,
                date: dateStr,
                isHistorical,
              });
            }
          }
        } catch {}
      }
    }

    return images.slice(0, 10);
  } catch (error) {
    console.error('Wikimedia Commons scrape failed:', error);
    return [];
  }
}

// Scrape Internet Archive
async function scrapeInternetArchive(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+mediatype:image&output=json&rows=15&fl[]=identifier,title,date,year`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    const data = await res.json();
    const images: ImageResult[] = [];

    if (data.response?.docs) {
      for (const item of data.response.docs) {
        const identifier = item.identifier;
        // Internet Archive image URL pattern
        const imageUrl = `https://archive.org/download/${identifier}/__ia_thumb.jpg`;
        const fullUrl = `https://archive.org/download/${identifier}/${identifier}.jpg`;
        
        let year: number | undefined;
        if (item.year) {
          year = parseInt(item.year);
        } else if (item.date) {
          const yearMatch = item.date.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
          if (yearMatch) year = parseInt(yearMatch[1]);
        }

        images.push({
          id: `archive-${identifier}-${Date.now()}`,
          url: fullUrl,
          thumbnail: imageUrl,
          title: item.title || `${query} - Archive`,
          source: 'archive',
          sourceUrl: `https://archive.org/details/${identifier}`,
          year,
          date: item.date,
          isHistorical: true,
        });
      }
    }

    return images;
  } catch (error) {
    console.error('Internet Archive scrape failed:', error);
    return [];
  }
}

// Scrape NYPL Digital Collections
async function scrapeNYPL(query: string): Promise<ImageResult[]> {
  try {
    const searchUrl = `https://api.repo.nypl.org/api/v2/items/search?q=${encodeURIComponent(query)}&per_page=12&page=1`;
    
    // NYPL API requires a token, so we'll scrape the public site instead
    const publicUrl = `https://digitalcollections.nypl.org/search/index?utf8=%E2%9C%93&keywords=${encodeURIComponent(query)}`;
    
    const res = await fetch(publicUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    $('.result-item, .search-result').each((i, el) => {
      if (i >= 12) return false;
      
      const img = $(el).find('img').first();
      const link = $(el).find('a').first();
      const src = img.attr('src') || img.attr('data-src');
      
      if (src) {
        // Try to extract date from the item
        const text = $(el).text();
        let year: number | undefined;
        const yearMatch = text.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
        if (yearMatch) year = parseInt(yearMatch[1]);

        images.push({
          id: `nypl-${i}-${Date.now()}`,
          url: src.replace('_s.jpg', '_g.jpg').replace('/t/', '/b/'),
          thumbnail: src,
          title: img.attr('alt') || link.text()?.trim() || `${query} - NYPL`,
          source: 'nypl',
          sourceUrl: link.attr('href') ? `https://digitalcollections.nypl.org${link.attr('href')}` : publicUrl,
          year,
          isHistorical: true,
        });
      }
    });

    return images;
  } catch (error) {
    console.error('NYPL scrape failed:', error);
    return [];
  }
}

// Scrape Old Maps/Historical imagery
async function scrapeHistoricalMaps(query: string): Promise<ImageResult[]> {
  try {
    // David Rumsey Map Collection
    const searchUrl = `https://www.davidrumsey.com/luna/servlet/as/search?q=${encodeURIComponent(query)}&sort=Pub_Date%2CList_No&lc=RUMSEY~8~1&search=Search`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: ImageResult[] = [];

    // Parse search results
    $('img[src*="Size0"]').each((i, el) => {
      if (i >= 8) return false;
      
      const src = $(el).attr('src');
      if (src) {
        const largeSrc = src.replace('Size0', 'Size2');
        const title = $(el).attr('alt') || $(el).attr('title') || `${query} - Historical Map`;
        
        // Extract year from title or nearby text
        let year: number | undefined;
        const yearMatch = title.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
        if (yearMatch) year = parseInt(yearMatch[1]);

        images.push({
          id: `map-${i}-${Date.now()}`,
          url: largeSrc,
          thumbnail: src,
          title: title,
          source: 'maps',
          sourceUrl: searchUrl,
          year,
          isHistorical: true,
        });
      }
    });

    return images;
  } catch (error) {
    console.error('Historical maps scrape failed:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const sourcesParam = searchParams.get('sources') || 'google,bing,flickr,unsplash,loc,wikimedia,archive';

  if (!location) {
    return NextResponse.json({ error: 'Location is required' }, { status: 400 });
  }

  const sources = sourcesParam.split(',');
  const searchPromises: Promise<ImageResult[]>[] = [];

  // Queue up searches for each source
  if (sources.includes('google')) {
    searchPromises.push(scrapeGoogleImages(location));
  }
  if (sources.includes('bing')) {
    searchPromises.push(scrapeBingImages(location));
  }
  if (sources.includes('flickr')) {
    searchPromises.push(scrapeFlickr(location));
  }
  if (sources.includes('unsplash')) {
    searchPromises.push(scrapeUnsplash(location));
  }
  if (sources.includes('zillow')) {
    searchPromises.push(scrapeZillow(location));
  }
  if (sources.includes('redfin')) {
    searchPromises.push(scrapeRedfin(location));
  }
  if (sources.includes('loc')) {
    searchPromises.push(scrapeLibraryOfCongress(location));
  }
  if (sources.includes('wikimedia')) {
    searchPromises.push(scrapeWikimediaCommons(location));
  }
  if (sources.includes('archive')) {
    searchPromises.push(scrapeInternetArchive(location));
  }
  if (sources.includes('nypl')) {
    searchPromises.push(scrapeNYPL(location));
  }
  if (sources.includes('maps')) {
    searchPromises.push(scrapeHistoricalMaps(location));
  }

  try {
    const results = await Promise.all(searchPromises);
    const allImages = results.flat();

    // Remove duplicates based on URL
    const seen = new Set<string>();
    const uniqueImages = allImages.filter(img => {
      const key = img.url.split('?')[0]; // Ignore query params for deduplication
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Shuffle results to mix sources
    const shuffled = uniqueImages.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      images: shuffled,
      count: shuffled.length,
      sources: [...new Set(shuffled.map(img => img.source))],
    });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
