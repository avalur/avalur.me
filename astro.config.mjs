// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkIncludeHtml from "./src/lib/remark-include-html.mjs";
import watchPartials from "./src/lib/vite-watch-partials.mjs";

export default defineConfig({
  site: "https://avalur.me",
  adapter: vercel({ excludeFiles: ['.private/**', '.env', '.env.*'] }),
  output: "static",
  compressHTML: true,
  integrations: [mdx(), react(), sitemap({
    filter: (page) => !/^\/(?:trips|account|api|tetris|login|register|verify-email|forgot-password|reset-password)(?:\/|$)/.test(new URL(page).pathname),
  })],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkIncludeHtml],
      rehypePlugins: [rehypeKatex],
    }),
  },
  vite: {
    plugins: [tailwindcss(), watchPartials()],
  },
});
