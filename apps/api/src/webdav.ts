import { Hono } from "@hono/hono";
import { Webdav } from "@smallweb/webdav";

export function webdav(app: Hono, rootDir: string) {
  const dav = new Webdav({
    rootDir,
    
  })
  app.mount("/webdav", async (req) => {
    const url = new URL(req.url);
    const newPath = url.pathname.replace("/webdav", rootDir);
    url.pathname = newPath;
    const newReq = new Request(url.toString(), req);
    const result = await dav.fetch(newReq);
    console.log(rootDir,result)
    return result;
  });
}
