import {
  ImageProcessor,
  ImageProcessorResult,
  ProcessedResult,
  ProcessImageConfig,
} from "./types";
import axios from "axios";
import environment from "../environment";
import crypto from "crypto";
import { parseDateTimeOriginal } from "../utils";

interface ImagorMetaResult {
  format: string;
  content_type: string;
  width: number;
  height: number;
  orientation: number;
  pages: number;
  exif: {
    DateTimeOriginal?: string;
  };
}

const buildImagorURL = (baseURL: string, path: string) => {
  const { secret } = environment.processors.imagor;
  const hash = secret
    ? crypto
        .createHmac("sha1", secret)
        .update(path)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
    : "unsafe";
  return new URL(`${hash}${path}`, baseURL);
};

const imagorPath = (imagePath: string) => imagePath.split("public/")[1];

const buildMetadataURL = (imagePath: string) => {
  return buildImagorURL(
    environment.processors.imagor.serverURL,
    `/meta/${imagorPath(imagePath)}`
  );
};

const buildImagorSrc = (imagePath: string) => {
  return buildImagorURL(
    environment.processors.imagor.clientURL ??
      environment.processors.imagor.serverURL,
    `/WIDTH_VARxHEIGHT_VAR/filters:format(${
      environment.processors.imagor.imageFormat
    })${environment.processors.imagor.imageFilters}/${imagorPath(imagePath)}`
  );
};

const processImage = async ({
  imagePath,
  cachedPhoto,
  stats,
}: ProcessImageConfig): Promise<ProcessedResult> => {
  const start = process.hrtime();
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  const seconds = process.hrtime(start)[0];
  const ms = elapsed.toFixed(0);
  const processTime = (seconds > 0 ? seconds + "s" : "") + ms + "ms"; // print message + time

  const canSkip = cachedPhoto && cachedPhoto.fileSize === stats.fileSize;
  if (canSkip) {
    return { photo: cachedPhoto, cached: true, processTime };
  }
  const url = buildMetadataURL(imagePath).toString();
  const { data, headers } = await axios.get<ImagorMetaResult>(url);
  return {
    cached: false,
    photo: {
      width: data.width,
      height: data.height,
      blurDataURL: null,
      dateTimeOriginalMs: data.exif.DateTimeOriginal
        ? parseDateTimeOriginal(data.exif.DateTimeOriginal)
        : null,
      thumbnailSrc: buildImagorSrc(imagePath).toString(),
    },
    processTime,
  };
};

export const createImagorProcessor = (): ImageProcessor => async (configs) => {
  const promises = configs.map(
    async (config): Promise<ImageProcessorResult> => {
      const { cached, photo, processTime }: ProcessedResult =
        await processImage(config);
      if (photo) {
        console.log(
          `Processed file ${config.imagePath} - ${photo.width}x${
            photo.height
          } ${cached ? "(Cached)" : `(${processTime})`}`
        );
      } else {
        console.log(`Processed file ${config.imagePath} - Not generated`);
      }
      return {
        [config.imagePath]: { cached, photo, processTime },
      };
    }
  );

  const result = await Promise.all(promises);

  return result.reduce(
    (prev, result) => ({ ...prev, ...result }),
    {} as ImageProcessorResult
  );
};
