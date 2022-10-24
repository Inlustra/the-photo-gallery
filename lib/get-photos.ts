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
import { Logger } from "winston";
import { LoggerConfig } from "./create-logger";
import { CachedPhotos, loadCacheFile, writeCacheFile } from "./cache-file";

const readDir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const photosDir = "./public/photos";
const processingOptions = {
  useThumbnails: environment.processors.node.useEmbeddedThumbnails,
  disableBlurGeneration: environment.processors.node.disableBlurGeneration,
} as ProcessingOptions;

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

const processFiles = async (
  logger: Logger,
  loggerConfig: LoggerConfig,
  directory: string | undefined,
  processor: ImageProcessor,
  cache?: CachedPhotos
) => {
  const fullPath = directory ? path.join(photosDir, directory) : photosDir;
  const [dirError, dir] = await to(readDir(fullPath, { withFileTypes: true }));
  if (dirError) {
    logger.error("Error reading the photos directory", {
      photosDir,
      directory,
      fullPath,
    });
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
      loggerConfig,
      cachedPhoto: cache?.[imagePath],
      imagePath,
      processingOptions,
      stats: fileStats[imagePath],
    };
  });

  let completed = 0;

  const results = await processor(logger, configs);

  const awaitedResults = results.map(async (promise) => {
    const result = await promise;
    const percentageCompleted = `[${Math.ceil(
      (++completed / configs.length) * 100
    )}%]`;
    if (result.photo) {
      logger.info(
        `${percentageCompleted} Processed file ${result.imagePath} - ${
          result.photo.width
        }x${result.photo.height} ${result.cached ? "(Cached)" : ``}`
      );
    } else {
      logger.info(
        `${percentageCompleted} Processed file ${result.imagePath} - Not generated`
      );
    }
    return result;
  });

  const result = await Promise.all(awaitedResults);

  return result.reduce((prev, { photo, imagePath }) => {
    if (!photo) return prev;
    return {
      ...prev,
      [imagePath]: {
        ...photo,
        src: imagePath.split("public")[1],
        ...fileStats[imagePath],
      },
    };
  }, {} as CachedPhotos);
};

export const getPhotos = async (
  logger: Logger,
  processorLoggerConfig: LoggerConfig,
  directory: string | string[] | undefined,
  regenerate?: boolean
): Promise<Record<string, FullPhoto>> => {
  const normalizedDirectory = directory
    ? typeof directory === "string"
      ? directory
      : Array.isArray(directory)
      ? path.join(...directory)
      : undefined
    : undefined;

  const cacheFile = regenerate
    ? undefined
    : await loadCacheFile(logger, normalizedDirectory);
  const processingOptionsChanged =
    JSON.stringify(processingOptions).trim() !==
    JSON.stringify(cacheFile?.processingOptions ?? "").trim();
  const canUseCache = !processingOptionsChanged && !regenerate;
  if (!canUseCache)
    logger.info(`Skipping cache file.`, {
      cacheFileExists: !!cacheFile,
      processingOptionsChanged,
      regenerate,
    });
  logger.info("Starting file processing... (This can take awhile)");

  const processorFactory = environment.processors.imagor.serverURL
    ? createImagorProcessor
    : createWorkerImageProcessor;

  const cachedPhotos = await processFiles(
    logger,
    processorLoggerConfig,
    normalizedDirectory,
    processorFactory,
    canUseCache ? cacheFile?.photos : undefined
  );
  await writeCacheFile(logger, normalizedDirectory, {
    processingOptions,
    photos: cachedPhotos,
  });
  return cachedPhotos;
};
