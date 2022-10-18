# The Photo Gallery

A simple, featureless (By design) full-width photo gallery.

### Updates in v0.0.3
- Imagor support
  - Allows us to support all file types (HEIC... etc)
  - Better control over the generated file types
- Support for image blur disabling
  - If you have thousands of photos, blurs can be expensive and not really necessary if you have a fast connection to the server
- Directory support *(beta)*
  - You can now nest your photos in directories
  - Just navigate to `/mydir` and the server will statically generate the photos within `/photos/mydir`
  - It's worth noting that the changing of images and having them dynamically update is not currently built-in


### Features

- Full width photo display
- Lightbox built-in
- Directory Support
- Automatic image optimization courtesy of NextJS and team
- Generation of loading blurs
- Statically generated, the server just serves regular HTML + JS, once deployed to production, it's **quick**
- Automatic dynamic regeneration should you edit/remove/add photos
- Can handle hundreds (And thousands?) of images at a time
- Lazy loading as you scroll
- Full screen toggle
- [Imagor](https://github.com/cshum/imagor) integration
  - Allows us to support almost all image file types! (HEIC... etc)
  - Allows us to support thousands of images as, while using the imagor processor, we don't generate blurs and other potentially heavy attributes, whilst generating thumbnails at runtime 
  - See [here](#Imagor) for how to get started
- Image sorting
  - Numerical file names (1.jpg, 2.jpg, 3.jpg...)
  - Created time
  - Regular file names (a.jpg, b.jpg...) (2022-10-09.jpg, 2022-10-10.jpg...)
  - Reverse of any of the above!

## [Demo](https://gallery.thenairn.com)

### Example

These are my midjourney creations, this website was built for my wedding and as such, real photos look a lot better!

[Demo](https://gallery.thenairn.com)

https://user-images.githubusercontent.com/2565465/194875343-54db9659-176b-4d4c-be38-bcee103018d7.mp4

### Why?

I've honestly not been able to find a simple plug and play photo sharing website for sharing the wedding photos.

My goals were:

- Mount a directory with photos in it (So that the wife can manage and delete the photos she doesn't want)
- Reduce bandwidth costs of sharing photos
- Allow images to be enlarged
- Take up the full screen width
- Static HTML - why should my server be hammered every render?

I already host a ton of stuff using [Caddy](https://caddyserver.com/) so wanted a simple container to route traffic to.

## Getting Started

### docker-compose.yml

```yml
version: "2.4"
services:
  thephotogallery:
    container_name: thephotogallery
    image: inlustra/the-photo-gallery:0.0.3
    ports:
      - 3000:3000
    volumes:
      - {YOUR_PHOTOS_DIRECTORY}:/app/public/photos:ro
      - {A_STORAGE_LOCATION}:/app/storage
    environment:
      PAGE_TITLE: 'The Photo Gallery'
      PAGE_HEADER_TEXT: 'Inlustra'
      PAGE_SHOW_FULLSCREEN_BUTTON: 'true'
      PHOTO_SORT: numerical_file_name
      PHOTO_DEFAULT_REVERSE: 'false'
    restart: unless-stopped
```

## Configuration

The photo gallery is configured entirely with environment variables:
| Environment Variable | Description | Options (**default**) |
| -------------------- | ----------- | --------------------- |
| PAGE_HEADER_TEXT | Text at the top of the screen | string |
| PAGE_SHOW_FULLSCREEN_BUTTON | Whether or not the page should have the fullscreen button | boolean |
| PAGE_TITLE | Title that appears in the tab in your browser | string |
| PHOTO_DEFAULT_REVERSE | Whether the photos should be by default reversed on the page | boolean |
| PHOTO_SORT | Sort order for images | numerical_file_name, file_name, modified_at, **image_taken_date** |
| IMAGOR_CLIENT_BASE_URL | The Imagor base url for the client to fetch images, e.g for docker with exposed port: http://localhost:8000/ | * |
| IMAGOR_IMAGE_FILTERS | Any extra image filters to be requested by imagor, must start with: ':', example: ':hue(290):saturation(100)' | string |
| IMAGOR_IMAGE_FORMAT | Image format to be requested by Imagor, defaults to webp | jpeg, png, gif, **webp**, tiff, avif |
| IMAGOR_SECRET | Set this if you have set the IMAGOR_SECRET environment variable within imagor | * |
| IMAGOR_SERVER_BASE_URL | The Imagor base url for the container to fetch metadata, e.g for docker: http://imagor:8000/ | * |
| NODE_DISABLE_BLUR_GENERATION | Disable the blur generation, will significantly speed up build. Not recommended but required for *very* large directories. | boolean |
| NODE_USE_EMBEDDED_THUMBNAILS | During generation, if the photo has an embedded thumbnail, this can be used instead a blur | boolean |

A couple of extra notes: 
- `PHOTO_SORT`:
  - `image_taken_date`: (DEFAULT) Will sort by the date since the photos were taken, this uses EXIF data from the photo (Worth noting that not all images will have this data available)
  - `file_name`: Sorts based on file name [a.jpg, b.jpg.... z.jpg]
  - `numerical_file_name`: Sorts based on file name using numbers [1.jpg, 2.jpg... 99.jpg], this is particularly useful when your file names are not in a set string format [01.jpg, 02.jpg, 99.jpg]
  - `modified_at`: Sort based on the last modification date of the photo

- `PHOTO_USE_EMBEDDED_THUMBNAILS`: This will use the embedded thumbnails instead of generating a blur. Defaults to false, this is not really recomended but might be useful for a smaller amount of larger images. (775 full pictures with this environment variable set to `true` caused the initial page download to go from 225kb to 15MB)


# Imagor
As of v0.0.2, we now support Imagor!

Imagor is a self hosted service that we can use to generate images ourselves.

### Benefits
- Support all file types
- Uses a *much better* (Read sturdy) implementation to get metadata and exif data about images

### Caveats
- Thumbnails will be hosted by yourself instead of using the next services
- More setup

## Getting Started with Imagor

### docker-compose.yml
```yml
version: "2.4"
services:
  thephotogallery:
    container_name: thephotogallery
    image: inlustra/the-photo-gallery:0.0.3
    ports:
      - 2070:3000
    volumes:
      # - ${BASE_DIR}/favicon.ico:/app/public/favicon.ico:ro # Use this to replace the favicon
      - ${BASE_DIR}/public/photos:/app/public/photos:ro
      - ${BASE_DIR}/storage/cache:/app/storage
    environment:
      PAGE_TITLE: 'The Photo Gallery'
      PAGE_HEADER_TEXT: 'Inlustra'
      PAGE_SHOW_FULLSCREEN_BUTTON: 'false'
      PHOTO_DEFAULT_REVERSE: 'false'
      PHOTO_USE_EMBEDDED_THUMBNAILS: 'false'
      IMAGOR_SERVER_BASE_URL: 'http://imagor:8000' # Uses Imagor internal docker port
      IMAGOR_CLIENT_BASE_URL: 'http://localhost:4567' # Uses Imagor external docker port
    depends_on:
      - imagor
    restart: unless-stopped

  imagor:
    image: shumc/imagor:latest
    volumes:
      - ${BASE_DIR}/public/photos:/mnt/public/photos
      - ${BASE_DIR}/storage/imagor:/mnt/result
    environment:
      PORT: 8000
      IMAGOR_UNSAFE: 1 # unsafe URL for testing
      
      # Keep the next 2 the same to ensure that we don't store duplicates of the images within Imagor
      FILE_LOADER_BASE_DIR: /mnt/public # enable file loader by specifying base dir
      FILE_STORAGE_BASE_DIR: /mnt/public # enable file storage by specifying base dir

      FILE_STORAGE_MKDIR_PERMISSION: 0755
      FILE_STORAGE_WRITE_PERMISSION: 0666

      FILE_RESULT_STORAGE_BASE_DIR: /mnt/result # This is the cache storage folder
      FILE_RESULT_STORAGE_MKDIR_PERMISSION: 0755
      FILE_RESULT_STORAGE_WRITE_PERMISSION: 0666
    ports:
      - "4567:8000"
```