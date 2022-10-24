import fs from "fs";
import { Logger } from "winston";
import path from "path";
import { FullPhoto, ProcessingOptions } from "./processors/types";
import { promisify } from "util";
import to from "await-to-js";

export type CachedPhotos = Record<string, FullPhoto>;

export type CacheFile = {
  photos: CachedPhotos;
  version: string;
  processingOptions: ProcessingOptions;
};

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const getCacheFilePath = (directory?: string) =>
  path.join(
    ".",
    "storage",
    directory ? `photos-${encodeURIComponent(directory)}.json` : "photos.json"
  );

const cacheVersion = "0.0.4";

export const loadCacheFile = async (
  logger: Logger,
  directory: string | undefined
) => {
  const cacheFilePath = getCacheFilePath(directory);
  logger.debug("Loading cache file", { cacheFilePath });
  const [error, file] = await to(readFile(cacheFilePath));
  if (error) {
    logger.warn("Error loading cache file", { error });
    return;
  }
  const cacheFile: CacheFile = JSON.parse(file.toString());

  if (cacheFile?.version !== cacheVersion) {
    logger.info(
      "New 'the-photo-gallery' version detected, cache file needs to be regenerated.",
      { cacheVersion, cacheFileVersion: cacheFile?.version }
    );
  }
  return cacheFile;
};

export const writeCacheFile = async (
  logger: Logger,
  directory: string | undefined,
  file: Omit<CacheFile, "version">
) => {
  const cacheFilePath = getCacheFilePath(directory);
  logger.info("Writing cache file", { cacheFilePath });
  const [error] = await to(
    writeFile(cacheFilePath, JSON.stringify({ ...file, version: cacheVersion }))
  );
  if (error) logger.warn("Error writing cache file", { error });
};
