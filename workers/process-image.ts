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
import { createLogger } from "../lib/create-logger";

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

const getImageExtras = async (useThumbnails: boolean, image: Buffer) => {
  const exif = load(image);
  let blurDataURL = null;
  if (useThumbnails) {
    blurDataURL = `data:image/jpg;base64,${exif["Thumbnail"]?.base64}`;
  }
  const dateTimeOriginal = exif["DateTimeOriginal"]?.value?.[0];
  return {
    blurDataURL,
    dateTimeOriginalMs: dateTimeOriginal
      ? parseDateTimeOriginal(dateTimeOriginal) //2022:09:03 09:44:55
      : null,
  };
};

export async function processImage(
  configStr: string
): Promise<ProcessedResult> {
  const config: ProcessImageConfig = JSON.parse(configStr);
  return await performProcessing(config);
}

async function performProcessing({
  loggerConfig,
  imagePath,
  processingOptions,
}: ProcessImageConfig): Promise<ProcessedResult> {
  const logger = createLogger(loggerConfig);

  const [fileError, file] = await to(readFile(imagePath));

  if (fileError || !file) {
    logger.error(`Failed to load file for: ${imagePath}`, fileError);
    throw fileError;
  }

  const [imageDataError, imageData] = await to(getImageData(file));
  if (imageDataError) {
    logger.error(
      `Failed to load required image data for: ${imagePath}`,
      imageDataError
    );
    throw imageDataError;
  }

  const [imageExtrasError, imageExtras] = await to(
    getImageExtras(!!processingOptions?.useThumbnails, file)
  );
  if (imageExtrasError) {
    logger.warn(
      `Failed to load extra data for: ${imagePath}`,
      imageExtrasError
    );
    throw imageExtrasError;
  }

  if (!imageExtras.blurDataURL && !processingOptions?.disableBlurGeneration) {
    const blurDataURL = await getPlaiceholder(`/${imagePath}`, { dir: "." });
    imageExtras.blurDataURL = blurDataURL.base64;
  }

  return {
    imagePath,
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
