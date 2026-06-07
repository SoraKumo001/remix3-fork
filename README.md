# Welcome to Remix 3 fork!

This is the source repository for Remix 3. It is under active development.

We published [a blog post](https://remix.run/blog/wake-up-remix) earlier this year with some of our thoughts around Remix 3. It explains our philosophy for web development and why we think the time is right for something new. When working on Remix 3, we follow these principles:

1. **Model-First Development**. AI fundamentally shifts the human-computer interaction model for both user experience and developer workflows. Optimize the source code, documentation, tooling, and abstractions for LLMs. Additionally, develop abstractions for applications to use models in the product itself, not just as a tool to develop it.
2. **Build on Web APIs**. Sharing abstractions across the stack greatly reduces the amount of context switching, both for humans and machines. Build on the foundation of Web APIs and JavaScript because it is the only full stack ecosystem.
3. **Religiously Runtime**. Designing for bundlers/compilers/typegen (and any pre-runtime static analysis) leads to poor API design that eventually pollutes the entire system. All packages must be designed with no expectation of static analysis and all tests must run without bundling. Because browsers are involved, `--import` loaders for simple transformations like TypeScript and JSX are permissible.
4. **Avoid Dependencies**. Dependencies lock you into somebody else's roadmap. Choose them wisely, wrap them completely, and expect to replace most of them with our own package eventually. The goal is zero.
5. **Demand Composition**. Abstractions should be single-purpose and replaceable. A composable abstraction is easy to add and remove from an existing program. Every package must be useful and documented independent of any other context. New features should first be attempted as a new package. If impossible, attempt to break up the existing package to make it more composable. However, tightly coupled modules that almost always change together in both directions should be moved to the same package.
6. **Distribute Cohesively**. Extremely composable ecosystems are difficult to learn and use. Remix will be distributed as a single `remix` package for both distribution and documentation.

## Goals

Although we recommend the `remix` package for ease of use, all packages that make up Remix should be usable standalone as well. This forces us to consider package boundaries and helps us define public interfaces that are portable and interoperable.

Each package in Remix:

- Has a [single responsibility](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- Prioritizes web standards to ensure maximum interoperability and portability across JavaScript runtimes
- Augments standards unobtrusively where they are missing or incomplete, minimizing incompatibility risks

This means Remix code is **portable by default**. Remix packages work seamlessly across [Node.js](https://nodejs.org/), [Bun](https://bun.sh/), [Deno](https://deno.com/), [Cloudflare Workers](https://workers.cloudflare.com/), and other environments.

We leverage server-side web APIs when they are available:

- [The Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) instead of `node:stream`
- [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) instead of Node.js `Buffer`s
- [The Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) instead of `node:crypto`
- [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) and [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) instead of some bespoke runtime-specific API

The benefit is code that's not just reusable, but **future-proof**.

## Packages

The packages in this repository are managed as a pnpm workspace under `packages/`:

- [@remix-run/assert](packages/assert): Node assert-compatible utilities for any JavaScript environment.
- [@remix-run/node-tsx](packages/node-tsx): Run Node.js with TypeScript and JSX syntax support.
- [@remix-run/terminal](packages/terminal): Terminal output utilities for JavaScript libraries and CLIs.
- [@remix-run/test](packages/test): A test framework for JavaScript and TypeScript projects.
- [@remix-run/ui](packages/ui): View layer with reconciler, component model, and first-party UI components.

## Development

This repository uses [pnpm](https://pnpm.io/) for package management.

### Setup

Install dependencies:

```sh
pnpm install
```

### Build

Build all packages:

```sh
pnpm run build
```

Or build a specific package:

```sh
pnpm --filter @remix-run/ui run build
```

### Testing and Validation

Run tests and linting across the monorepo:

- **Lint**: `pnpm run lint`
- **Format Check**: `pnpm run format:check`
- **Test**: `pnpm test`
- **Type Check**: `pnpm run typecheck`

## Contributing

We welcome contributions! If you'd like to contribute, please feel free to open an issue or submit a pull request. See [CONTRIBUTING](https://github.com/remix-run/remix/blob/main/CONTRIBUTING.md) for more information.

## License

See [LICENSE](https://github.com/remix-run/remix/blob/main/LICENSE)
