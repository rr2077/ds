const fs = require("fs-extra");
const path = require("path");
const fg = require("fast-glob");
const JavaScriptObfuscator = require("javascript-obfuscator");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const JS_OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

function splitUserscriptHeader(source) {
  const match = source.match(/^(\s*\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*)([\s\S]*)$/);

  if (!match) {
    return { header: "", body: source };
  }

  return {
    header: match[1].trimEnd() + "\n\n",
    body: match[2]
  };
}

function obfuscateJs(source, filename) {
  const result = JavaScriptObfuscator.obfuscate(source, {
    ...JS_OBFUSCATOR_OPTIONS,
    inputFileName: filename
  });

  return result.getObfuscatedCode();
}

async function main() {
  await fs.remove(DIST);
  await fs.ensureDir(DIST);

  const files = await fg(
    [
      "**/*",
      "!node_modules/**",
      "!dist/**",
      "!.git/**",
      "!scripts/**",
      "!package.json",
      "!package-lock.json"
    ],
    {
      cwd: ROOT,
      dot: false,
      onlyFiles: true
    }
  );

  for (const file of files) {
    const src = path.join(ROOT, file);
    const dst = path.join(DIST, file);
    const ext = path.extname(file).toLowerCase();

    await fs.ensureDir(path.dirname(dst));

    if (file.endsWith(".user.js")) {
      const source = await fs.readFile(src, "utf8");
      const { header, body } = splitUserscriptHeader(source);
      const obfuscated = obfuscateJs(body, file);

      await fs.writeFile(dst, header + obfuscated + "\n", "utf8");
      console.log(`obfuscated userscript: ${file}`);
      continue;
    }

    if (ext === ".js") {
      const source = await fs.readFile(src, "utf8");
      const obfuscated = obfuscateJs(source, file);

      await fs.writeFile(dst, obfuscated + "\n", "utf8");
      console.log(`obfuscated js: ${file}`);
      continue;
    }

    await fs.copy(src, dst);
    console.log(`copied: ${file}`);
  }

  console.log("Build complete:", DIST);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});