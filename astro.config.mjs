import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import AutoImport from "astro-auto-import";
import { addDefaultFrontmatterEntries } from "./addDefaultFrontmatterEntries.mjs";

// https://astro.build/config
export default defineConfig({
    site: "https://www.bitcoin-alps.ch",
    compressHTML: false,
    markdown: {
        remarkPlugins: [
            addDefaultFrontmatterEntries,
        ]
    },
    integrations: [
        AutoImport({
            imports: [
                "/src/components/Image.astro",
                "/src/components/ImageGallery.astro",
            ]
        }),
        mdx(),
        sitemap(),
        icon({
            include: {}
        }),
    ],
    vite: {
        css: {
            devSourcemap: true,
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "/src/styles/variables" as *;`,
                },
            },
        },
    }
});
