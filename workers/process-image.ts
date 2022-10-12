import workerpool from "workerpool";
import sizeOf from "image-size";
import fs from "fs";
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

export interface ProcessedResult {
  photo: ProcessedPhoto;
  cached: boolean;
  processTime: string;
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

export type ProcessImageConfig = {
  imagePath: string;
  cachedPhoto?: Omit<ProcessedPhoto, "cached">;
  processingOptions?: ProcessingOptions;
};

export async function processImage(
  configStr: string
): Promise<ProcessedResult> {
  const config: ProcessImageConfig = JSON.parse(configStr);
  const start = process.hrtime();
  const result = await performProcessing(config);
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  const seconds = process.hrtime(start)[0];
  const ms = elapsed.toFixed(0);
  const elapsedTime = (seconds > 0 ? seconds + "s" : "") + ms + "ms"; // print message + time
  return { ...result, processTime: elapsedTime };
}

async function performProcessing({
  imagePath,
  cachedPhoto,
  processingOptions,
}: ProcessImageConfig): Promise<Omit<ProcessedResult, "processTime">> {
  const [fileDataError, fileData] = await to(getFileData(imagePath));
  if (fileDataError) {
    console.error(`Failed to load required file data for: ${imagePath}`);
    throw fileDataError;
  }

  const canSkip = cachedPhoto && fileData && cachedPhoto.size === fileData.size;
  if (canSkip) {
    return { photo: cachedPhoto, cached: true };
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
    const blurDataURL = await getPlaiceholder(`/${imagePath}`, { dir: "." });
    imageExtras.blurDataURL = blurDataURL.base64;
  }

  return {
    photo: {
      src: imagePath,
      ...fileData,
      ...imageData,
      ...imageExtras,
    },
    cached: false,
  };
}

if (!workerpool.isMainThread) {
  workerpool.worker({
    processImage: processImage,
  });
}
