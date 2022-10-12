# The Photo Gallery

A simple, featureless (By design) full-width photo gallery.

### Features
- Full width photo display
- Lightbox built-in
- Automatic image optimization courtesy of NextJS and team
- Generation of loading blurs
- Statically generated, the server just serves regular HTML + JS, once deployed to production, it's **quick**
- Automatic dynamic regeneration should you edit/remove/add photos
- Can handle hundreds (And thousands?) of images at a time
- Lazy loading as you scroll
- Full screen toggle
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
    image: inlustra/the-photo-gallery:0.0.2
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

- `PHOTO_SORT`: How your photos should be sorted on the page, choice of:
  - `image_taken_date`: (DEFAULT) Will sort by the date since the photos were taken, this uses EXIF data from the photo
  - `file_name`: Sorts based on file name [a.jpg, b.jpg.... z.jpg]
  - `numerical_file_name`: Sorts based on file name using numbers [1.jpg, 2.jpg... 99.jpg], this is particularly useful when your file names are not in a set string format [01.jpg, 02.jpg, 99.jpg]
  - `modified_at`: Sort based on the last modification date of the photo
- `PHOTO_DEFAULT_REVERSE`: Use this to reverse the sort methods above [z.jpg... b.jpg, a.jpg]
- `PAGE_SHOW_FULLSCREEN_BUTTON`: Use this to show or hide the full screen button at the top of the page, choice of:
  - `true`: (Default)
  - `false`
- `PAGE_TITLE`: The title of the page as appears in a tab
- `PAGE_HEADER_TEXT`: The text that appears above the full screen button
