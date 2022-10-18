import { FullPhoto } from "./processors/types";
import path from "path";

export type Sort =
  | "modified_at"
  | "numerical_file_name"
  | "file_name"
  | "image_taken_date";

type SortFn = (a: FullPhoto, b: FullPhoto) => number;

const fileNamePhotoSort: SortFn = ({ src: aSrc }, { src: bSrc }) =>
  aSrc.localeCompare(bSrc);

const numericalFileNamePhotoSort: SortFn = ({ src: aSrc }, { src: bSrc }) => {
  const aFileName = path.parse(aSrc).name;
  const bFileName = path.parse(bSrc).name;
  return parseInt(aFileName) - parseInt(bFileName);
};
const imageTakenDatePhotoSort: SortFn = (a, b) =>
  (a.dateTimeOriginalMs ?? a.fileSize) -
  (b.dateTimeOriginalMs ?? b.fileSize);

const modifiedAtPhotoSort: SortFn = (a, b) => a.modifiedAt - b.modifiedAt;

export const getSortFunction = (sort: Sort) => {
  switch (sort) {
    case "file_name":
      return fileNamePhotoSort;
    case "numerical_file_name":
      return numericalFileNamePhotoSort;
    case "modified_at":
      return modifiedAtPhotoSort;
    default:
    case "image_taken_date":
      return imageTakenDatePhotoSort;
  }
};
