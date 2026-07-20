# Contributing to sherlog

> Thanks for taking the time to contribute! sherlog is the rendering companion to
> [**xception**](https://github.com/alvis/xception); if your change touches error
> handling rather than error rendering, it may belong there instead.

- [The Essential](#the-essential)
- [Project Structure](#project-structure)
- [Development](#development)
- [Pull Request Submission](#pull-request-submission)
- [Useful Commands](#useful-commands)

## The Essential

sherlog relies on TypeScript and a handful of tools for building and testing,
so make sure the toolchain is installed before making any change:

1. Clone this repo — `git clone https://github.com/alvis/sherlog.git`
2. Install dependencies — `pnpm install`

> **NOTE**: sherlog uses [pnpm](https://pnpm.io) (see the `packageManager` field
> in `package.json`) and targets Node.js >= 22.

## Testing sherlog in other projects

To try local changes in another project before committing:

1. Run `pnpm link --global` under the sherlog folder
2. Run `pnpm link --global sherlog` in your project
3. Make changes and run `pnpm run build` to transpile the TypeScript into JavaScript

## Project Structure

- `src` — the library source; each module owns one concern
  (`render`, `source`, `stack`, `highlight`, and the `content` browser/node adapters)
- `spec` — tests, mirroring the `src` structure so each source file has a matching
  `*.spec.ts`

sherlog works hand in hand with [xception](https://github.com/alvis/xception): it
reads xception internals via exported symbols (`$namespace`, `$tags`, `$cause`,
`$meta`) without subclassing. When changing rendering behaviour, keep it working
for plain `Error` objects as well as xception instances.

## Development

We write code in a [test-driven development (TDD)](https://en.wikipedia.org/wiki/Test-driven_development)
approach. All tests live under the `spec` folder with the same structure as `src`,
so tests are easy to locate. In general, each source file has its own test file.

### Code Standard

This project follows the standard exported from
[`presetter`](https://github.com/alvis/presetter), which builds on the recommended
rules from:

- [ESLint](https://eslint.org)
- [TypeScript ESLint](https://typescript-eslint.io)
- [Prettier](https://prettier.io)

100% test coverage is required.

### Commit

To let us release with semantic versioning, we adopt the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard.

A commit message is structured as:

```
<type>: <subject>
<BLANK LINE>
<body>
```

Example:

```
feat: new awesome feature

BREAKING CHANGE: something will change the behaviour
```

List of types:

- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing or correcting existing tests
- chore: Changes to the build process or auxiliary tools

## Pull Request Submission

This project follows [GitHub's standard forking model](https://guides.github.com/activities/forking/).
Please fork the project to submit pull requests.

PRs must be mergeable, rebased against the latest `main`. Make sure that:

- commit messages are worded clearly and follow the conventional commit standard
- the reason for the PR is stated by linking an issue or fully describing what it achieves
- a test ships with any PR whenever possible
- 100% coverage is maintained

## Useful Commands

The following commands are handy during development.

### Run all tests

```shell
pnpm test
```

### Run tests in watch mode

```shell
pnpm test:watch
```

### Coverage

Run the coverage script and make sure coverage is 100% before committing, then open
`coverage/lcov-report/index.html` in your browser.

```shell
pnpm test:coverage
```

### Building

```shell
pnpm run build
```

### Linting

```shell
pnpm run lint
```

### Release

Releases follow semantic versioning and are triggered by:

```shell
pnpm run release
```

> **NOTE**: On release, a version tag is issued and the changelog is updated. When
> the tag is pushed to origin, CI publishes the package to npm automatically.
