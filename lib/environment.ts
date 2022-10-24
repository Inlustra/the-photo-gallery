import convict from "convict";

export const schema = {
  logLevel: {
    doc: "The level of logging required",
    default: "info",
    format: ["silly", "verbose", "debug", "info", "warn", "error"],
    env: "LOG_LEVEL",
  },
  disableCache: {
    doc: 'Regenerate on every render',
    default: false,
    format: Boolean,
    env: 'DISABLE_CACHE'
  },
  photo: {
    sort: {
      doc: "Sort order for images",
      format: [
        "numerical_file_name",
        "file_name",
        "modified_at",
        "image_taken_date",
      ],
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
  processors: {
    node: {
      useEmbeddedThumbnails: {
        doc: "During generation, if the photo has an embedded thumbnail, this can be used instead a blur",
        default: false,
        format: Boolean,
        env: "NODE_USE_EMBEDDED_THUMBNAILS",
      },
      disableBlurGeneration: {
        doc: "Disable the blur generation, will significantly speed up build. Not recommended but required for *very* large directories.",
        default: false,
        format: Boolean,
        env: "NODE_DISABLE_BLUR_GENERATION",
      },
    },
    imagor: {
      serverURL: {
        default: null as string | null,
        format: "*",
        env: "IMAGOR_SERVER_BASE_URL",
        doc: "The Imagor base url for the container to fetch metadata, e.g for docker: http://imagor:8000/",
      },
      clientURL: {
        default: null as string | null,
        format: "*",
        doc: "The Imagor base url for the client to fetch images, e.g for docker with exposed port: http://localhost:8000/",
        env: "IMAGOR_CLIENT_BASE_URL",
      },
      secret: {
        default: null as string | null,
        doc: "Set this if you have set the IMAGOR_SECRET environment variable within imagor",
        format: "*",
        env: "IMAGOR_SECRET",
        sensitive: true,
      },
      imageFormat: {
        default: "webp",
        format: ["jpeg", "png", "gif", "webp", "tiff", "avif"],
        doc: "Image format to be requested by Imagor, defaults to webp",
        env: "IMAGOR_IMAGE_FORMAT",
      },
      imageFilters: {
        default: "",
        format: String,
        doc: "Any extra image filters to be requested by imagor, must start with: ':', example: ':hue(290):saturation(100)'",
        env: "IMAGOR_IMAGE_FILTERS",
      },
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
      doc: "Title that appears in the tab in your browser",
    },
    headerText: {
      default: undefined,
      nullable: true,
      format: String,
      env: "PAGE_HEADER_TEXT",
      doc: "Text at the top of the screen",
    },
  },
} as const;

export const config = convict(schema);

const result = config.get();

export default result;
