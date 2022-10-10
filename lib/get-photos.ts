import fs from "fs";
import { promisify } from "util";
import to from "await-to-js";
import environment from "./environment";
import workerPool from "workerpool";

// Import this, not for it to do anything, but to ensure that nextjs keeps all of its dependencies
import "../process-image";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

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

  const pool = workerPool.pool(`./process-image.js`);
  const results = allowedPhotos
    .map(
      (photo) =>
        [photosDir, JSON.stringify(previousJSON?.[photo]), photo] as const
    )
    .map(async (vars) => {
      const result = await pool.exec("processImage", vars as any);
      return {
        [vars[2]]: result,
      };
    });
  const result = await Promise.all(results);
  await pool.terminate();
  return result.reduce(
    (prev: any, result: any) => ({ ...prev, ...result }),
    {}
  );
};
export type Sort = "created_at" | "numerical_file_name" | "file_name";

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

const appendDir = (file: JSONFile) => {
  return Object.entries(file).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: { ...value, src: `/photos/${key}` },
    }),
    {} as JSONFile
  );
};

export const getPhotos = async (): Promise<LoadedPhoto[]> => {
  console.log("Loading previous JSON File");
  const previousJSONFile = await getJSONFile();
  console.log("previous JSON file exists: " + !!previousJSONFile);
  const newJSONFile = await checkFiles(previousJSONFile);
  await writeJSONFile(newJSONFile);
  const files = sortFiles(environment.photo.sort, appendDir(newJSONFile));
  return environment.photo.defaultReverse ? files.reverse() : files;
};
