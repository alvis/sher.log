<div align="center">

<img src="./logo.svg" alt="sherlog logo" width="220" />

# sherlog

[![npm](https://img.shields.io/npm/dm/sherlog?style=flat-square)](https://www.npmjs.com/package/sherlog)
[![build](https://img.shields.io/github/actions/workflow/status/alvis/sherlog/main.yaml?style=flat-square)](https://github.com/alvis/sherlog/actions)
[![dependencies](https://img.shields.io/librariesio/release/npm/sherlog?style=flat-square)](https://libraries.io/npm/sherlog)
[![license](https://img.shields.io/github/license/alvis/sherlog.svg?style=flat-square)](https://github.com/alvis/sherlog/blob/main/LICENSE)

**Render errors beautifully** — colorized stack traces, syntax-highlighted source code, and YAML metadata display for TypeScript.

_Transforms noisy stack traces into readable, source-mapped, context-rich error output for Node.js and browsers._

</div>

> 🔗 **Need structured error handling?** Context-preserving, chainable, serializable errors with metadata embedding, namespace categorization, and tag inheritance are available in the companion package [**xception**](https://github.com/alvis/xception).

---

## ⚡ Quick Start

```bash
# npm
npm install sherlog xception
# pnpm
pnpm add sherlog xception
# yarn
yarn add sherlog xception
```

```ts
import { Xception } from 'xception';
import { renderError } from 'sherlog';

const error = new Xception('something went wrong', {
  namespace: 'myapp',
  tags: ['critical'],
  meta: { requestId: 'abc-123' },
  cause: new Error('Connection timeout'),
});

console.error(await renderError(error, { showSource: true }));
```

**Terminal output:**

```
[Xception] something went wrong

    myapp critical

    METADATA
    requestId: abc-123

    at main (/app/server.ts:42:11)

   40 | async function main() {
   41 |   try {
 > 42 |     throw new Xception('something went wrong', { ... });
   43 |   } catch (error) {
   44 |     // Error handling
   45 |   }

    ... further lines matching cause stack trace below ...

  [Error] Connection timeout
        at main (/app/server.ts:42:45)
```

---

## ✨ Why sherlog?

### 😩 The Problem

Standard error output in JavaScript is noisy and unhelpful:

- **Noisy stacks**: Dozens of irrelevant `node:internal` and `node_modules` frames drown out the real issue
- **Lost context**: Error metadata, namespaces, and tags are invisible in default console output
- **Transpilation gap**: Stack traces point to compiled output, not your original TypeScript source
- **No metadata display**: Structured context attached via xception is lost in plain `console.error`

### 💡 The Solution

sherlog turns raw errors into readable diagnostics:

- **🎨 Colorized output**: Syntax-highlighted stack traces with chalk for instant visual parsing
- **📄 Source code display**: Shows the actual source lines around the error location with line numbers
- **🗺️ Source map resolution**: Automatically resolves transpiled code back to original TypeScript sources
- **🏷️ Metadata rendering**: Displays xception namespace, tags, and metadata in structured YAML format
- **🔗 Cause chain display**: Recursively renders the full error causality chain with proper indentation
- **🔇 Noise filtering**: Excludes `node:internal` and `node_modules` frames by default

---

## 🚀 Key Features

| Feature                   | sherlog | [pretty-error](https://www.npmjs.com/package/pretty-error) | [Youch](https://www.npmjs.com/package/youch) |
| ------------------------- | ------- | ---------------------------------------------------------- | -------------------------------------------- |
| **Source code display**   | ✅      | ❌                                                         | ❌                                           |
| **Source map resolution** | ✅      | ❌                                                         | ❌                                           |
| **Syntax highlighting**   | ✅      | ❌                                                         | Partial                                      |
| **Metadata rendering**    | ✅      | ❌                                                         | ❌                                           |
| **Cause chain display**   | ✅      | ❌                                                         | Partial                                      |
| **Browser support**       | ✅      | ❌                                                         | ✅                                           |
| **TypeScript-first**      | ✅      | ❌                                                         | Partial                                      |

**Core Benefits:**

- **🔍 Debug faster**: See the exact source code, metadata, and cause chain — no more guessing from raw stacks
- **🎯 Find root causes**: Full cause chain rendering shows the complete error story from origin to surface
- **🛡️ Production-ready**: Automatic source map resolution works with compiled TypeScript out of the box
- **📊 Context-aware**: Renders xception namespace, tags, and metadata so nothing is lost in console output

---

## 📖 Usage Examples

### Rendering Errors

```ts
import { renderError } from 'sherlog';

const output = await renderError(error, {
  showSource: true, // display source code context
  showStack: true, // show full stack trace (default)
  indent: 0, // indent spacing for each line (default)
  filter: (path) =>
    !path.includes('node:internal') && !path.includes('node_modules'),
});

console.error(output);
```

### Source Map Resolution

```ts
import { createSourceResolver } from 'sherlog';

// Create a resolver for a compiled file (reads inline source maps)
const resolve = await createSourceResolver('/path/to/compiled.js');

// Map a transpiled location back to the original source
const resolved = resolve({ line: 10, column: 5 });
// {
//   identifier: 'original.ts',
//   source: '... full source content ...',
//   line: 3,
//   column: 2
// }
```

### Stack Trace Parsing

```ts
import { disassembleStack, assembleStack } from 'sherlog';

// Parse a stack trace into structured blocks
const blocks = disassembleStack(error.stack!);
// [
//   { type: 'description', name: 'Error', message: 'fail' },
//   { type: 'location', entry: 'main', location: '/app.ts', line: 42, column: 11 },
// ]

// Filter and reassemble
const filtered = blocks.filter(
  (block) =>
    block.type !== 'location' || !block.location.includes('node_modules'),
);
const cleanStack = assembleStack(filtered);
```

### Syntax Highlighting

```ts
import chalk from 'chalk';
import { highlight } from 'sherlog';

const highlighted = highlight('const x: number = 42;', {
  string: chalk.green,
  punctuator: chalk.grey,
  keyword: chalk.cyan,
  number: chalk.magenta,
  regex: chalk.magenta,
  comment: chalk.grey.bold,
  invalid: chalk.inverse,
});

console.log(highlighted);
```

### Express/Koa Middleware

```ts
import { renderError } from 'sherlog';

// Express error middleware
app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(
    await renderError(err, {
      showSource: process.env.NODE_ENV === 'development',
      showStack: true,
    }),
  );

  res.status(500).json({ error: err.message });
});

// Koa error middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(await renderError(err as Error, { showSource: true }));
    ctx.status = 500;
    ctx.body = { error: (err as Error).message };
  }
});
```

---

## 🔧 API Reference

### Function: `renderError()`

Render an error in a human-readable format with colorized output, source code display, and structured metadata:

```ts
function renderError(error: Error, options?: RenderOptions): Promise<string>;
```

```ts
interface RenderOptions {
  /** indent spacing for each line */
  indent?: number;
  /** indicate whether a source frame should be shown */
  showSource?: boolean;
  /** indicate whether the full stack should be shown */
  showStack?: boolean;
  /** a filter function determining whether a stack should be shown given the file path */
  filter?: (path: string) => boolean;
}
```

#### Options

| Option       | Type                        | Default                                     | Description                              |
| ------------ | --------------------------- | ------------------------------------------- | ---------------------------------------- |
| `indent`     | `number`                    | `0`                                         | Indent spacing for each line             |
| `showSource` | `boolean`                   | `false`                                     | Display source code context at top frame |
| `showStack`  | `boolean`                   | `true`                                      | Show stack trace locations               |
| `filter`     | `(path: string) => boolean` | Excludes `node:internal` and `node_modules` | Filter which stack frames to display     |

### Function: `renderLocation()`

Render a single stack location block with optional source code display:

```ts
function renderLocation(
  block: StackLocationBlock,
  options: { indent: number; showSource: boolean },
): Promise<string>;
```

| Parameter            | Type                 | Description                              |
| -------------------- | -------------------- | ---------------------------------------- |
| `block`              | `StackLocationBlock` | A parsed stack location block            |
| `options.indent`     | `number`             | Indent level for each line               |
| `options.showSource` | `boolean`            | Whether to display the source code frame |

### Function: `createSourceResolver()`

Create a resolver function that maps transpiled source locations back to original sources using inline source maps:

```ts
function createSourceResolver(identifier: string): Promise<SourceResolver>;
```

```ts
type SourceResolver = (params: {
  line: number;
  column: number;
}) => SourceResolution;

interface SourceResolution {
  /** name or path of the original source */
  identifier: string;
  /** content of the original source */
  source?: string;
  /** line number of the original source */
  line: number;
  /** column number of the original source */
  column: number;
}
```

| Property     | Type                  | Description                          |
| ------------ | --------------------- | ------------------------------------ |
| `identifier` | `string`              | Path or URL of the resolved source   |
| `source`     | `string \| undefined` | Full content of the resolved source  |
| `line`       | `number`              | Line number in the original source   |
| `column`     | `number`              | Column number in the original source |

### Functions: `disassembleStack()` / `assembleStack()`

Parse and reassemble stack traces as structured blocks:

```ts
function disassembleStack(stack: string): StackBlock[];
function assembleStack(blocks: StackBlock[]): string;
```

```ts
type StackBlock = StackDescriptionBlock | StackLocationBlock;

interface StackDescriptionBlock {
  type: 'description';
  name: string;
  message: string;
}

interface StackLocationBlock {
  type: 'location';
  entry: string;
  location: string;
  line: number;
  column: number;
}
```

| Property   | Type     | Description                             |
| ---------- | -------- | --------------------------------------- |
| `type`     | `string` | `'description'` or `'location'`         |
| `name`     | `string` | Error name (description blocks only)    |
| `message`  | `string` | Error message (description blocks only) |
| `entry`    | `string` | Function name at this stack frame       |
| `location` | `string` | File path or URL                        |
| `line`     | `number` | Line number                             |
| `column`   | `number` | Column number                           |

### Function: `highlight()`

Syntax-highlight JavaScript/TypeScript source code for terminal output:

```ts
function highlight(source: string, theme: HighlightTheme): string;
```

```ts
type HighlightTheme = Record<
  | 'string'
  | 'punctuator'
  | 'keyword'
  | 'number'
  | 'regex'
  | 'comment'
  | 'invalid',
  ChalkInstance
>;
```

| Theme Key    | Applies To                          |
| ------------ | ----------------------------------- |
| `string`     | String literals, template strings   |
| `punctuator` | Operators, brackets, semicolons     |
| `keyword`    | JS/TS keywords and literals         |
| `number`     | Numeric literals                    |
| `regex`      | Regular expression literals         |
| `comment`    | Single-line and multi-line comments |
| `invalid`    | Invalid tokens                      |

---

## 🌐 Compatibility & Size

| Requirement       | Value                                                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Node.js**       | >= 22                                                                                                                                                                                                                                                                                                  |
| **TypeScript**    | 5.x+                                                                                                                                                                                                                                                                                                   |
| **Module format** | ESM only                                                                                                                                                                                                                                                                                               |
| **Browsers**      | Modern browsers                                                                                                                                                                                                                                                                                        |
| **Dependencies**  | [`chalk`](https://github.com/chalk/chalk), [`js-tokens`](https://github.com/nicolo-ribaudo/js-tokens), [`yaml`](https://github.com/eemeli/yaml), [`@jridgewell/trace-mapping`](https://github.com/nicolo-ribaudo/trace-mapping), [`xception`](https://github.com/alvis/xception)                          |
| **Peer deps**     | [`xception`](https://github.com/alvis/xception) >= 9.0.0                                                                                                                                                                                                                                               |

**Browser vs Node.js differences:** In browser environments, local file reading is unavailable — `createSourceResolver` can only resolve web URLs and inline source maps. Node.js environments support both local file reading and web URL resolution.

---

## ⚔️ Alternatives

| Feature                   | sherlog | [Youch](https://www.npmjs.com/package/youch) | [pretty-error](https://www.npmjs.com/package/pretty-error) | [Stacktracey](https://www.npmjs.com/package/stacktracey) | [clean-stack](https://www.npmjs.com/package/clean-stack) |
| ------------------------- | ------- | -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| **Source code display**   | ✅      | ❌                                           | ❌                                                         | ✅                                                       | ❌                                                       |
| **Source map resolution** | ✅      | ❌                                           | ❌                                                         | ✅                                                       | ❌                                                       |
| **Syntax highlighting**   | ✅      | Partial                                      | ❌                                                         | ❌                                                       | ❌                                                       |
| **Metadata rendering**    | ✅      | ❌                                           | ❌                                                         | ❌                                                       | ❌                                                       |
| **Cause chain display**   | ✅      | Partial                                      | ❌                                                         | ❌                                                       | ❌                                                       |
| **Browser support**       | ✅      | ✅                                           | ❌                                                         | ✅                                                       | ✅                                                       |
| **TypeScript-first**      | ✅      | Partial                                      | ❌                                                         | Partial                                                  | ✅                                                       |
| **HTML output**           | ❌      | ✅                                           | ❌                                                         | ❌                                                       | ❌                                                       |

**When to choose what:**

- **sherlog** — When you need source-mapped, syntax-highlighted error rendering with full xception metadata support
- **Youch** — When you need HTML error pages for web frameworks with browser-based rendering
- **pretty-error** — When you only need basic prettier console output without source code or metadata
- **clean-stack** — When you only need to clean up stack traces without any rendering

---

## 🔌 Ecosystem

sherlog is the rendering companion to xception. Error handling and error rendering were intentionally separated to keep both packages focused and lightweight.

| Package                                           | Description                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [**xception**](https://github.com/alvis/xception) | Context-aware error handling — metadata, chaining, serialization                                      |
| [**sherlog**](https://github.com/alvis/sherlog)   | Beautiful error rendering — colorized stack traces, source code display, YAML metadata (this package) |

sherlog reads xception internals via exported symbols (`$namespace`, `$tags`, `$cause`, `$meta`) — no subclassing required. It also works with plain `Error` objects, rendering whatever context is available.

---

## 🏗️ Advanced Features

### Custom Stack Filtering

Control exactly which frames appear in the rendered output:

```ts
const output = await renderError(error, {
  showStack: true,
  // Show only your application code
  filter: (path) => path.includes('/src/') && !path.includes('node_modules'),
});
```

### Remote Source Resolution

Resolve source maps from web-hosted scripts:

```ts
import { createSourceResolver } from 'sherlog';

// Works with HTTP/HTTPS URLs
const resolve = await createSourceResolver(
  'https://cdn.example.com/app.bundle.js',
);

const original = resolve({ line: 1, column: 2345 });
// Maps back to original TypeScript source via inline source map
```

### Custom Syntax Theme

Define your own color scheme for syntax highlighting:

```ts
import chalk from 'chalk';
import { highlight } from 'sherlog';

const customTheme = {
  string: chalk.hex('#ce9178'),
  punctuator: chalk.hex('#d4d4d4'),
  keyword: chalk.hex('#569cd6'),
  number: chalk.hex('#b5cea8'),
  regex: chalk.hex('#d16969'),
  comment: chalk.hex('#6a9955'),
  invalid: chalk.bgRed.white,
};

const highlighted = highlight(sourceCode, customTheme);
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

1. **Fork & Clone**: `git clone https://github.com/alvis/sherlog.git`
2. **Install**: `pnpm install`
3. **Develop**: `pnpm test:watch` for development mode
4. **Test**: `pnpm test && pnpm lint`
5. **Submit**: Create a pull request

**Code Style:**

- [Conventional Commits](https://conventionalcommits.org/)
- ESLint + Prettier enforced
- 100% test coverage required

---

## 🛡️ Security

Found a vulnerability? Please email [alvis@hilbert.space](mailto:alvis@hilbert.space) with details.
We aim to respond within 48 hours and patch as quickly as possible.

---

## 🛠️ Troubleshooting

| Issue                                | Solution                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Source code not displayed**        | Ensure `showSource: true` is set — it defaults to `false`                                                  |
| **Source maps not resolving**        | Only inline source maps (`//# sourceMappingURL=data:...`) are supported — external `.map` files are not    |
| **Cannot import (CJS)**              | sherlog is ESM-only; use dynamic `import()` in CommonJS or migrate to ESM                                  |
| **TypeScript errors**                | Ensure TypeScript 5.x+ and `"moduleResolution": "bundler"` or `"node16"` in tsconfig                       |
| **Browser: local files return null** | `createSourceResolver` cannot read local files in browsers — only web URLs and inline source maps work     |
| **Stack frames missing**             | The default `filter` excludes `node:internal` and `node_modules` — provide a custom filter to include them |

### ❓ FAQ

**Does sherlog work with an error that is not an xception instance?**
Yes. sherlog works with any `Error` object. When used with xception, it additionally renders namespace, tags, and metadata.

**Can I use sherlog in the browser?**
Yes — it works in modern browsers via the browser-specific content module. Local file reading is unavailable; only web URLs and inline source maps are supported.

**Why is `renderError` async?**
Source map resolution requires reading files (or fetching URLs) to locate inline source maps, which is inherently asynchronous.

**Can I render only a single stack frame?**
Yes — use `renderLocation()` directly with a `StackLocationBlock` from `disassembleStack()`.

More help: [GitHub Issues](https://github.com/alvis/sherlog/issues) · [Discussions](https://github.com/alvis/sherlog/discussions)

---

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and migration guides.

---

## 📄 License

**MIT** © 2020-2026 [Alvis HT Tang](https://github.com/alvis)

Free for personal and commercial use. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[⭐ Star on GitHub](https://github.com/alvis/sherlog)** · **[📦 View on npm](https://www.npmjs.com/package/sherlog)** · **[📖 Documentation](https://github.com/alvis/sherlog#readme)**

_Built for developers who believe every error deserves to be understood._

</div>
