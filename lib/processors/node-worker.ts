import { ImageProcessor } from "./types";
import path from "path";
import workerPool from "workerpool";
// Import this to keep the node_modules within the project
import "../../workers/process-image";

const allowedExtensions = [".jpg", ".jpeg", ".png"];

export const createWorkerImageProcessor: ImageProcessor = async (
  logger,
  configs
) => {
  const pool = workerPool.pool(`./workers-build/workers/process-image.js`);
  const result = configs.map(async (config) => {
    const { ext } = path.parse(config.imagePath);
    if (!allowedExtensions.some((allowed) => allowed === ext)) {
      logger.warn(
        `File type not supported [${ext}] for file: ${config.imagePath}, consider using Imagor if this is a valid image. Skipping...`
      );
      return { imagePath: config.imagePath, cached: false, photo: null };
    }
    const canSkip =
      config.cachedPhoto &&
      config.cachedPhoto.fileSize === config.stats.fileSize;
    if (canSkip) {
      return {
        imagePath: config.imagePath,
        photo: config.cachedPhoto,
        cached: true,
      };
    }
    const workerResult = await pool.exec("processImage", [
      JSON.stringify(config),
    ]);
    const stats = pool.stats();
    if (stats.pendingTasks === 0 && stats.activeTasks === 0)
      await pool.terminate();
    return workerResult;
  });
  return result;
};
