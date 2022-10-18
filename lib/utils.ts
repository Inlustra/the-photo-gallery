import parseDate from "date-fns/parse";

export const parseDateTimeOriginal = (dateTimeOriginal: string) =>
  parseDate(dateTimeOriginal, "yyyy:MM:dd HH:mm:ss", new Date(0)).getTime();
