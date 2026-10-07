import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = pathResolve(dirname(parentPath), specifier);

    if (!extname(specifier)) {
      for (const extension of [".ts", ".tsx", ".mjs", ".js"]) {
        if (existsSync(base + extension)) {
          return nextResolve(specifier + extension, context);
        }
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        strict: false,
      },
    });

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
