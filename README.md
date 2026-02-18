# Bitcoin Alps Website

This website is build using [the Astro framework](https://astro.build).

## 🚀 Project Structure

Inside of the project, you'll see the following folders and files:

```text
/
├── public/
│   └── docs/
│   └── logo.svg
├── src/
│   ├── assets/
│   │   ├── bitcoin_spenden.svg
│   │   └── covers/
│   └── pages/
│       └── index.mdx
```

Astro looks for `.astro` or `.mdx` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

Images that are used from pages should be placed in the `src/assets/` directory. They will be automatically resized and compressed.

Any static assets, like downloadable files, PDFs etc. can be placed in the `public/` directory.

## Content

### Frontmatter

`.mdx` files should always provide the following frontmatter data:

```text
---
title: Title as shown on the page and used in metadata
description: Description used in metadata
cover: covers/cover-file.svg
---
```
* Covers should be SVG illustrations from https://storyset.com/amico and be placed in the `src/assets/covers` directory.

If the page is to be displayed in the menu, the following frontmatter must be added:
```text
navigation:
    order: 10
    title: Menu Title
```
* `title` can be omitted to use the page title.
* `order` defines the position of this node among its siblings in the menu. It is recommended to space values apart in 10s or 100s to enable easy insertion of nodes at a later date.

### Elements

The usage of MDX enables using components inside markdown. The following components are imported by default and are available for use:
* Image
* ImageGallery

#### Image component usage

`<Image src="path/to/image.jpg" size="small" float="left" alt="Image description" />`

* `src` is relative to the `src/assets/` directory, to use the image file stored at `src/assets/foo/bar.jpg` you would use `src="foo/bar.jpg"`
* Possible values for `size`:
    - `logo` for very small, fixed size images
    - `small` for images that are half-width and inside the text flow
    - `large` for full-width images that break apart the text flow
* Possible values for `float`:
    - `left` The text wraps around the right side of the image (default).
    - `right` The text wraps around the left side of the image.
    - `none` Disable text wrapping

#### Image gallery component usage

`<ImageGallery src="path/to/folder-with-images" />`

* `src` is relative to the `src/assets/` directory, to display a gallery of all images inside the directory `src/assets/foo/` you would use `src="foo"`

#### Course registration component usage

Displays a registration button with customizable text, opens a registration modal on click.
This component must be manually imported with `import CourseRegistration from "@components/forms/CourseRegistration.svelte"`

`<CourseRegistration client:load eventName="Event name" eventDate="Event date from-to, free text">Button text</CourseRegistration>`

* `client:load` needs to be specified for the component to work correctly
* `eventName` the name of the event, will be shown as the title in the registration form
* `eventDate` the date(s) and time(s) etc. in freeform text, will be shown directly below the event name
* Child content will be shown inside the button


## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## 👀 Want to learn more?

Feel free to check [the Astro documentation](https://docs.astro.build)
