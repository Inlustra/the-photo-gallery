import convict, { Path } from "convict";

const schema = {
  sort: {
    doc: "Sort order for images",
    format: ["numerical_file_name", "file_name", "created_at"] as const,
    default: "created_at",
    env: "SORT",
  },
} as const;

const config = convict({
  photo: {
    sort: {
      doc: "Sort order for images",
      format: ["numerical_file_name", "file_name", "created_at"] as const,
      default: "created_at",
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

export default config.get();