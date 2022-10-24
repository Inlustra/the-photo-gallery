import type { NextApiHandler } from "next";
import { createLogger } from "../../lib/create-logger";
import environment from "../../lib/environment";

export const handler: NextApiHandler = async (req, res) => {
  const logger = createLogger({ level: environment.logLevel });
  if (
    process.env.REGEN_SECRET &&
    req.query.secret !== process.env.REGEN_SECRET
  ) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const { path } = req.query;
    logger.info("Regenerating pages.", { path });
    if (typeof path === "string") {
      await res.revalidate(path);
    } else if (Array.isArray(path)) {
      const regens = await Promise.all(
        path.map((path) => res.revalidate(path))
      );
      await Promise.all(regens);
    } else {
      res.revalidate("/");
    }
    return res.json({ revalidated: true });
  } catch (err) {
    logger.error(err);
    return res.status(500).send("Error revalidating");
  }
};

export default handler;
