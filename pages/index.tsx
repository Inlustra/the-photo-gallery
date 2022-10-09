import type { GetServerSideProps, GetStaticProps, NextPage } from "next";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Gallery, {
  PhotoProps,
  PhotoClickHandler,
  RenderImageProps,
} from "react-photo-gallery";
import ImageC from "next/future/image";
import Lightbox from "react-image-lightbox";
import useWindowScroll from "react-use/lib/useWindowScroll";
import useMedia from "react-use/lib/useMedia";
import "react-image-lightbox/style.css"; // This only needs to be imported once in your app
import { getPhotos, LoadedPhoto } from "../lib/get-photos";
import Head from "next/head";
import styled from "styled-components";
import useFullscreen from "react-use/lib/useFullscreen";
import useToggle from "react-use/lib/useToggle";

type Blur = { blurDataURL: string };

const PhotoContainer = styled.div`
  transition: transform 0.1s ease;
  cursor: pointer;
  border: 2px solid black;

  @media (min-width: 480px) {
    &:hover {
      transform: scale(1.15);
      z-index: 999;
    }
  }
`;

const Header = styled.div`
  width: 100%;
  color: white;
  font-family: "Frank Ruhl Libre", serif;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 22px;
  margin-top: 12px;
`;

const FullScreenButton = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  background-color: black;
  border: 1px solid white;
  font-family: "Frank Ruhl Libre", serif;
  border-radius: 4px;
  margin-top: 8px;
  padding-left: 6px;
  padding-right: 6px;
  margin-bottom: 12px;
  cursor: pointer;
  &:hover {
    background-color: white;
    color: black;
  }
`;

const Photo: React.FC<RenderImageProps<PhotoProps & Blur>> = ({
  photo,
  onClick,
  index,
}) => {
  return (
    <PhotoContainer onClick={(evt) => onClick?.(evt, { index, ...photo })}>
      <ImageC
        key={`photo-${index}`}
        src={photo.src}
        width={photo.width}
        height={photo.height}
        blurDataURL={photo.blurDataURL}
        placeholder="blur"
        alt="photo"
        className="photo"
        style={{ height: "100%" }}
      />
    </PhotoContainer>
  );
};

interface HomeProps {
  title: string;
  photos: LoadedPhoto[];
}

const Home: NextPage<HomeProps> = ({ photos, title }) => {
  const isTablet = useMedia("(min-width: 480px)", true);
  const amountOfPhotosToLoad = useMemo(() => (isTablet ? 40 : 10), [isTablet]);
  const [paginatedImages, setPaginatedImages] = useState(
    photos.slice(0, amountOfPhotosToLoad)
  );
  const loadMore = useCallback(
    () =>
      setPaginatedImages((images) =>
        photos.slice(0, images.length + amountOfPhotosToLoad)
      ),
    [setPaginatedImages, amountOfPhotosToLoad, photos]
  );

  const [currentImage, setCurrentImage] = useState(0);
  const [viewerIsOpen, setViewerIsOpen] = useState(false);
  const mainSrc = useMemo(
    () => paginatedImages[currentImage]?.src,
    [currentImage, paginatedImages]
  );
  const nextSrc = useMemo(
    () => paginatedImages[(currentImage + 1) % paginatedImages.length]?.src,
    [currentImage, paginatedImages]
  );
  const prevSrc = useMemo(
    () =>
      paginatedImages[
        (currentImage + paginatedImages.length - 1) % paginatedImages.length
      ]?.src,
    [currentImage, paginatedImages]
  );

  const [isFullscreen, setFullscreen] = useState(false);
  const toggleFullScreen = useCallback(() => {
    if (!isFullscreen) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
    setFullscreen((fs) => !fs);
  }, [isFullscreen, setFullscreen]);

  const next = useCallback(() => {
    if (currentImage === paginatedImages.length - 1) {
      loadMore();
    }
    setCurrentImage((image) => image + 1);
  }, [setCurrentImage, currentImage, paginatedImages, loadMore]);
  const previous = useCallback(() => {
    setCurrentImage((image) => (image === 0 ? 0 : image - 1));
  }, [setCurrentImage]);

  const openLightbox = useCallback<PhotoClickHandler<Blur>>((_, { index }) => {
    setCurrentImage(index);
    setViewerIsOpen(true);
  }, []);
  const { x, y } = useWindowScroll();
  useEffect(() => {
    const distanceToBottom =
      document.body.clientHeight - y - window.innerHeight;
    if (distanceToBottom < 800) loadMore();
  }, [x, y, loadMore]);
  return (
    <div>
      <Head>
        <title>{title ?? "Photo Stream"}</title>
      </Head>

      <Header>
        03/09/2022
        <FullScreenButton onClick={toggleFullScreen}>
          {!isFullscreen ? "View in Fullscreen" : "Exit Fullscreen"}
        </FullScreenButton>
      </Header>
      {viewerIsOpen ? (
        <Lightbox
          mainSrc={mainSrc}
          prevSrc={prevSrc}
          nextSrc={nextSrc}
          onImageLoad={() => {
            window.dispatchEvent(new Event("resize"));
          }}
          onMoveNextRequest={next}
          onMovePrevRequest={previous}
          onCloseRequest={() => setViewerIsOpen(false)}
          discourageDownloads={false}
        />
      ) : null}
      <Gallery
        photos={paginatedImages}
        onClick={openLightbox as any}
        renderImage={Photo as any}
      />
    </div>
  );
};

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const photos = await getPhotos();
  return {
    props: {
      title: process.env.NEXT_PUBLIC_TITLE ?? "Photo Stream",
      photos,
    },
  };
};

export default Home;
