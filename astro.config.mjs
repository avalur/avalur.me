// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkIncludeHtml from "./src/lib/remark-include-html.mjs";
import watchPartials from "./src/lib/vite-watch-partials.mjs";

export default defineConfig({
  site: "https://avalur.me",
  integrations: [mdx(), react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath, remarkIncludeHtml],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss(), watchPartials()],
  },
});
