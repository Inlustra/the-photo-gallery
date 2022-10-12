import workerpool from "workerpool";
import sizeOf from "image-size";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { getPlaiceholder } from "plaiceholder";
import { load } from "exifreader";
import to from "await-to-js";
import parseDate from "date-fns/parse";

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface ProcessedPhoto {
  height: number;
  width: number;
  size: number;
  modifiedAt: number;
  blurDataURL: string | null;
  dateTimeOriginalMs: number | null;
  src: string;
}

export interface ProcessingOptions {
  useThumbnails?: boolean;
}

const getFileData = async (filePath: string) => {
  const [fileStatsError, fileStats] = await to(stat(filePath));
  if (fileStatsError || !fileStats) {
    throw fileStatsError;
  }
  return {
    modifiedAt: fileStats.mtimeMs,
    size: fileStats.size,
  };
};

const getImageData = async (image: Buffer) => {
  const imageSize = sizeOf(image);
  if (!imageSize?.width || !imageSize.height)
    throw new Error("Invalid image sizes.");
  return {
    width: imageSize.width,
    height: imageSize.height,
  };
};

const getImageExtras = async (image: Buffer) => {
  const exif = load(image);
  const thumbnail = exif["Thumbnail"]?.base64;
  const dateTimeOriginal = exif["DateTimeOriginal"]?.value?.[0];
  return {
    blurDataURL: thumbnail ? `data:image/jpg;base64,${thumbnail}` : null,
    dateTimeOriginalMs: dateTimeOriginal
      ? parseDate(
          dateTimeOriginal,
          "yyyy:MM:dd HH:mm:ss",
          new Date(0)
        ).getTime() //2022:09:03 09:44:55
      : null,
  };
};

async function processImage(
  photosDir: string,
  previousJSONFileStr: string,
  imageFileName: string,
  processingOptionsStr?: string
) {
  const processingOptions = processingOptionsStr
    ? (JSON.parse(processingOptionsStr) as ProcessingOptions)
    : undefined;
  const previousJSONFile = previousJSONFileStr
    ? (JSON.parse(previousJSONFileStr) as ProcessedPhoto)
    : undefined;
  const imagePath = path.join(photosDir, imageFileName);
  return performProcessing(imagePath, previousJSONFile, processingOptions);
}

async function performProcessing(
  imagePath: string,
  previousJSONFile?: ProcessedPhoto,
  processingOptions?: ProcessingOptions
): Promise<ProcessedPhoto> {
  const [fileDataError, fileData] = await to(getFileData(imagePath));
  if (fileDataError) {
    console.error(`Failed to load required file data for: ${imagePath}`);
    throw fileDataError;
  }

  const canSkip =
    previousJSONFile && fileData && previousJSONFile.size === fileData.size;
  if (canSkip) {
    return previousJSONFile;
  }

  const [fileError, file] = await to(readFile(imagePath));

  if (fileError || !file) {
    console.error(`Failed to load file for: ${imagePath}`, fileError);
    throw fileError;
  }

  const [imageDataError, imageData] = await to(getImageData(file));
  if (imageDataError) {
    console.error(
      `Failed to load required image data for: ${imagePath}`,
      imageDataError
    );
    throw imageDataError;
  }

  const [imageExtrasError, imageExtras] = await to(getImageExtras(file));
  if (imageExtrasError) {
    console.warn(
      `Failed to load extra data for: ${imagePath}`,
      imageExtrasError
    );
    throw imageExtrasError;
  }

  if (!imageExtras.blurDataURL || !processingOptions?.useThumbnails) {
    const blurDataURL = await  getPlaiceholder(`/${imagePath}`, { dir: "." });
    imageExtras.blurDataURL = blurDataURL.base64;
  }

  return { src: imagePath, ...fileData, ...imageData, ...imageExtras };
}

if (!workerpool.isMainThread) {
  workerpool.worker({
    processImage: processImage,
  });
}
