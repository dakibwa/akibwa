import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const surfaceConfig = readJson("data/public-surfaces.json");
const hasStaticExport = existsSync(join(root, "out"));

const checks = surfaceConfig.surfaces.flatMap((surface) => [
  routeCheck(surface),
  ...dataChecks(surface),
  ...(hasStaticExport ? [exportCheck(surface)] : [])
]);

const failed = checks.filter((check) => !check.ok);

console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      checkedAt: new Date().toISOString(),
      surfaces: surfaceConfig.surfaces.length,
      staticExportChecked: hasStaticExport,
      checks
    },
    null,
    2
  )
);

if (failed.length) {
  process.exitCode = 1;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function routeCheck(surface) {
  const routePath = routeWithoutHash(surface.route);
  const appPath = routePath === "/" ? "app/page.jsx" : `app${routePath}/page.jsx`;

  return {
    surface: surface.id,
    type: "source-route",
    target: appPath,
    ok: existsSync(join(root, appPath))
  };
}

function dataChecks(surface) {
  return ["fallbackData", "siteData"]
    .filter((field) => surface[field])
    .map((field) => ({
      surface: surface.id,
      type: field,
      target: surface[field],
      ok: existsSync(join(root, surface[field]))
    }));
}

function exportCheck(surface) {
  const routePath = routeWithoutHash(surface.route);
  const outputPath = routePath === "/" ? "out/index.html" : `out${routePath}/index.html`;

  return {
    surface: surface.id,
    type: "static-export-route",
    target: outputPath,
    ok: existsSync(join(root, outputPath))
  };
}

function routeWithoutHash(route) {
  const path = String(route || "/").split("#")[0] || "/";
  return path === "/" ? "/" : path.replace(/\/$/, "");
}
