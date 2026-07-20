import chalk from 'chalk';
import { jsonify, $cause, $meta, $namespace, $tags } from 'xception';
import { stringify } from 'yaml';

import { highlight } from '#highlight';
import { createSourceResolver } from '#source';
import { disassembleStack } from '#stack';

import type { ChalkInstance } from 'chalk';
import type { ErrorLike } from 'xception';

import type { HighlightTheme } from '#highlight';
import type { SourceResolver } from '#source';
import type { StackLocationBlock } from '#stack';
import type { JsonObject } from '#types';

/** options for rendering an error */
export interface RenderOptions {
  /** indent spacing for each line */
  indent?: number;
  /** indicate whether a source frame should be shown */
  showSource?: boolean;
  /** indicate whether the full stack should be shown */
  showStack?: boolean;
  /** a filter function determining whether a stack should be shown given the file path */
  filter?: (path: string) => boolean;
}

const INDENT = 2;
const PADDING = 4;

/** default number of lines from the targeted source line to be displayed */
const SPREAD = 4;

const CODE_THEME: HighlightTheme = {
  string: chalk.green,
  punctuator: chalk.grey,
  keyword: chalk.cyan,
  number: chalk.magenta,
  regex: chalk.magenta,
  comment: chalk.grey.bold,
  invalid: chalk.inverse,
};

const YAML_THEME = {
  base: chalk.white,
  error: chalk.red,
  symbol: chalk.magenta,
  string: chalk.green,
  date: chalk.cyan,
  number: chalk.magenta,
  boolean: chalk.yellow,
  null: chalk.yellow.bold,
  undefined: chalk.yellow.bold,
};

const EXCESSIVE_NEWLINE = /(\n\s*){2,}\n/g;

/**
 * render an error in a human readable format
 * @param error the error to be rendered
 * @param options optional parameters
 * @returns a string representation of the error
 */
export async function renderError(
  error: Error,
  options?: RenderOptions,
): Promise<string> {
  const {
    indent = 0,
    showSource = false,
    showStack = true,
    filter = (path: string) =>
      !path.includes('node:internal') && !path.includes('node_modules'),
  } = { ...options };

  const stack = getUniqueStack(error);

  const locations = disassembleStack(stack).filter(
    (block): block is StackLocationBlock =>
      showStack && block.type === 'location' && filter(block.location),
  );

  // cache resolvers by location so a file shared by multiple frames is read once
  const cache = new Map<string, Promise<SourceResolver>>();

  const renderedBlocks: string[] = [
    renderDescription(error, { indent }),
    ...(await Promise.all(
      locations.map(async (block, index) =>
        renderLocation(block, {
          indent,
          showSource: showSource && index === 0,
          cache,
        }),
      ),
    )),
  ];

  if (error[$cause] instanceof Error) {
    renderedBlocks.push(
      chalk.grey(
        `${' '.repeat(indent + PADDING)}... further lines matching cause stack trace below ...\n`,
      ),
      await renderError(error[$cause], { ...options, indent: indent + INDENT }),
    );
  }

  // join all rendered blocks and remove excessive new lines
  return renderedBlocks.join('\n').replace(EXCESSIVE_NEWLINE, '\n\n').trim();
}

/**
 * resolve a source location, reusing a cached resolver when the same file is
 * referenced by more than one stack frame
 * @param location the source identifier (file path or URL)
 * @param cache an optional shared cache keyed by location
 * @returns a resolver for the given location
 */
async function resolveSource(
  location: string,
  cache: Map<string, Promise<SourceResolver>>,
): Promise<SourceResolver> {
  const pending = cache.get(location) ?? createSourceResolver(location);
  cache.set(location, pending);

  return pending;
}

/**
 * get the metadata of an error
 * @param error the error to be processed
 * @returns the metadata
 */
function getErrorMeta(error: ErrorLike): JsonObject {
  const meta = error[$meta] as JsonObject | undefined;

  if (meta) {
    return meta;
  } else {
    const {
      name: _name,
      message: _message,
      stack: _stack,
      ...properties
    } = jsonify(error) as JsonObject;

    return properties;
  }
}

/**
 * get the unique stack of an error
 * @param error the error to be processed
 * @returns the stack trace with lines shared by its cause's stack removed
 */
function getUniqueStack(error: Error): string {
  const cause = error[$cause] as unknown;

  if (cause instanceof Error) {
    const errorStack = error.stack!.split('\n');
    const causeStack = cause.stack!.split('\n');

    const commonStackStartAt = errorStack.findIndex((line) =>
      causeStack.includes(line),
    );

    // keep the full stack when no frame is shared with the cause
    return commonStackStartAt === -1
      ? error.stack!
      : errorStack.slice(0, commonStackStartAt).join('\n');
  } else {
    return error.stack!;
  }
}

/**
 * render associations of an error
 * @param error the related error
 * @param options optional parameters
 * @param options.indent indent level for each line
 * @returns a rendered string to print
 */
function renderAssociations(
  error: ErrorLike,
  options: { indent: number },
): string | null {
  const { indent } = options;

  const namespace = error[$namespace] as string | undefined;
  const tags = error[$tags] as string[] | undefined;

  const blocks = [
    ...(typeof namespace === 'string'
      ? [' '.repeat(indent) + chalk.blue.underline(namespace)]
      : []),
    ...(Array.isArray(tags)
      ? tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => ' '.repeat(indent) + chalk.cyan.bold(tag))
      : []),
  ];

  return blocks.length
    ? `\n${' '.repeat(indent + PADDING)}` + blocks.join(' ')
    : null;
}

/**
 * render a description line
 * @param error error the related error
 * @param options optional parameters
 * @param options.indent indent level for each line
 * @returns a rendered string to print
 */
function renderDescription(
  error: ErrorLike,
  options: { indent: number },
): string {
  const { indent } = options;

  const description =
    ' '.repeat(indent) +
    chalk.red(`[${chalk.bold(error.name)}] ${error.message}`);

  const association = renderAssociations(error, options);
  const meta = renderMeta(getErrorMeta(error), {
    indent,
    prefix: `\n${' '.repeat(indent + PADDING)}${chalk.white.underline('METADATA')}\n`,
    postfix: '\n',
  });
  const cause =
    error[$cause] && !(error[$cause] instanceof Error)
      ? renderMeta(jsonify(error[$cause]), {
          indent,
          prefix: `\n${' '.repeat(indent + PADDING)}${chalk.white.underline('CAUSE')}\n`,
          postfix: '\n',
        })
      : null;

  return [description, association, meta, cause]
    .filter((block) => !!block)
    .join('\n');
}

/**
 * render a location line
 * @param block a stack block about a location
 * @param options optional parameters
 * @param options.indent indent level for each line
 * @param options.showSource indicate whether a source frame should be shown
 * @param options.cache shared resolver cache to avoid re-reading a file referenced by many frames
 * @returns a rendered string to print
 */
export async function renderLocation(
  block: StackLocationBlock,
  options: {
    indent: number;
    showSource: boolean;
    /** shared resolver cache to avoid re-reading a file referenced by many frames */
    cache?: Map<string, Promise<SourceResolver>>;
  },
): Promise<string> {
  const { entry, location } = block;
  const {
    indent,
    showSource,
    cache = new Map<string, Promise<SourceResolver>>(),
  } = options;

  // get original source, line and column if a source map is embedded in the compiled source
  // fallback to the compiled source detail if no source map is found
  const resolve = await resolveSource(location, cache);
  const { identifier, source, line, column } = resolve(block);

  const sourceFrame =
    showSource && source
      ? await renderSource({ source, line }, { indent })
      : null;

  return (
    `${' '.repeat(indent + PADDING)}at ${chalk.grey.bold(entry)} (${chalk.grey.underline(
      `${identifier}:${line}:${column}`,
    )})` + (sourceFrame ? '\n' + sourceFrame : '')
  );
}

/**
 * render metadata in an error
 * @param properties additional properties of an error
 * @param options optional parameters
 * @param options.indent indent level for each line
 * @param options.prefix the prefix to be added before the rendered string
 * @param options.postfix the postfix to be added after the rendered string
 * @returns a rendered string to print
 */
function renderMeta(
  properties: unknown,
  options: { indent: number; prefix: string; postfix: string },
): string | null {
  const { indent, prefix, postfix } = options;

  if (properties instanceof Object && Object.keys(properties).length) {
    const representation =
      ' '.repeat(indent + PADDING) +
      stringify(properties, {
        blockQuote: false,
      })
        .split('\n')
        .join('\n' + ' '.repeat(indent + PADDING));

    return `${prefix}${representation}${postfix}`;
  } else if (
    typeof properties === 'boolean' ||
    typeof properties === 'number' ||
    typeof properties === 'string'
  ) {
    const colorize = YAML_THEME[typeof properties] as ChalkInstance;

    return (
      prefix + ' '.repeat(indent + PADDING) + colorize(properties.toString())
    );
  }

  return null;
}

/**
 * render a source frame
 * @param params the source and line number
 * @param params.source the source content
 * @param params.line the line number to be highlighted
 * @param options optional parameters
 * @param options.indent indent level for each line
 * @returns a rendered string to print
 */
async function renderSource(
  params: { source: string; line: number },
  options: {
    indent: number;
  },
): Promise<string | null> {
  const { indent } = options;

  const { source, line } = params;
  const highlighted = highlight(source, CODE_THEME);
  const lines = highlighted.split(/\r?\n/);
  const base = Math.max(line - SPREAD - 1, 0);
  const displayLines = lines.slice(base, line + SPREAD);
  const lineNumberWidth = (line + SPREAD).toString().length;

  const sourceFrame = displayLines
    .map((source, index) => {
      const currentLine = base + index + 1;
      const formattedLine = currentLine.toString().padStart(lineNumberWidth);
      const isTarget = currentLine === line;
      const prefix = isTarget ? '>' : ' ';
      const gutter = ` ${prefix} ${formattedLine} `;

      return `${' '.repeat(indent)}${isTarget ? chalk.bgRed(gutter) : gutter}| ${source}`;
    })
    .join('\n');

  return '\n' + sourceFrame + '\n';
}
