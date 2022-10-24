import { Logger } from "winston";
import { LoggerConfig } from "../create-logger";

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
  imagePath: string;
  photo: ProcessedPhoto | null;
  cached: boolean;
}

export interface ProcessingOptions {
  useThumbnails?: boolean;
  disableBlurGeneration?: boolean;
}

export type ProcessImageConfig = {
  loggerConfig: LoggerConfig;
  imagePath: string;
  stats: FileStats;
  cachedPhoto?: FullPhoto;
  processingOptions?: ProcessingOptions;
};

export type ImageProcessorResult = {
  [key: string]: ProcessedResult;
};

export type ImageProcessor = (
  logger: Logger,
  images: ProcessImageConfig[]
) => Promise<Promise<ProcessedResult>[]>;
