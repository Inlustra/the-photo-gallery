import workerpool from "workerpool";
import sizeOf from "image-size";
import fs from "fs";
import { promisify } from "util";
import { getPlaiceholder } from "plaiceholder";
import { load } from "exifreader";
import to from "await-to-js";
import path from "path";
import { parseDateTimeOriginal } from "../lib/utils";

import type {
  ProcessImageConfig,
  ProcessedResult,
} from "../lib/processors/types";

const readFile = promisify(fs.readFile);

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
      ? parseDateTimeOriginal(dateTimeOriginal) //2022:09:03 09:44:55
      : null,
  };
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

const allowedExtensions = [".jpg", ".jpeg", ".png"];

async function performProcessing({
  imagePath,
  cachedPhoto,
  processingOptions,
  stats,
}: ProcessImageConfig): Promise<Omit<ProcessedResult, "processTime">> {
  const { ext } = path.parse(imagePath);
  if (!allowedExtensions.some((allowed) => allowed === ext)) {
    console.warn(
      `File type not supported [${ext}] for file: ${imagePath}, consider using Imagor if this is a valid image. Skipping...`
    );
    return { cached: false, photo: null };
  }
  const canSkip = cachedPhoto && cachedPhoto.fileSize === stats.fileSize;
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
      thumbnailSrc: null,
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
