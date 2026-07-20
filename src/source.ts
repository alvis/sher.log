import {
  TraceMap,
  originalPositionFor,
  sourceContentFor,
} from '@jridgewell/trace-mapping';

import { decodeBase64, fetchWebContent, readLocalContent } from '#content';

import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

export interface SourceResolution {
  /** name of path of the original source */
  identifier: string;
  /** content of the original source */
  source?: string;
  /** line number of the original source */
  line: number;
  /** column number of the original source */
  column: number;
}

export type SourceResolver = (params: {
  line: number;
  column: number;
}) => SourceResolution;

// regular expression to match inline source maps
const sourceMapRegex =
  /\/\/# sourceMappingURL=data:application\/json;.*base64,(.+)$/m;

/**
 * creates a resolver function to map source details for a given identifier
 * @param identifier the source identifier (URL or file path)
 * @returns a function to retrieve mapped source details or the original source details if mapping fails
 */
export async function createSourceResolver(
  identifier: string,
): Promise<SourceResolver> {
  const source = /^https?:\/\/.*/.exec(identifier)
    ? await fetchWebContent(identifier) // load from web if URL is HTTP/HTTPS
    : await readLocalContent(identifier); // load from local file otherwise

  if (!source) {
    return ({ line, column }) => ({ identifier, line, column });
  }

  const matches = sourceMapRegex.exec(source);

  const fallback: SourceResolver = ({ line, column }) => {
    return { identifier, source, line, column };
  };

  if (!matches) {
    return fallback;
  }

  return createSourceResolverWithSource(identifier, source);
}

/**
 * create a source resolver based on a source with an inline source map
 * @param identifier the identifier of the source content
 * @param source the source content potentially containing an inline source map
 * @returns a function to resolve the original source details
 */
export function createSourceResolverWithSource(
  identifier: string,
  source: string,
): SourceResolver {
  const matches = sourceMapRegex.exec(source);

  const fallback: SourceResolver = ({ line, column }) => {
    return { identifier, source, line, column };
  };

  if (!matches) {
    return fallback;
  }

  return ({ line, column }): SourceResolution => {
    const sourceMapBase64 = matches[1]!;
    const rawSourceMap = JSON.parse(
      decodeBase64(sourceMapBase64),
    ) as EncodedSourceMap; // decode and parse the source map

    // use TraceMap to map to the original source
    const tracer = new TraceMap(rawSourceMap);

    const original = originalPositionFor(tracer, { line, column });

    if (original.source === null) {
      return fallback({ line, column });
    }

    const content = sourceContentFor(tracer, original.source);

    if (content === null) {
      return fallback({ line, column });
    }

    return {
      identifier: original.source,
      source: content,
      line: original.line,
      column: original.column,
    };
  };
}
