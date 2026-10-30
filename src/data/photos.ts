import raw from './photos.json';

// Royalty-free photos (Pexels license: free to use, no attribution required). IDs were taken
// from Pexels pages found during the image search; images are loaded from the Pexels CDN at
// view time and fall back to token-built brand art when they cannot load (offline, blocked).

export interface Photo {
  id: string;
  theme: string;
  alt: string;
  url: string;
  page: string;
  credit: string;
  license: string;
  verified: boolean;
}

export const PHOTOS: Photo[] = (raw as { photos: Photo[] }).photos;

const byId = new Map(PHOTOS.map((p) => [p.id, p]));

export function getPhoto(id: string | undefined): Photo | undefined {
  return id ? byId.get(id) : undefined;
}

/** Same image at another width (Pexels CDN resizes on the fly). */
export function photoUrl(p: Photo, width: number): string {
  return p.url.replace(/([?&])w=\d+/, `$1w=${width}`);
}

export function photosFor(theme: string): Photo[] {
  return PHOTOS.filter((p) => p.theme === theme);
}
