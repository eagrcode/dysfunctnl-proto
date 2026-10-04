# Backend development

The backend supports JavaScript and TypeScript together. Existing application files
stay in `src` as `.js`; new features can use `.ts`.

Run these commands from the `server` directory:

```sh
npm ci
npm run dev
```

`npm run dev` uses `tsx` to run `src/server.js` and reload when imported JavaScript
or TypeScript files change. It runs the code without checking types. Run
`npm run typecheck` separately to check TypeScript files, or
`npm run typecheck -- --watch` for continuous checking.

## Writing TypeScript

`tsconfig.json` enables strict checking for TypeScript, allows imports from existing
JavaScript, and leaves JavaScript checking disabled. There is no need to convert an
existing JavaScript file before using it from a TypeScript feature.

The backend uses CommonJS at runtime. In `.ts` files, normal TypeScript imports and
named exports are supported; development, build, and test tools convert them to
CommonJS. Keep `require` and `module.exports` in existing `.js` files.

Use `import type` for types such as Express `Request` and `Response`. Prefer typed
imports for runtime values in TypeScript, for example `import { Router } from
"express"`, so TypeScript can check their usage too.

For local modules, use extensionless paths, such as `./onboarding.controller`.
Both the development runner and compiled JavaScript can resolve those paths. Avoid
hardcoding a `.ts` extension, since production runs the compiled `.js` files.

The onboarding router currently uses `module.exports` so a JavaScript caller can
load it directly with `require`. A TypeScript named export is instead accessed as a
property of the object returned by `require`; a default export uses `.default`.

## Tests

```sh
npm test
```

Jest supports existing `.js` tests and new `.ts` tests. Babel removes TypeScript
syntax and converts imports for Jest. Tests do not replace `npm run typecheck`,
which checks application source under `src`.

## Production

```sh
npm ci
npm run build
npm start
```

The build clears `dist`, checks TypeScript, and outputs JavaScript for the entire
application to `dist`. Source files are not overwritten. `npm start` runs
`dist/server.js`, so build before starting and after changing source files.

Production only needs `dist`, runtime dependencies, and the existing environment
and upload configuration. Build with development dependencies available; either
ship `dist` from that build or build on the server before pruning development
dependencies. Running `npm ci --omit=dev` alone cannot build the application.

If a process manager starts Node directly, point it at `dist/server.js` and keep
its working directory set to the `server` directory.
