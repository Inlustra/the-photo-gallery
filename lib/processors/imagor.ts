import { ImageProcessor, ProcessedResult, ProcessImageConfig } from "./types";
import axios from "axios";
import environment from "../environment";
import crypto from "crypto";
import { parseDateTimeOriginal } from "../utils";
import { Logger } from "winston";

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

const processImage = async (
  logger: Logger,
  { imagePath, cachedPhoto, stats }: ProcessImageConfig
): Promise<ProcessedResult> => {
  const canSkip = cachedPhoto && cachedPhoto.fileSize === stats.fileSize;
  if (canSkip) {
    return { imagePath, photo: cachedPhoto, cached: true };
  }
  const url = buildMetadataURL(imagePath).toString();
  const { data } = await axios.get<ImagorMetaResult>(url);
  return {
    imagePath,
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
  };
};

export const createImagorProcessor: ImageProcessor = async (
  logger,
  configs
) => {
  return configs.map(async (config) => processImage(logger, config));
};
