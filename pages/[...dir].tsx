import { Home } from "./index";

export async function getStaticPaths() {
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
  
export { getStaticProps } from "./index";

export default Home;
