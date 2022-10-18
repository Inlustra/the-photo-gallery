import { ImageProcessor, ImageProcessorResult, ProcessedResult } from "./types";
import workerPool from "workerpool";
// Import this to keep the node_modules within the project
import '../../workers/process-image';

export const createWorkerImageProcessor =
  (): ImageProcessor => async (configs) => {
    const pool = workerPool.pool(`./workers-build/workers/process-image.js`);

    const result = await Promise.all(
      configs.map(async (config): Promise<ImageProcessorResult> => {
        const { cached, photo, processTime }: ProcessedResult = await pool.exec(
          "processImage",
          [JSON.stringify(config)]
        );
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
      })
    );

    await pool.terminate();
    return result.reduce(
      (prev, result) => ({ ...prev, ...result }),
      {} as ImageProcessorResult
    );
  };
