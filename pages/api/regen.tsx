import type { NextApiHandler } from "next";
export const handler: NextApiHandler = async (req, res) => {
  if (
    process.env.REGEN_SECRET &&
    req.query.secret !== process.env.REGEN_SECRET
  ) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    await res.revalidate("/");
    return res.json({ revalidated: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error revalidating");
  }
};

export default handler;
