import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";
import imageSize from "image-size";
import { PromisePool } from "@supercharge/promise-pool";
import { getPlaiceholder } from "plaiceholder";
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readDir = promisify(fs.readdir);
const sizeOf = promisify(imageSize);

export interface LoadedPhoto {
  height: number;
  width: number;
  src: string;
  blurDataURL: string;
  size: number;
  createdAt: number;
}

export type JSONFile = { [key: string]: LoadedPhoto };

const photosDir = "./public/photos";
const concurrency = parseInt(process.env.PHOTO_PROCESS_CONCURRENCY ?? "20");
const sort = process.env.SORT ?? "file_name";
const reverse = !!process.env.REVERSE ?? false;

async function processImage(imagePath: string) {
  const imageSize = await sizeOf(imagePath);
  if (!imageSize?.width || !imageSize.height)
    throw new Error("Error getting image size");
  const blurDataURL = await getPlaiceholder(`/${imagePath}`, { dir: "." });
  return {
    src: imagePath.split("/public")[1],
    width: imageSize?.width,
    height: imageSize?.height,
    blurDataURL: blurDataURL.base64,
  };
}

const getJSONFile = async (): Promise<JSONFile | undefined> => {
  const [fileError, file] = await to(readFile(`./storage/photos.json`));
  if (fileError) {
    console.log(fileError);
    return;
  }
  const json = JSON.parse(file.toString());
  return json;
};

const writeJSONFile = async (file: JSONFile) => {
  const [error] = await to(
    writeFile("./storage/photos.json", JSON.stringify(file))
  );
  if (error) console.error(error);
};

const checkFiles = async (previousJSON?: JSONFile) => {
  const [dirError, dir] = await to(readDir(photosDir));
  if (dirError) {
    console.error("Error reading the photos directory", photosDir);
    throw dirError;
  }
  const result = await PromisePool.for(dir)
    .withConcurrency(concurrency)
    .process(async (file) => {
      const imageStats = await stat(`${photosDir}/${file}`);

      if (
        previousJSON &&
        previousJSON[file] &&
        previousJSON[file].size === imageStats.size
      ) {
        console.log(`Skipping ${file}`);
        return {
          [file]: {
            ...previousJSON[file],
            createdAt: imageStats.mtimeMs,
          },
        };
      }
      console.log(`Processing image ${file}`);
      const image = await processImage(`${photosDir}/${file}`);
      return {
        [file]: {
          ...image,
          size: imageStats.size,
          createdAt: imageStats.mtimeMs,
        },
      };
    });
  return result.results.reduce((prev, result) => ({ ...prev, ...result }), {});
};

export const getPhotos = async (): Promise<LoadedPhoto[]> => {
  console.log("Loading previous JSON File");
  const previousJSONFile = await getJSONFile();
  console.log("previous JSON file exists: " + !!previousJSONFile);
  const newJSONFile = await checkFiles(previousJSONFile);
  await writeJSONFile(newJSONFile);
  const files = sortFiles(sort, newJSONFile);
  return reverse ? files.reverse() : files;
};

type Sort = "created_at" | "numerical_file_name" | "file_name";
const sortFiles = (sort: Sort | string, file: JSONFile) => {
  if (sort === "file_name")
    return Object.entries(file)
      .sort(([aFileName], [bFileName]) => aFileName.localeCompare(bFileName))
      .map(([_, file]) => file);
  if (sort === "numerical_file_name")
    return Object.entries(file)
      .sort(([a], [b]) => {
        const [aFileName] = a.split(".");
        const [bFileName] = b.split(".");
        return parseInt(aFileName) - parseInt(bFileName);
      })
      .map(([_, file]) => file);
  return Object.values(file).sort((a, b) => a.createdAt - b.createdAt);
};
