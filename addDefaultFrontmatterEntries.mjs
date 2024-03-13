export function addDefaultFrontmatterEntries() {
    return function (_, file) {
        const frontmatter = file.data.astro.frontmatter;
        if (!frontmatter.layout) {
            frontmatter.layout = "@layouts/Page.astro";
        }
    };
}
