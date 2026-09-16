export interface TripStory {
  title: string;
  subtitle: string;
  intro: string[];
  chapters: { id: string; title: string; kicker: string; paragraphs: string[] }[];
  closingQuote: string;
  participants: { displayName: string; role: string }[];
  route: { label: string; note: string }[];
}

export interface TripPhoto {
  id: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  caption: string;
  alt: string;
  category: string;
  year?: number;
  liveVideoId?: string;
}

export interface TripVideo {
  id: string;
  src: string;
  poster: string;
  title: string;
  duration: number;
  width: number;
  height: number;
  kind: 'video' | 'round' | 'live';
  context: string;
}

export interface TripPresentation {
  dateLabel: string;
  region: string;
  heroTitleLines: { text: string; emphasis?: boolean }[];
  heroSubtitle: string;
  heroLead: string;
  heroCaption: string;
  heroCredit: string;
  facts: { icon: 'people' | 'bike' | 'route'; label: string }[];
  narratorNoteLines: string[];
  chaptersLabel: string;
  chapterVisuals: { chapterId: string; photoIds: string[]; videoIds?: string[] }[];
  videoNoteLines: string[];
  videoContextLabels: Record<string, string>;
  albumEyebrow: string;
  albumLayout?: 'grid' | 'masonry';
  peopleTitleLines: string[];
  peopleNote?: string;
  routeEyebrow: string;
  routeTitle: string;
  routeNote: string;
  memoryTitleLines: string[];
  memoryText: string;
  memoryEyebrow?: string;
  closingCredit: string;
}

/** Only this DTO may reach an authorized rendered page. */
export interface Trip {
  slug: string;
  year: number;
  story: TripStory;
  media: {
    heroId: string | null;
    featuredIds: string[];
    categories: Record<string, string>;
    photos: TripPhoto[];
    videos: TripVideo[];
    archivePhotos: TripPhoto[];
  };
  presentation: TripPresentation;
}

export interface TripSummary {
  slug: string;
  year: number;
  title: string;
  subtitle: string;
  dateLabel: string;
  hero: Pick<TripPhoto, 'src' | 'thumb' | 'alt' | 'width' | 'height'> | null;
  photoCount: number;
  archivePhotoCount: number;
  videoCount: number;
  livePhotoCount: number;
}

export interface StoredAsset {
  path: string;
  size: number;
  sha256: string;
  contentType: 'image/webp' | 'video/mp4';
}

export interface TripManifest {
  version: 1;
  trip: Trip;
  assets: Record<string, StoredAsset>;
}

export interface CatalogEntry {
  slug: string;
  revision: string;
  manifestSha256: string;
}

export interface StoredCatalog {
  version: 1;
  trips: CatalogEntry[];
}
