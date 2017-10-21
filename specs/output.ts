import { generateOptions, SherTest as Sher } from './';

import { Levels } from '../source/definitions';

export interface LevelTestOptions {
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
    level: options.level,
    channel: 'console',
    mockContainerEnvironment: options.mockContainerEnvironment,
    useIndividualLevel: options.useIndividualLevel,
    useInstance: options.useInstance
  });

  // generate an unique message for the test
  const message = new Date().toISOString() + Math.random().toString();

  // send the message out
  if (options.useInstance) {
    // with instance methods
    const sher = new Sher(sherOptions);
    sher.error(message);
    sher.warn(message);
    sher.info(message);
    sher.verbose(message);
    sher.debug(message);
    sher.status(message);
    sher.log('error', message);
    sher.log('warn', message);
    sher.log('info', message);
    sher.log('verbose', message);
    sher.log('debug', message);
    sher.log('status', message);
    sher.unhandleExceptions();
  } else {
    // with static methods
    Sher.error(message);
    Sher.warn(message);
    Sher.info(message);
    Sher.verbose(message);
    Sher.debug(message);
    Sher.status(message);
    Sher.log('error', message);
    Sher.log('warn', message);
    Sher.log('info', message);
    Sher.log('verbose', message);
    Sher.log('debug', message);
    Sher.log('status', message);
  }

  return message;
}
