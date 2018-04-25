import { levels } from '../source';

import { levelTest } from './output';
import { setup, teardown } from './stdout';
import { stripANSI } from './utilities';

import { Channel } from '../source/definitions';
import { LevelTestOptions } from './output';

/**
 * simulate output and check the message printed on stdout
 * @param options - the configuration of the test
 */
function test(options: LevelTestOptions): void {
  // replace process.stderr/stdout to a mocked function
  const fn = setup();

  // simulate the output
  levelTest(options);

  // cleaning up after the simulation
  teardown();

  // prepare the result obtained from the result
  const records: string[][] = fn.mock.calls;
  const processedRecords: string[] = [];
  records.forEach(record => {
    if (record.length) {
      // detect line erase escape sequence
      const lineErased = (record[0].match(/\u001b\[2K/g) || []).length;
      if (lineErased) {
        for (let i = 0; i < lineErased; i++) {
          processedRecords.pop();
        }
      } else {
        processedRecords.push(stripANSI(record[0]).replace(/^\n|\n$/g, ''));
      }
    } //else{return ''}
  });

  const strippedRecords = processedRecords.filter(record => record !== '');

  // check the output
  describe(`checking printed message in a [${
    options.mockContainerEnvironment ? 'container' : 'console'
  }] environment at level [${options.level}] defined at [${
    options.useIndividualLevel ? 'individual channel' : 'global'
  }] with [${options.useInstance ? 'instance' : 'static'}] methods`, () => {
    if (
      (options.mockContainerEnvironment && options.channel === 'console') ||
      (!options.mockContainerEnvironment && options.channel === 'container')
    ) {
      expectNone(strippedRecords);
    } else {
      expectOutput(strippedRecords, options);
    }
  });
}

import * as fs from 'fs';

/**
 * check if the message contains anything
 * @param strippedRecords - an array of output printed on stdout
 */
function expectNone(strippedRecords: string[]): void {
  // check the total number of messages printed
  it('should print nothing in stdout', () => {
    if (strippedRecords.length !== 0) {
      fs.writeFileSync('/tmp/records', JSON.stringify(strippedRecords));
    }
    expect(strippedRecords.length).toEqual(0);
  });
}

/**
 * check the message reported at different report levels on stdout
 * @param strippedRecords - an array of output printed on stdout
 * @param options - the testing options
 */
function expectOutput(
  strippedRecords: string[],
  options: LevelTestOptions
): void {
  // check the total number of messages printed
  it('should print the right number of messages in total', () => {
    expect(strippedRecords.length).toEqual(
      2 *
        Math.min(
          Object.values(levels).filter(
            messageLevel => levels[options.level.toLowerCase()] >= messageLevel
          ).length,
          6
        ) +
        // only one status message should be shown in console
        (options.mockContainerEnvironment ? 0 : -1)
    );
  });

  // check the number of prints for each of the levels
  for (const messageLevel of Object.entries(levels)
    .filter(([name, _value]) => name !== 'silly')
    .map(([name, _value]) => name)) {
    it(`should print the right number of [${messageLevel}] messages`, () => {
      expect(
        strippedRecords.filter(
          record =>
            messageLevel.toLowerCase() === 'status' &&
            !options.mockContainerEnvironment
              ? record.search(
                  Object.keys(levels)
                    .join('|')
                    .toUpperCase()
                ) === -1
              : record.search(messageLevel.toUpperCase()) !== -1
        ).length
      ).toEqual(
        levels[options.level.toLowerCase()] >= levels[messageLevel]
          ? messageLevel === 'status' && !options.mockContainerEnvironment
            ? 1
            : 2
          : 0
      );
    });
  }
}

for (const channel of ['stdout', 'console', 'container'] as Channel[]) {
  describe(`testing output on the ${channel} channel`, () => {
    for (const mockContainerEnvironment of [true, false]) {
      for (const useIndividualLevel of [true, false]) {
        for (const useInstance of [true, false]) {
          for (const levelString of Object.keys(levels)) {
            if (levelString !== 'silly') {
              // levels in both lowercase and uppercase
              for (const level of [
                levelString.toLowerCase(),
                levelString.toUpperCase()
              ]) {
                test({
                  environment: 'stdout',
                  channel,
                  level,
                  mockContainerEnvironment,
                  useIndividualLevel,
                  useInstance
                });
              }
            }
          }
        }
      }
    }
  });
}
