import { generateOptions, SherTest as Sher } from './';

import {
  FunctionalChannel,
  Levels,
  OutputChannel
} from '../source/definitions';
import { Environment } from './';

export interface LevelTestOptions {
  environment: Environment;
  channel?: OutputChannel | FunctionalChannel;
  level: Levels;
  mockContainerEnvironment: boolean;
  useIndividualLevel: boolean;
  useInstance: boolean;
}

/**
 * This helper function runs the commands for an output test
 * @param options - The configuration
 * @return - The message used for the test
 */
export function levelTest(options: LevelTestOptions): string {
  // do the test and retrieve the expected message
  const sherOptions = generateOptions({
    environment: options.environment,
    level: options.level,
    mockContainerEnvironment: options.mockContainerEnvironment,
    useIndividualLevel: options.useIndividualLevel,
    useInstance: options.useInstance
  });

  // specify the output channel here
  const logOptions = options.channel
    ? {
        channels: [options.channel]
      }
    : undefined;

  // generate an unique message for the test
  const message = new Date().toISOString() + Math.random().toString();

  // send the message out`
  if (options.useInstance) {
    // with instance methods
    const sher = new Sher(sherOptions);
    sher.error(message, logOptions);
    sher.warn(message, logOptions);
    sher.info(message, logOptions);
    sher.verbose(message, logOptions);
    sher.debug(message, logOptions);
    sher.status(message, logOptions);
    sher.log('error', message, logOptions);
    sher.log('warn', message, logOptions);
    sher.log('info', message, logOptions);
    sher.log('verbose', message, logOptions);
    sher.log('debug', message, logOptions);
    sher.log('status', message, logOptions);
    sher.unhandleExceptions();
  } else {
    // with static methods
    Sher.error(message, logOptions);
    Sher.warn(message, logOptions);
    Sher.info(message, logOptions);
    Sher.verbose(message, logOptions);
    Sher.debug(message, logOptions);
    Sher.status(message, logOptions);
    Sher.log('error', message, logOptions);
    Sher.log('warn', message, logOptions);
    Sher.log('info', message, logOptions);
    Sher.log('verbose', message, logOptions);
    Sher.log('debug', message, logOptions);
    Sher.log('status', message, logOptions);
  }

  return message;
}
