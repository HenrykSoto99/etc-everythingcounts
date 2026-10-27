import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const root = process.cwd();
const dir = path.join(root, ".etc-public-render");
try {
  await build({
    entryPoints: {
      landing: "client/src/pages/etc/Landing.tsx",
      privacy: "client/src/pages/etc/Privacy.tsx",
      notfound: "client/src/pages/NotFound.tsx",
    },
    outdir: dir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
    alias: { "@": path.join(root, "client/src") },
  });
  const template = await fs.readFile(
    path.join(root, "dist/public/index.html"),
    "utf8"
  );
  const pages = [
    { module: "landing", file: "index.html" },
    {
      module: "privacy",
      file: "privacidad.html",
      title: "Privacidad y alcance del MVP — ETC",
      description:
        "Datos ficticios, IA supervisada y preparación del espacio privado. Conoce la privacidad y los límites de la demo de ETC — EveryThingCounts.",
    },
    {
      module: "notfound",
      file: "404.html",
      title: "Página no encontrada — ETC",
      description:
        "Esta dirección no existe. Vuelve al frontdesk de ETC — EveryThingCounts.",
      noindex: true,
    },
  ];
  for (const p of pages) {
    const { default: Component } = await import(
      pathToFileURL(path.join(dir, `${p.module}.mjs`)).href
    );
    let html = template.replace(
      '<div id="root"></div>',
      `<div id="root">${renderToString(React.createElement(Component))}</div>`
    );
    if (p.title)
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${p.title}</title>`);
    if (p.description)
      html = html.replace(
        /<meta name="description" content="[^"]*"\s*\/>/,
        `<meta name="description" content="${p.description}" />`
      );
    if (p.noindex)
      html = html.replace(
        "</head>",
        '<meta name="robots" content="noindex" /></head>'
      );
    await fs.writeFile(path.join(root, "dist/public", p.file), html);
  }
  console.log("HTML público generado: landing, privacidad y 404.");
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
