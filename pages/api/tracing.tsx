import type { NextApiRequest, NextApiResponse } from "next";
import chokidar from 'chokidar';
import axios from 'axios';

// This doesn't do anything, ot's just to make sure that the libraries
// get included in the NextJS build using the standalone output
export const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  chokidar.watch([]);
  axios('test.com')
};

export default handler;
