# avalur.me

The personal site uses Astro. Account registration and private cycling-trip pages are described in [docs/private-trips.md](docs/private-trips.md). Personal stories and media stay outside the public build and Git repository.

## Original Astro starter notes

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Runs the full site, including account and private-trip server routes, at `localhost:4321` |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Limited static build preview; does not serve account or private-trip server routes |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

Use `npm run dev` with the [local account and database configuration](docs/private-trips.md#local-development) to test the complete site. The Vercel adapter does not provide a local server preview; validate the deployed build in the stable Vercel Preview environment.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
