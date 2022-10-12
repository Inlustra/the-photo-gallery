import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";
import workerPool from "workerpool";

// Import this, not for it to do anything, but to ensure that nextjs keeps all of its dependencies
import "../workers/process-image";
import { ProcessImageConfig } from "../workers/process-image";
import type { ProcessedPhoto } from "../workers/process-image";
import path from "path";

type CachedPhotos = Record<string, ProcessedPhoto>;

type CacheFile = {
  photos: CachedPhotos;
  version: string;
};

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

const photosDir = "./public/photos";

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
      };
    })
    .map(async (config) => {
      const result: ProcessedPhoto = await pool.exec("processImage", [
        JSON.stringify(config),
      ]);
      return {
        [config.imagePath]: result,
      };
    });
  const result = await Promise.all(results);
  await pool.terminate();
  return result.reduce(
    (prev, result) => ({ ...prev, ...result }),
    {} as CachedPhotos
  );
};

export const getPhotos = async (): Promise<Record<string, ProcessedPhoto>> => {
  console.log("Loading cache file...");
  const cacheFile = await loadCacheFile();
  console.log(
    !!cacheFile
      ? `Cache file exists with ${Object.entries(cacheFile.photos).length} entries`
      : "Cache file does not exist"
  );
  const cachedPhotos = await checkFiles(cacheFile?.photos);
  await writeCacheFile({ version: "0.0.2", photos: cachedPhotos });
  return cachedPhotos;
};
