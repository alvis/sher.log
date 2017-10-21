import { levels } from '../source';

import { levelTest, LevelTestOptions } from './output';
import { setup, teardown } from './stdout';
import { stripANSI } from './utilities';

/**
 * This helper function checks the message reported at different report levels on console
 * @param options - The configuration of the test
 */
function test(options: LevelTestOptions): void {
  // replace process.stderr/stdout to a mocked function
  const fn = setup();

  levelTest(options);

  teardown();

  const records: string[][] = fn.mock.calls;
  const strippedRecords = records
    .map(
      record =>
        record.length ? stripANSI(record[0]).replace(/^\n|\n$/g, '') : ''
    )
    .filter(record => record !== '');

  describe(`checking printed message in a [${options.mockContainerEnvironment
    ? 'container'
    : 'console'}] environment at level [${options.level}] defined at [${options.useIndividualLevel
    ? 'individual channel'
    : 'global'}] with [${options.useInstance
    ? 'instance'
    : 'static'}] methods`, () => {
    // check the total number of messages printed
    it('should print the right number of messages in total', () => {
      expect(strippedRecords.length).toEqual(
        2 *
          Math.min(
            Object.values(levels).filter(
              messageLevel =>
                levels[options.level.toLowerCase()] >= messageLevel
            ).length,
            6
          )
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
          levels[options.level.toLowerCase()] >= levels[messageLevel] ? 2 : 0
        );
      });
    }
  });
}

describe('testing output on stdout', () => {
  for (const mockContainerEnvironment of [true, false]) {
    for (const useIndividualLevel of [true, false]) {
      for (const useInstance of [true, false]) {
        for (const level of Object.keys(levels)) {
          if (level !== 'silly') {
            // levels in both lowercase and uppercase
            test({
              level: level.toLowerCase(),
              mockContainerEnvironment,
              useIndividualLevel,
              useInstance
            });
            test({
              level: level.toUpperCase(),
              mockContainerEnvironment,
              useIndividualLevel,
              useInstance
            });
          }
        }
      }
    }
  }
});
