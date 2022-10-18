export interface ProcessedPhoto {
  height: number;
  width: number;
  blurDataURL: string | null;
  dateTimeOriginalMs: number | null;
  thumbnailSrc: string | null;
}

export interface FileStats {
  fileSize: number;
  modifiedAt: number;
}

export interface FullPhoto extends ProcessedPhoto, FileStats {
  src: string;
}

export interface ProcessedResult {
  photo: ProcessedPhoto | null;
  cached: boolean;
  processTime: string;
}

export interface ProcessingOptions {
  useThumbnails?: boolean;
}

export type ProcessImageConfig = {
  imagePath: string;
  stats: FileStats;
  cachedPhoto?: FullPhoto;
  processingOptions?: ProcessingOptions;
};

export type ImageProcessorResult = {
  [key: string]: ProcessedResult;
};

export type ImageProcessor = (
  images: ProcessImageConfig[]
) => Promise<ImageProcessorResult>;
