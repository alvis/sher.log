export type Levels = 'debug' | 'warn' | 'info' | 'verbose' | 'debug' | string;
// export type Logger = 'stdout' | 'human' | 'json' | 'stackdriver';

export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

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
  channels?: ('console' | 'log' | 'stdout' | 'human' | 'json')[];
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
