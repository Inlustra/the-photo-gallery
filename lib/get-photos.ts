import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";
import workerPool from "workerpool";

// Import this, not for it to do anything, but to ensure that nextjs keeps all of its dependencies
import "../workers/process-image";
import {
  ProcessedResult,
  ProcessImageConfig,
  ProcessingOptions,
} from "../workers/process-image";
import type { ProcessedPhoto } from "../workers/process-image";
import path from "path";
import environment from "./environment";

type CachedPhotos = Record<string, ProcessedPhoto>;

type CacheFile = {
  photos: CachedPhotos;
  version: string;
  processingOptions: ProcessingOptions;
};

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

const photosDir = "./public/photos";
const processingOptions = {
  useThumbnails: environment.photo.useEmbeddedThumbnails,
};

const loadCacheFile = async (): Promise<CacheFile | undefined> => {
  const [fileError, file] = await to(readFile(`./storage/photos.json`));
  if (fileError) {
    console.log(fileError);
    return;
  }
  const json = JSON.parse(file.toString());
  return json;
};

const writeCacheFile = async (file: CacheFile) => {
  const [error] = await to(
    writeFile("./storage/photos.json", JSON.stringify(file))
  );
  if (error) console.error(error);
};

const allowedFileTypes = [".jpg", ".png"];

const checkFiles = async (cache?: CachedPhotos) => {
  const [dirError, dir] = await to(readDir(photosDir));
  if (dirError) {
    console.error("Error reading the photos directory", photosDir);
    throw dirError;
  }
  const allowedPhotos = dir.filter((file) =>
    allowedFileTypes.some((ext) => file.toLowerCase().endsWith(ext))
  );

  const pool = workerPool.pool(`./workers/process-image.js`);
  const results = allowedPhotos
    .map((photo): ProcessImageConfig => {
      const imagePath = path.join(photosDir, photo);
      return {
        cachedPhoto: cache?.[imagePath], //[photosDir, previousJSON?.[photo], photo, { }]
        imagePath,
        processingOptions,
      };
    })
    .map(async (config) => {
      const { cached, photo, processTime }: ProcessedResult = await pool.exec(
        "processImage",
        [JSON.stringify(config)]
      );
      console.log(
        `Processed file ${photo.src} - ${photo.width}x${photo.height} ${
          cached ? "(Cached)" : `(${processTime})`
        }`
      );
      return {
        [config.imagePath]: photo,
      };
    });
  const result = await Promise.all(results);
  await pool.terminate();
  return result.reduce(
    (prev, result) => ({ ...prev, ...result }),
    {} as CachedPhotos
  );
};

const cacheVersion = "0.0.2";
export const getPhotos = async (): Promise<Record<string, ProcessedPhoto>> => {
  console.log("Loading cache file...");
  const cacheFile = await loadCacheFile();
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
  const cachedPhotos = await checkFiles(
    canUseCache ? cacheFile?.photos : undefined
  );
  await writeCacheFile({
    version: cacheVersion,
    processingOptions,
    photos: cachedPhotos,
  });
  return cachedPhotos;
};
