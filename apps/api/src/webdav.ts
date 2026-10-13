import type { Hono } from "hono";
import { Webdav } from "@jsr/smallweb__webdav";

export function webdav(app: Hono, rootDir: string) {
  const dav = new Webdav({
    rootDir,
  });
  app.mount("/webdav", async (req) => {
    const url = new URL(req.url);
    const newPath = url.pathname.replace("/webdav", rootDir);
    url.pathname = newPath;
    const newReq = new Request(url.toString(), req);
    const result = await dav.fetch(newReq);
    return result;
  });
}
