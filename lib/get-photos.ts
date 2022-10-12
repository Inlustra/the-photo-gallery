import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";
import environment from "./environment";
import workerPool from "workerpool";

// Import this, not for it to do anything, but to ensure that nextjs keeps all of its dependencies
import "../workers/process-image";
import type { ProcessedPhoto } from "../workers/process-image";

type JSONFile = Record<string, ProcessedPhoto>;

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

const photosDir = "./public/photos";

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

const allowedFileTypes = [".jpg", ".png"];

const checkFiles = async (previousJSON?: JSONFile) => {
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
    .map(
      (photo) =>
        [photosDir, JSON.stringify(previousJSON?.[photo]), photo] as const
    )
    .map(async (vars) => {
      const result: ProcessedPhoto = await pool.exec(
        "processImage",
        vars as any
      );
      return {
        [vars[2]]: result,
      };
    });
  const result = await Promise.all(results);
  await pool.terminate();
  return result.reduce(
    (prev, result) => ({ ...prev, ...result }),
    {} as JSONFile
  );
};

export const getPhotos = async (): Promise<Record<string, ProcessedPhoto>> => {
  console.log("Loading previous JSON File");
  const previousJSONFile = await getJSONFile();
  console.log("previous JSON file exists: " + !!previousJSONFile);
  const newJSONFile = await checkFiles(previousJSONFile);
  await writeJSONFile(newJSONFile);
  return newJSONFile;
};
