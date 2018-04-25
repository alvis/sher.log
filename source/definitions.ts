export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }; // todo: replace with the latest syntax

export type Levels = 'debug' | 'warn' | 'info' | 'verbose' | 'debug' | string;
// export type Logger = 'stdout' | 'human' | 'json' | 'stackdriver';

/**
 * The actual output channels
 * std = the standard output includeing stdout and stderr
 * human = a human friendly log file
 * json = a machine friendly log file (including stackdriver)
 */
export type OutputChannel = 'stdout' | 'human' | 'json';

/**
 * A functional channel is a shortcut option for output in different scenarios
 * console = output in a non-container environment
 * container = output in a container environment
 * log = output all logging options available (human/json/stackdriver)
 */
export type FunctionalChannel = 'console' | 'container' | 'log';

export type Channel = OutputChannel | FunctionalChannel;

export interface FormatterOptions {
  level: string;
  message?: string;
  meta?: object;
  timestamp(): string;
}

export interface MessageOptions {
  loggingMessage?: string;
  data?: object;
  meta?: object;
  channels?: Channel[];
}

export interface SherOptions {
  captureUnhandledException: boolean;
  exitOnError: boolean;
  emitErrors: boolean;
  level: Levels;
  // customLevels: string[]; // disabled due to the structure of DeepPartial
  stdout: {
    level?: Levels;
    output?: boolean;
  };
  humanLog: {
    level?: Levels;
    path: string;
  };
  jsonLog: {
    level?: Levels;
    path: string;
  };
  stackdriver: {
    level?: Levels;
    keyFile: string;
    projectID: string;
  };
  monitor: {
    display: boolean;
    logging: {
      maxInterval: number;
      maxChange: number;
    };
  };
}
