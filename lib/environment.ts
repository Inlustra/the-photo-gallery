import convict, { Path } from "convict";

const config = convict({
  photo: {
    sort: {
      doc: "Sort order for images",
      format: [
        "numerical_file_name",
        "file_name",
        "modified_at",
        "image_taken_date",
      ] as const,
      default: "image_taken_date",
      env: "PHOTO_SORT",
    },
    defaultReverse: {
      doc: "Whether the photos should be by default reversed on the page",
      default: false,
      format: Boolean,
      env: "PHOTO_DEFAULT_REVERSE",
    },
  },
  page: {
    showFullscreenButton: {
      default: true,
      format: Boolean,
      env: "PAGE_SHOW_FULLSCREEN_BUTTON",
      doc: "Whether or not the page should have the fullscreen button",
    },
    title: {
      default: "The Photo Gallery",
      format: String,
      env: "PAGE_TITLE",
    },
    headerText: {
      default: undefined,
      nullable: true,
      format: String,
      env: "PAGE_HEADER_TEXT",
    },
  },
} as const);

config.validate({ allowed: "strict" });

const result = config.get();

console.debug(result);

export default result;
