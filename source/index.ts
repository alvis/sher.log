import { LoggingWinston as stackdriver } from '@google-cloud/logging-winston';
import chalk from 'chalk';
import * as eyes from 'eyes';
import * as log from 'log-update';
import * as prettyjson from 'prettyjson-256';
import * as winston from 'winston';

import { Monitor } from './monitor';
import { Progress, ProgressOptions } from './progress';
import { booleanize, isRunningInContainer, shouldPrint } from './utilities';

import * as fs from 'fs';

import {
  Channel,
  DeepPartial,
  FormatterOptions,
  Levels,
  MessageOptions,
  OutputChannel,
  SherOptions
} from './definitions';

export { SherOptions } from './definitions';
export { debug } from './utilities';

export const levels = {
  status: -1,
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};

export interface Status {
  options?: MessageOptions;
  message: string;
}

/** The class for Sher.log */
export class Sher {
  /** Options of the class */
  protected options: SherOptions;

  /** An indicator of whether the process is running in a container image */
  protected isRunningInContainer: boolean;

  /** The placeholder for the current status message so that it can reused after a monitor update */
  private statusMessage?: string;
  /** The time when a status message was logged in the logging channels for avoiding message flood */
  private lastStatusLogged: number;

  /** The monitor instance used for usage report */
  private monitor: Monitor;

  /** A placeholder for all the progress bar instances, with lastUpdata as the time when the progress was last logged */
  private progresses: Map<Progress, { lastUpdate: number }>;
  //todo setup the right format for json and yaml
  /** The formatter for turning a json object into a readable nested structure */
  private jsonFormatter: (meta: object) => string;

  /** The formatter for turning a json object into a yaml */
  private yamlFormatter: (meta: object) => string;

  /** The placeholder for the winston loggers for different output formats */
  private loggers: {
    stdout?: winston.LoggerInstance;
    human?: winston.LoggerInstance;
    json?: winston.LoggerInstance;
  };

  /** The placeholder for the winston transports for different output channels */
  public transports: {
    stdout?: winston.ConsoleTransportInstance;
    human?: winston.FileTransportInstance;
    json?: winston.FileTransportInstance;
    stackdriver?: winston.TransportInstance;
  };

  constructor(options?: DeepPartial<SherOptions>) {
    // initialise variables
    this.isRunningInContainer = isRunningInContainer();
    this.progresses = new Map();

    // take the default configuration from environment variables
    const defaultFromEnvironment = this.generateOptionsFromEnvironment();

    // merge the configuration with those specified in options
    const _options: DeepPartial<SherOptions> = { ...options };
    this.options = {
      captureUnhandledException: true,
      exitOnError: false,
      emitErrors: false,
      level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
      // customLevels: [],
      ...defaultFromEnvironment, // override the default options at the top level
      ..._options,
      ...(_options.level ? { level: _options.level.toLowerCase() } : null),
      stdout: {
        output: true,
        ...defaultFromEnvironment.stdout,
        ..._options.stdout,
        ...(_options.stdout && _options.stdout.level
          ? { level: _options.stdout.level.toLowerCase() }
          : null)
      },
      humanLog: {
        path: '',
        ...defaultFromEnvironment.humanLog,
        ..._options.humanLog,
        ...(_options.humanLog && _options.humanLog.level
          ? { level: _options.humanLog.level.toLowerCase() }
          : null)
      },
      jsonLog: {
        path: '',
        ...defaultFromEnvironment.jsonLog,
        ..._options.jsonLog,
        ...(_options.jsonLog && _options.jsonLog.level
          ? { level: _options.jsonLog.level.toLowerCase() }
          : null)
      },
      stackdriver: {
        keyFile: '',
        projectID: '',
        ...defaultFromEnvironment.stackdriver,
        ..._options.stackdriver,
        ...(_options.stackdriver && _options.stackdriver.level
          ? { level: _options.stackdriver.level.toLowerCase() }
          : null)
      },
      monitor: {
        display: true,
        ...defaultFromEnvironment.monitor,
        ..._options.monitor,
        logging: {
          maxInterval: 300,
          maxChange: 0.1,
          ...(defaultFromEnvironment.monitor &&
          defaultFromEnvironment.monitor.logging
            ? defaultFromEnvironment.monitor.logging
            : null),
          ...(_options.monitor ? _options.monitor.logging : null)
        }
      }
    };

    // set up the loggers
    this.setupLoggers();
  }

  /** This functions remove listeners for unhandle exceptions */
  public unhandleExceptions(): void {
    for (const logger of Object.values(this.loggers)) {
      if (logger) {
        logger.unhandleExceptions();
      }
    }
  }

  /** This function brings up a resource monitoring message in the console. */
  public startMonitor(): void {
    // update the options
    this.options.monitor.display = true;

    this.setupMonitor();
  }

  /** This function disables the resource monitor and release the resource it has consumed. */
  public stopMonitor(): void {
    // clean up
    this.monitor.stop();
    delete this.monitor;

    // update the options
    this.options.monitor.display = false;
  }

  /**
   *
   * This function create a new progress instance and activate the monitor.
   * @param options - The options for the progress instance
   */
  public progress(options?: Partial<ProgressOptions>): Progress {
    const progress = new Progress(options);

    // update status whenever there is a progress
    progress.on('update', (): void => {
      this.status({
        channels: ['console']
      });

      const meta = this.progresses.get(progress);
      if (
        meta &&
        Date.now() - meta.lastUpdate >
          this.options.monitor.logging.maxInterval * 1000
      ) {
        this.log('status', progress.status, { channels: ['log'] });
      }
    });

    progress.on('end', () => {
      // remove everything
      progress.removeAllListeners();
      this.progresses.delete(progress);

      // stop monitor if it is triggered by the progress bar
      if (!this.options.monitor.display) {
        this.monitor.stop();
      }
    });

    // add the instance to the list
    this.progresses.set(progress, { lastUpdate: 0 });

    // create a monitor if it doesn't exist
    this.setupMonitor();

    return progress;
  }

  /**
   * This function controls where does a status message get output.
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public status(message?: string | null, options?: MessageOptions): void;
  public status(options?: MessageOptions): void;
  public status(
    _messageOrOptions?: string | null | MessageOptions,
    _options?: MessageOptions
  ): void {
    /* --- Notes ---
         * A status message can be initialised by the following two methods:
         * 1. sher.status(...)
         * 2. sher.log('status', ...)
         *
         * For a status intended to be printed on the local console via sher.status(...), it take the following steps:
         * 1. compute the output channels
         * 2. filter out any console channel and log the message on other available channels via sher.log(...)
         * 3. check if any console channel is available and use sher.printStatus to print the message on console
         *
         * For a status intended to be printed on the local console via sher.log(...), it take the following steps:
         * 1. compute the output channels
         * 2. filter out non console channel and log the message on other available channels via normal procedures
         * 3. check if any console channel is available and use sher.printStatus to print the message on console
         */

    const message =
      typeof _messageOrOptions === 'object' && _messageOrOptions !== null
        ? undefined
        : _messageOrOptions;
    const options =
      typeof _messageOrOptions === 'object' && _messageOrOptions !== null
        ? _messageOrOptions
        : _options;

    // compute output channels
    // const channels: Channel[] = options && options.channels ? options.channels : (this.options.stdout.output ? ['stdout']: this.getOutputChannels¡());

    if (message !== undefined) {
      this.log('status', message, options);
    }

    // submit the status to the logger
    // const nonStdChannels = channels.filter(channel => !['console', 'stdout'].includes(channel));
    // if (message !== null && message !== undefined && nonStdChannels.length) {
    //   this.log('status', message, {...options, channels: nonStdChannels}
    //   );
    // }
    //
    // // print the status on console
    // if (message !== null && message !== undefined) {
    //   this.printStatus( message,  options);
    // }
    // const consoleChannels = channels.filter(channel => ['console', 'stdout'].includes(channel));
    // if (message !== null && message !== undefined && consoleChannels.length) {
    //   this.printStatus( message,  {...options, channels: consoleChannels});
    // }
  }

  /**
   * This function is the base function of all other logging functions for different logging levels.
   * @param level - The level at which the message is reported
   * @param message - The message to be reported, or null for clearing status
   * @param options - The options for the message
   */
  public log(
    level: string,
    message: string | null,
    options?: MessageOptions
  ): void {
    const _level = this.options.level;

    // force logging everything is reqested
    if (shouldPrint()) {
      this.setLevel('silly');

      // temporarily disable the level settings in each transport
      Object.entries(this.transports).map(([key, value]) => {
        if (value) {
          this.transports[key] = { ...value, level: undefined };
        }
      });
    }

    // determine the outout channels
    const channels = this.getOutputChannels(
      options ? options.channels : undefined
    );

    // determine the messages
    const messages = {
      human:
        options && options.loggingMessage ? options.loggingMessage : message,
      json:
        options && options.loggingMessage ? options.loggingMessage : message,
      stdout:
        this.isRunningInContainer && options && options.loggingMessage
          ? options.loggingMessage
          : message
    };

    // clear status on the local console before any other message
    if (!this.isRunningInContainer && this.loggers.stdout && channels.stdout) {
      log.clear();
    }
    fs.writeFileSync('/tmp/options', JSON.stringify(options));
    fs.writeFileSync('/tmp/channels', JSON.stringify(channels));
    // send the message to the outlets
    if (
      messages.stdout &&
      this.loggers.stdout &&
      channels.stdout &&
      // stdout is allowed in level status only if the process is run in a container image
      // in a console environment, status is printed by the printStatus method in the end of this method

      (level !== 'status' || (level === 'status' && this.isRunningInContainer))
    ) {
      this.loggers.stdout.log(
        level,
        messages.stdout,
        options ? options.data : {}
      );
    }

    if (messages.human && this.loggers.human && channels.human) {
      this.loggers.human.log(
        level,
        messages.human,
        options ? options.data : {}
      );
    }

    if (messages.json && this.loggers.json && channels.json) {
      this.loggers.json.log(
        level,
        messages.json,
        options ? { data: { ...options.data }, meta: { ...options.meta } } : {}
      );
    }

    if (level === 'status') {
      this.printStatus(message, options);
    } else {
      // print previous status on to the local console again if it is set

      this.printStatus();
    }

    // restore the transports to the original state
    if (shouldPrint()) {
      // restore to the original level
      this.setLevel(_level);

      Object.entries(this.transports).map(([key, value]) => {
        if (value) {
          let originalLevel: string | undefined;
          switch (key) {
            case 'stdout':
              originalLevel = this.options.stdout.level;
              break;
            case 'human':
              originalLevel = this.options.humanLog.level;
              break;
            case 'json':
              originalLevel = this.options.jsonLog.level;
              break;
            case 'stackdriver':
              originalLevel = this.options.stackdriver.level;
              break;
            default:
              originalLevel = undefined;
          }
          this.transports[key] = { ...value, originalLevel };
        }
      });
    }
  }

  /**
   * This function change the logging level
   * @param level - The desired logging level
   */
  public setLevel(level: Levels): void {
    this.options.level = level;
    for (const key of Object.keys(this.loggers)) {
      if (this.loggers[key]) {
        this.loggers[key].level = level;
      }
    }
  }

  /**
   * This function logs a message at level debug
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public debug(message: string, options?: MessageOptions): void {
    this.log('debug', message, options);
  }

  /**
   * This function logs a message at level error
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public error(message: string, options?: MessageOptions): void {
    this.log('error', message, options);
  }

  /**
   * This function logs a message at level info
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public info(message: string, options?: MessageOptions): void {
    this.log('info', message, options);
  }

  /**
   * This function logs a message at level warn
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public warn(message: string, options?: MessageOptions): void {
    this.log('warn', message, options);
  }

  /**
   * This function logs a message at level verbose
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  public verbose(message: string, options?: MessageOptions): void {
    this.log('verbose', message, options);
  }

  private getOutputChannels(
    channels?: Channel[]
  ): Record<OutputChannel, boolean> {
    if (channels !== undefined && channels.length === 0) {
      // do not output anything if empty channel is supplied
      return {
        human: false,
        json: false,
        stdout: false
      };
    } else {
      // normal output
      return {
        human: channels
          ? channels.includes('human') || channels.includes('log')
          : this.options.humanLog.path !== '',
        json: channels
          ? channels.includes('json') || channels.includes('log')
          : this.options.jsonLog.path !== '' ||
            (this.options.stackdriver.keyFile !== '' &&
              this.options.stackdriver.projectID !== ''),
        stdout: channels
          ? channels.includes('stdout') ||
            (this.isRunningInContainer
              ? channels.includes('container') || channels.includes('log')
              : channels.includes('console'))
          : this.options.stdout.output === true
      };
    }
  }

  /**
   * This function prints real-time message on the console.
   * @param message - The message to be reported
   * @param options - The options for the message
   */
  private printStatus(message?: string | null, options?: MessageOptions): void {
    const messageStack: string[] = [];

    // determine whether extra message should be printed on a local console
    const shouldPrintLocally =
      !this.isRunningInContainer &&
      this.options.stdout.output &&
      (!options ||
        (options &&
          options.channels &&
          options.channels.filter(channel =>
            ['console', 'stdout'].includes(channel)
          ).length > 0));

    // include monitor and progress only the target channel is the local console
    if (shouldPrintLocally && this.monitor) {
      // content from monitor
      if (this.options.monitor.display) {
        messageStack.push(this.monitor.consoleMessage);
      }

      // content from progress bars
      const progresses = Array.from(this.progresses.keys());
      const maxNameLength = Math.max(
        ...progresses.map(progress => progress.name.length)
      );
      progresses.forEach(progress =>
        messageStack.push(
          progress.consoleMessage({
            nameLength: maxNameLength,
            barLength: 50
          })
        )
      );
    }

    // use the message only if message is supplied
    if (message !== null) {
      if (shouldPrintLocally) {
        // store the status message for later use
        if (message !== undefined) {
          this.statusMessage = message;

          // attach data to the message
          if (options && options.data) {
            this.statusMessage += `\n${this.yamlFormatter(options.data)}`;
          }
        }

        if (this.statusMessage) {
          messageStack.push(this.statusMessage);
        }

        // clear status on the local console
        log.clear();

        if (messageStack.length) {
          // print on the local console
          const localMessage = messageStack.join('\n');

          log('\n' + chalk.red(localMessage));
        }
      }
    } else {
      // clear status on the local console
      log.clear();
      delete this.statusMessage;
    }
  }

  /** This function generate a SherOptions based on input from environment variables */
  private generateOptionsFromEnvironment(): DeepPartial<SherOptions> {
    const options: DeepPartial<SherOptions> = {
      ...(process.env.SHERLOG_CAPTURE_UNHANDLED_EXCEPTION
        ? {
            captureUnhandledException: booleanize(
              process.env.SHERLOG_CAPTURE_UNHANDLED_EXCEPTION
            )
          }
        : null),
      ...(process.env.SHERLOG_EXIT_ON_ERROR
        ? {
            exitOnError: booleanize(process.env.SHERLOG_EXIT_ON_ERROR)
          }
        : null),
      ...(process.env.SHERLOG_EMIT_ERRORS
        ? {
            emitErrors: booleanize(process.env.SHERLOG_EMIT_ERRORS)
          }
        : null),
      ...(process.env.SHERLOG_LEVEL
        ? { level: (process.env.SHERLOG_LEVEL as string).toLowerCase() }
        : null),
      stdout: {
        ...(process.env.SHERLOG_STDOUT
          ? {
              output: booleanize(process.env.SHERLOG_STDOUT)
            }
          : null),
        ...(process.env.SHERLOG_STDOUT_LEVEL
          ? {
              level: (process.env.SHERLOG_STDOUT_LEVEL as string).toLowerCase()
            }
          : null)
      },
      ...(process.env.SHERLOG_HUMAN_LOG_PATH
        ? {
            humanLog: {
              path: process.env.SHERLOG_HUMAN_LOG_PATH as string,
              ...(process.env.SHERLOG_HUMAN_LOG_LEVEL
                ? {
                    level: (process.env
                      .SHERLOG_HUMAN_LOG_LEVEL as string).toLowerCase()
                  }
                : null)
            }
          }
        : null),
      ...(process.env.SHERLOG_JSON_LOG_PATH
        ? {
            jsonLog: {
              path: process.env.SHERLOG_JSON_LOG_PATH as string,
              ...(process.env.SHERLOG_JSON_LOG_LEVEL
                ? {
                    level: (process.env
                      .SHERLOG_JSON_LOG_LEVEL as string).toLowerCase()
                  }
                : null)
            }
          }
        : null),
      ...(process.env.SHERLOG_STACKDRIVER_KEY_FILE &&
      process.env.SHERLOG_STACKDRIVER_PROJECT_ID
        ? {
            stackdriver: {
              keyFile: process.env.SHERLOG_STACKDRIVER_KEY_FILE as string,
              projectID: process.env.SHERLOG_STACKDRIVER_PROJECT_ID as string,
              ...(process.env.SHERLOG_STACKDRIVER_LOG_LEVEL
                ? {
                    level: (process.env
                      .SHERLOG_STACKDRIVER_LOG_LEVEL as string).toLowerCase()
                  }
                : null)
            }
          }
        : null),
      ...(process.env.SHERLOG_MONITOR_DISPLAY ||
      process.env.SHERLOG_MONITOR_LOGGING_MAX_INTERVAL ||
      process.env.SHERLOG_MONITOR_LOGGING_MAX_CHANGE
        ? {
            monitor: {
              ...(process.env.SHERLOG_MONITOR_DISPLAY
                ? {
                    display: booleanize(process.env.SHERLOG_MONITOR_DISPLAY)
                  }
                : null),
              ...(process.env.SHERLOG_MONITOR_LOGGING_MAX_INTERVAL ||
              process.env.SHERLOG_MONITOR_LOGGING_MAX_CHANGE
                ? {
                    logging: {
                      ...(process.env.SHERLOG_MONITOR_LOGGING_MAX_INTERVAL
                        ? {
                            maxInterval: parseInt(
                              process.env
                                .SHERLOG_MONITOR_LOGGING_MAX_INTERVAL as string,
                              10
                            )
                          }
                        : null),
                      ...(process.env.SHERLOG_MONITOR_LOGGING_MAX_CHANGE
                        ? {
                            maxChange: parseInt(
                              process.env
                                .SHERLOG_MONITOR_LOGGING_MAX_CHANGE as string,
                              10
                            )
                          }
                        : null)
                    }
                  }
                : null)
            }
          }
        : null)
    };

    return options;
  }

  /** This function set up all the transports for winston */
  private setupLoggers(): void {
    // create helper functions for formating JSON objects
    this.jsonFormatter = eyes.inspector({
      maxLength: 16384,
      stream: undefined
    });
    this.yamlFormatter = prettyjson.render;

    // initialise the references
    this.transports = {};
    this.loggers = {};

    const transports: {
      human: winston.TransportInstance[];
      json: winston.TransportInstance[];
      stdout: winston.TransportInstance[];
    } = { human: [], json: [], stdout: [] };

    // set up the logger for stdout
    if (this.options.stdout.output) {
      this.transports.stdout = new winston.transports.Console({
        ...(this.options.stdout.level
          ? { level: this.options.stdout.level }
          : null),

        handleExceptions: this.options.captureUnhandledException,
        humanReadableUnhandledException: this.options.captureUnhandledException,

        formatter: (options: FormatterOptions): string => {
          const timestamp = options.timestamp();

          const message = options.message ? options.message : '';
          const messages = message.split(/[\n\r]+/);

          if (this.isRunningInContainer) {
            const level = `[[ ${options.level.toUpperCase()} ]]`;

            // return in the format as `2010-06-08-12:00:00Z  [[ INFO ]] An impoartant thing happened.`
            const chunks = messages.map(
              chunk => `${timestamp} ${level} ${chunk}`
            );

            return (
              chunks.join(`\n`) +
              (options.meta && Object.keys(options.meta).length
                ? `\n${this.jsonFormatter(options.meta)}`
                : '')
            );
          } else {
            let level = ` ${options.level.toUpperCase()} `;
            switch (options.level) {
              case 'error':
                level = chalk.bgRed.black(level);
                break;
              case 'warn':
                level = chalk.bgYellow.black(level);
                break;
              case 'info':
                level = chalk.bgBlue.black(level);
                break;
              case 'verbose':
                level = chalk.bgGreen.black(level);
                break;
              case 'debug':
                level = chalk.bgMagenta.black(level);
                break;
              default:
            }

            // return in the format as ` VERBOSE  I love you.`
            const chunks = messages.map(
              (chunk, index) =>
                `${index ? ' '.repeat(options.level.length) : level} ${chunk}`
            );
            if (options.meta && Object.keys(options.meta).length) {
              chunks.push(
                ...this.yamlFormatter(options.meta)
                  .split('\n')
                  .map(line => chalk.yellow(line))
              );
            }
            chunks.unshift('');
            const localMessage = chunks.join(`\n`);

            return localMessage;
          }
        },
        timestamp: (): string =>
          this.isRunningInContainer
            ? new Date().toISOString()
            : new Date().toLocaleTimeString()
      });

      transports.stdout.push(this.transports.stdout);
    }

    // set up the logger for human log
    if (this.options.humanLog.path) {
      this.transports.human = new winston.transports.File({
        ...(this.options.humanLog.level
          ? { level: this.options.humanLog.level }
          : null),
        filename: this.options.humanLog.path,

        handleExceptions: this.options.captureUnhandledException,
        humanReadableUnhandledException: this.options.captureUnhandledException
      });

      transports.human.push(this.transports.human);
    }

    // set up the logger for json log
    if (this.options.jsonLog.path) {
      this.transports.json = new winston.transports.File({
        ...(this.options.jsonLog.level
          ? {
              level: this.options.jsonLog.level
            }
          : null),
        filename: this.options.jsonLog.path,

        handleExceptions: this.options.captureUnhandledException,
        humanReadableUnhandledException: this.options.captureUnhandledException
      });

      transports.json.push(this.transports.json);
    }

    // setup the logger for stackdriver
    if (
      this.options.stackdriver.keyFile &&
      this.options.stackdriver.projectID
    ) {
      this.transports.stackdriver = new stackdriver({
        // handleExceptions: this.options.captureUnhandledException,
        // humanReadableUnhandledException: this.options.captureUnhandledException,

        keyFilename: this.options.stackdriver.keyFile,
        projectId: this.options.stackdriver.projectID,

        ...(this.options.stackdriver.level
          ? {
              level: this.options.stackdriver.level
            }
          : null)
      }) as winston.TransportInstance;

      transports.json.push(this.transports.stackdriver);
    }

    // finally setup the real loggers
    for (const channel of ['human', 'json', 'stdout']) {
      this.loggers[channel] = new winston.Logger({
        level: this.options.level,
        levels,
        transports: transports[channel],
        exitOnError: this.options.exitOnError,
        emitErrs: this.options.emitErrors
      });
    }
  }

  /** This function set up a usage monitor */
  private setupMonitor(): void {
    // create a monitor instance only if it doesn't exist
    if (this.monitor === undefined) {
      this.monitor = new Monitor({
        updateInterval: 200,
        alertThreshold: this.options.monitor.logging.maxChange
      });

      this.monitor.on('update', meta => {
        this.status({
          channels: ['console'],
          meta: this.monitor.usage
        });

        if (
          meta.isAlert ||
          Date.now() - this.lastStatusLogged >
            this.options.monitor.logging.maxInterval * 1000
        ) {
          this.log('status', this.monitor.logMessage, {
            channels: ['log'],
            meta: meta.usage
          });
        }
      });
    }
  }

  /**
   * This is a static shortcut to log a message at level debug
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static debug(message: string, options?: MessageOptions): void {
    this.log('debug', message, options);
  }

  /**
   * This is a static shortcut to log a message at level error
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static error(message: string, options?: MessageOptions): void {
    this.log('error', message, options);
  }

  /**
   * This is a static shortcut to log a message at level info
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static info(message: string, options?: MessageOptions): void {
    this.log('info', message, options);
  }

  /**
   * This is a static shortcut to the instance equivalent
   * @param level - The level at which the message is reported
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static log(
    level: string,
    message: string,
    options?: MessageOptions
  ): void {
    const sher = new this();
    sher.log(level, message, options);
    sher.unhandleExceptions();
  }

  /**
   * This is a static shortcut to log a message at level status
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static status(message: string, options?: MessageOptions): void {
    this.log('status', message, options);
  }

  /**
   * This is a static shortcut to log a message at level verbose
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static verbose(message: string, options?: MessageOptions): void {
    this.log('verbose', message, options);
  }

  /**
   * This is a static shortcut to log a message at level warn
   * @param message - The message to be logged
   * @param options - The logging options
   */
  public static warn(message: string, options?: MessageOptions): void {
    this.log('warn', message, options);
  }
}

export default Sher;

//
// create an `eyes` inspector for pretty printing dependencies.
//
// var inspect = eyes.inspector({
//   stream: null,
//   styles: {
//     // Styles applied to stdout
//     all: null, // Overall style applied to everything
//     label: 'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
//     other: 'inverted', // Objects which don't have a literal representation, such as functions
//     key: 'grey', // The keys in object literals, like 'a' in `{a: 1}`
//     special: 'grey', // null, undefined...
//     number: 'blue', // 1, 2, 3, etc
//     bool: 'magenta', // true false
//     regexp: 'green', // /\d+/
//     string: 'yellow'
//   }
// });

// var pjson = require('prettyjson-256');

// console.log(prettyjson.render(data, startIndent, customOptions));

// var options = {
//   // sort object keys or array values alphabetically
//   alphabetizeKeys: false,
//   // how many spaces to indent nested objects
//   defaultIndentation: 2,
//   // maximum depth of nested levels to display for an object
//   depth: -1,
//   // what to display if value is an empty array, object, or string (-1 is finite)
//   emptyArrayMsg: '(empty array)',
//   emptyObjectMsg: '{}',
//   emptyStringMsg: '(empty string)',
//   // don't output any color
//   noColor: false,
//   // show array indexes, this will prevent array from sorting if alphabetizeKeys is on
//   numberArrays: false,
//   // show if contained in an object an array, string, or another object is empty
//   showEmpty: true,
//   // color codes for different output elements
//   colors: {
//     boolFalse: { fg: [5, 4, 4] },
//     boolTrue: { fg: [4, 4, 5] },
//     dash: { fg: [2, 5, 4] },
//     date: { fg: [0, 5, 2] },
//     depth: { fg: [9] },
//     empty: { fg: [13] },
//     functionHeader: { fg: [13] },
//     functionTag: { fg: [4, 4, 5] },
//     keys: { fg: [2, 5, 4] },
//     number: { fg: [2, 4, 5] },
//     string: null
//   }
// };
