import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));
  app.get("/privacidad", (_req, res) => {
    res.sendFile(path.resolve(distPath, "privacidad.html"));
  });

  // the app's not-found page keeps a real 404 status for crawlers
  app.get("/404", (_req, res) => {
    res.status(404).set("X-Robots-Tag", "noindex").sendFile(path.resolve(distPath, "404.html"));
  });

  // Only known CRM routes get the SPA; unknown URLs keep their true status.
  app.get("*", (req, res) => {
    const known = /^\/(demo|app)(\/(overview|inbox|pipeline|contacts|knowledge|followups|settings))?\/?$/.test(req.path);
    if (known || req.path === "/") {
      res.set("Cache-Control", "private, no-store").sendFile(path.resolve(distPath, "index.html"));
      return;
    }
    res.status(404).set("X-Robots-Tag", "noindex").sendFile(path.resolve(distPath, "404.html"));
  });
}
