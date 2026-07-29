import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolves <!-- include: some-file.html --> HTML comments in markdown/blog
// content by inlining the raw contents of src/partials/some-file.html at
// that exact spot. Lets a chunk of markup (e.g. a diagram) live in its own
// file and still render inside a post.
const PARTIALS_DIR = fileURLToPath(new URL("../partials/", import.meta.url));

const INCLUDE_RE = /^<!--\s*include:\s*([\w.\-\/]+)\s*-->\s*$/;

function resolveIncludes(node) {
  if (!node || !Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    if (child.type === "html" && typeof child.value === "string") {
      const match = INCLUDE_RE.exec(child.value.trim());
      if (match) {
        const filePath = path.join(PARTIALS_DIR, match[1]);
        const content = fs.readFileSync(filePath, "utf-8");
        return { ...child, value: content };
      }
    }
    resolveIncludes(child);
    return child;
  });
}

export default function remarkIncludeHtml() {
  return (tree) => {
    resolveIncludes(tree);
  };
}
