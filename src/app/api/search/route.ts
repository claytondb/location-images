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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const sourcesParam = searchParams.get('sources') || 'google,bing,flickr,unsplash';

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
