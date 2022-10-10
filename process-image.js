const workerpool = require("workerpool");
const imageSize = require("image-size");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { getPlaiceholder } = require("plaiceholder");
const stat = promisify(fs.stat);
const sizeOf = promisify(imageSize);

async function processImage(photosDir, previousJSONFileStr, imageFileName) {
  const previousJSONFile = previousJSONFileStr
    ? JSON.parse(previousJSONFileStr)
    : undefined;
  const imagePath = path.join(photosDir, imageFileName);
  const imageStats = await stat(imagePath);
  const canSkip = previousJSONFile && previousJSONFile.size === imageStats.size;
  console.debug(
    `Processing ${photosDir}/${imageFileName}${canSkip ? "... Skipped" : "..."}`
  );
  const extras = {
    createdAt: imageStats.mtimeMs,
    size: imageStats.size,
  };
  if (canSkip) {
    return {
      ...previousJSONFile,
      ...extras,
    };
  }

  const imageSize = await sizeOf(imagePath);
  if (!imageSize?.width || !imageSize.height)
    throw new Error("Error getting image size");
  const blurDataURL = await getPlaiceholder(`/${imagePath}`, { dir: "." });
  return {
    width: imageSize?.width,
    height: imageSize?.height,
    blurDataURL: blurDataURL.base64,
    size: imageStats.size,
    ...extras,
  };
}

if (!workerpool.isMainThread) {
  workerpool.worker({
    processImage: processImage,
  }); 
}