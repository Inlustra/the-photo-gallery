import {
  createLogger as winstonCreateLogger,
  transports,
  format,
} from "winston";
import { consoleFormat } from "winston-console-format";

export interface LoggerConfig {
  level: string;
  meta?: Record<string, string>;
}

const durationFormatter = format((info) => {
  if (info.durationMs) {
    const seconds = Math.floor(info.durationMs / 1000);
    const ms = info.durationMs % 1000;
    const processTime = (seconds > 0 ? seconds + "s" : "") + ms + "ms"; // print message + time
    info.message = `${info.message} (${processTime})`;
    delete info.durationMs
  }
  return info;
});

export const createLogger = ({ level, meta }: LoggerConfig) => {
  const logger = winstonCreateLogger({
    level,
    format: format.combine(
      durationFormatter(),
      format.timestamp(),
      format.ms(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: meta,
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize({ all: true }),
          format.padLevels(),
          consoleFormat({
            showMeta: true,
            metaStrip: ["timestamp", "service", "blurDataURL"],
            inspectOptions: {
              depth: Infinity,
              colors: true,
              maxArrayLength: Infinity,
              breakLength: 120,
              compact: Infinity,
            },
          })
        ),
      }),
    ],
  });
  return logger;
};
