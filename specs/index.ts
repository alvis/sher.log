import { Sher, SherOptions } from '../source';
import { booleanize } from '../source/utilities';

import { reset } from './utilities';

import { DeepPartial, Levels } from '../source/definitions';

/** An entension of the original class to extract variables for testing */
export class SherTest extends Sher {
  constructor(options?: DeepPartial<SherOptions>) {
    super(options);

    // override the container setting by environment
    this.isRunningInContainer = booleanize(process.env.SHERLOG_TEST_CONTAINER);
  }

  public get mergedOptions(): SherOptions {
    return this.options;
  }
}

/**
 * An environment is what under which a test is performed
 */
export type Environment = 'stdout' | 'human' | 'json' | 'stackdriver';

export interface TestOptions {
  /** The simulated environment to be tested */
  environment: Environment;
  /** The level at which the logger is set */
  level: Levels;
  /** Indicate whether the test is pretended to be run in a container environment */
  mockContainerEnvironment: boolean;
  /** Indicate whether the level should be set at individual level rather than at the global */
  useIndividualLevel: boolean;
  /** Indicate whether instance methods are used */
  useInstance: boolean;
}

/**
 * A helper function to generate options for sher.log
 * @param options - The options for the test
 */
export function generateOptions(
  options: TestOptions
): DeepPartial<SherOptions> {
  // initialise the configuration
  reset();
  process.env.SHERLOG_TEST_CONTAINER = options.mockContainerEnvironment
    ? 'TRUE'
    : 'FALSE';
  process.env.SHERLOG_LEVEL = options.useIndividualLevel
    ? 'status'
    : options.level;
  let sherOptions: DeepPartial<SherOptions> = {
    level: options.useIndividualLevel ? 'status' : options.level
  };

  // temporary output path for log file output
  const logPath = ''; // todo: temporary path

  // setup the output channel
  switch (options.environment) {
    case 'stdout':
      if (options.useIndividualLevel) {
        process.env.SHERLOG_STDOUT_LEVEL = options.level;
      }

      sherOptions = {
        ...sherOptions,
        stdout: {
          output: true,
          ...(options.useIndividualLevel ? { level: options.level } : null)
        }
      };
      break;
    case 'human':
      sherOptions = {
        ...sherOptions,
        stdout: {
          output: false
        },
        humanLog: {
          path: logPath,
          ...(options.useIndividualLevel ? { level: options.level } : null)
        }
      };
    case 'json':
      sherOptions = {
        ...sherOptions,
        stdout: {
          output: false
        },
        jsonLog: {
          path: logPath,
          ...(options.useIndividualLevel ? { level: options.level } : null)
        }
      };
    default:
  }

  return sherOptions;
}
