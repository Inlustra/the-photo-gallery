# The Photo Gallery

A simple, featureless (By design) full-width photo gallery.

### Features
- Full width photo display
- Lightbox built-in
- Automatic image optimization courtesy of NextJS and team
- Generation of loading blurs
- Server side rendered, once deployed to production, it's **quick**
- Automatic dynamic regeneration should you edit/remove/add photos
- Can handle hundreds (And thousands?) of images at a time
- Lazy loading as you scroll
- Full screen toggle
- Image sorting
  - Numerical file names (1.jpg, 2.jpg, 3.jpg...)
  - Created time
  - Regular file names (a.jpg, b.jpg...) (2022-10-09.jpg, 2022-10-10.jpg...)
  - Reverse of any of the above!

## Getting Started
### docker-compose.yml
```yml
version: "2.4"
services:
  thephotogallery:
    container_name: thephotogallery
    image: inlustra/the-photo-gallery:0.0.1
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
