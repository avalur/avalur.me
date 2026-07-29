import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Files under src/partials/ get pulled into blog posts via the
// remark-include-html plugin (a plain fs.readFileSync, invisible to Vite's
// module graph and to Astro's content-layer digest). Editing a partial alone
// doesn't change the byte content of the .md file that includes it, so
// Astro sees "nothing changed" and keeps serving the previously rendered
// HTML. Fix: watch src/partials/, and on change, rewrite a tiny sync-marker
// comment inside every post that references an include -- a real content
// change, which reliably forces a fresh render (same as editing the post
// itself always does).
const PARTIALS_DIR = fileURLToPath(new URL("../partials/", import.meta.url));
const BLOG_DIR = fileURLToPath(new URL("../content/blog/", import.meta.url));

const SYNC_MARKER_RE = /<!-- partials-synced: [^>]*-->\n/;
const FRONTMATTER_RE = /^(---\n[\s\S]*?\n---\n)/;

function resyncBlogPosts() {
  const stamp = `<!-- partials-synced: ${Date.now()} -->\n`;
  for (const name of fs.readdirSync(BLOG_DIR)) {
    if (!name.endsWith(".md")) continue;
    const file = path.join(BLOG_DIR, name);
    const content = fs.readFileSync(file, "utf-8");
    if (!content.includes("<!-- include:")) continue;
    const updated = SYNC_MARKER_RE.test(content)
      ? content.replace(SYNC_MARKER_RE, stamp)
      : content.replace(FRONTMATTER_RE, `$1${stamp}`);
    fs.writeFileSync(file, updated);
  }
}

export default function watchPartials() {
  return {
    name: "watch-partials",
    configureServer(server) {
      server.watcher.add(PARTIALS_DIR);
      server.watcher.on("change", (file) => {
        if (path.resolve(file).startsWith(path.resolve(PARTIALS_DIR))) {
          resyncBlogPosts();
        }
      });
    },
  };
}
