import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";

import {
  FileStats,
  FullPhoto,
  ImageProcessor,
  ProcessImageConfig,
  ProcessingOptions,
} from "./processors/types";
import path from "path";
import environment from "./environment";
import { createWorkerImageProcessor } from "./processors/node-worker";
import { createImagorProcessor } from "./processors/imagor";

type CachedPhotos = Record<string, FullPhoto>;

type CacheFile = {
  photos: CachedPhotos;
  version: string;
  processingOptions: ProcessingOptions;
};

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const photosDir = "./public/photos";
const processingOptions = {
  useThumbnails: environment.processors.node.useEmbeddedThumbnails,
  disableBlurGeneration: environment.processors.node.disableBlurGeneration,
};

const getFileStats = async (filePath: string): Promise<FileStats> => {
  const [fileStatsError, fileStats] = await to(stat(filePath));
  if (fileStatsError || !fileStats) {
    throw fileStatsError;
  }
  return {
    modifiedAt: fileStats.mtimeMs,
    fileSize: fileStats.size,
  };
};

const getCacheFilePath = (directory?: string) =>
  path.join(
    ".",
    "storage",
    directory ? `photos-${encodeURIComponent(directory)}.json` : "photos.json"
  );

const loadCacheFile = async (
  directory: string | undefined
): Promise<CacheFile | undefined> => {
  const cacheFilePath = getCacheFilePath(directory);
  console.log(cacheFilePath);
  const [fileError, file] = await to(readFile(cacheFilePath));
  if (fileError) {
    console.log(fileError);
    return;
  }
  const json = JSON.parse(file.toString());
  return json;
};

const writeCacheFile = async (
  directory: string | undefined,
  file: CacheFile
) => {
  const cacheFilePath = getCacheFilePath(directory);
  console.log(cacheFilePath);
  const [error] = await to(writeFile(cacheFilePath, JSON.stringify(file)));
  if (error) console.error(error);
};

const processFiles = async (
  directory: string | undefined,
  processor: ImageProcessor,
  cache?: CachedPhotos
) => {
  const fullPath = directory ? path.join(photosDir, directory) : photosDir;
  const [dirError, dir] = await to(readDir(fullPath, { withFileTypes: true }));
  if (dirError) {
    console.error("Error reading the photos directory", fullPath);
    throw dirError;
  }

  const paths = dir
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .map((photo) => path.join(fullPath, photo));

  const fileStats = (
    await Promise.all(
      paths.map(async (photo): Promise<[string, FileStats]> => {
        const fileData = await getFileStats(photo);
        return [photo, fileData];
      })
    )
  ).reduce(
    (prev, [key, stats]) => ({ ...prev, [key]: stats }),
    {} as { [key: string]: FileStats }
  );

  const configs = paths.map((imagePath): ProcessImageConfig => {
    return {
      cachedPhoto: cache?.[imagePath],
      imagePath,
      processingOptions,
      stats: fileStats[imagePath],
    };
  });

  const result = await processor(configs);
  return Object.entries(result).reduce((prev, [imagePath, result]) => {
    if (!result.photo) return prev;
    return {
      ...prev,
      [imagePath]: {
        ...result.photo,
        src: imagePath.split("public")[1],
        ...fileStats[imagePath],
      },
    };
  }, {} as CachedPhotos);
};

const cacheVersion = "0.0.2";

export const getPhotos = async (
  directory: string | string[] | undefined
): Promise<Record<string, FullPhoto>> => {
  const normalizedDirectory = directory
    ? typeof directory === "string"
      ? directory
      : Array.isArray(directory)
      ? path.join(...directory)
      : undefined
    : undefined;

  console.log("Loading cache file...");
  const cacheFile = await loadCacheFile(normalizedDirectory);
  console.log(
    !!cacheFile
      ? `Cache file exists with ${
          Object.entries(cacheFile.photos ?? {}).length
        } entries`
      : "Cache file does not exist"
  );
  const cacheVersionChanged = cacheFile?.version !== cacheVersion;
  const processingOptionsChanged =
    JSON.stringify(processingOptions).trim() !==
    JSON.stringify(cacheFile?.processingOptions ?? "").trim();
  const canUseCache = !cacheVersionChanged && !processingOptionsChanged;
  if (!canUseCache)
    console.warn(
      "Processing options or cache file version are incompatible, regeneration needed, skipping cachefile."
    );

  const processor = environment.processors.imagor.serverURL
    ? createImagorProcessor()
    : createWorkerImageProcessor();
  const cachedPhotos = await processFiles(
    normalizedDirectory,
    processor,
    canUseCache ? cacheFile?.photos : undefined
  );
  await writeCacheFile(normalizedDirectory, {
    version: cacheVersion,
    processingOptions,
    photos: cachedPhotos,
  });
  return cachedPhotos;
};
