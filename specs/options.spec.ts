import { SherOptions } from '../source';
import { SherTest } from './';
import { reset } from './utilities';

describe('Options Merge', () => {
  beforeEach(reset);
  afterAll(reset);

  describe('should generate the default options', () => {
    const defaultOptions = new SherTest().mergedOptions;
    const defaultOptionsString = JSON.stringify({
      captureUnhandledException: true,
      exitOnError: false,
      emitErrors: false,
      level: 'info',
      stdout: { output: true },
      humanLog: { path: '' },
      jsonLog: { path: '' },
      stackdriver: { keyFile: '', projectID: '' },
      monitor: { display: true, logging: { maxInterval: 300, maxChange: 0.1 } }
    });

    expect(JSON.stringify(defaultOptions)).toEqual(defaultOptionsString);
  });

  describe('should be able to capture configurations through the environment', () => {
    const targetOptions: SherOptions = {
      captureUnhandledException: false,
      exitOnError: true,
      emitErrors: true,
      level: 'error',
      stdout: { level: 'warn', output: true },
      humanLog: { level: 'info', path: '/tmp' },
      jsonLog: { level: 'verbose', path: '/tmp' },
      stackdriver: {
        level: 'debug',
        keyFile: '/tmp/key',
        projectID: '/tmp/id'
      },
      monitor: { display: false, logging: { maxInterval: 100, maxChange: 1 } }
    };

    process.env.SHERLOG_CAPTURE_UNHANDLED_EXCEPTION = targetOptions.captureUnhandledException
      ? '1'
      : '0';
    process.env.SHERLOG_EXIT_ON_ERROR = targetOptions.exitOnError
      ? 'YES'
      : 'NO';
    process.env.SHERLOG_EMIT_ERRORS = targetOptions.emitErrors
      ? 'TRUE'
      : 'FALSE';

    process.env.SHERLOG_LEVEL = targetOptions.level;

    process.env.SHERLOG_STDOUT = targetOptions.stdout.output ? 't' : 'f';
    process.env.SHERLOG_STDOUT_LEVEL = targetOptions.stdout.level;

    process.env.SHERLOG_HUMAN_LOG_LEVEL = targetOptions.humanLog.level;
    process.env.SHERLOG_HUMAN_LOG_PATH = targetOptions.humanLog.path;

    process.env.SHERLOG_JSON_LOG_LEVEL = targetOptions.jsonLog.level;
    process.env.SHERLOG_JSON_LOG_PATH = targetOptions.jsonLog.path;

    process.env.SHERLOG_STACKDRIVER_LOG_LEVEL = targetOptions.stackdriver.level;
    process.env.SHERLOG_STACKDRIVER_KEY_FILE =
      targetOptions.stackdriver.keyFile;
    process.env.SHERLOG_STACKDRIVER_PROJECT_ID =
      targetOptions.stackdriver.projectID;

    process.env.SHERLOG_MONITOR_DISPLAY = targetOptions.monitor.display
      ? 'yes'
      : 'no';
    process.env.SHERLOG_MONITOR_LOGGING_MAX_INTERVAL = targetOptions.monitor.logging.maxInterval.toString();
    process.env.SHERLOG_MONITOR_LOGGING_MAX_CHANGE = targetOptions.monitor.logging.maxChange.toString();

    const options = new SherTest().mergedOptions;

    compare('', options, targetOptions);
    // expect(JSON.stringify(options)).toEqual(JSON.stringify(targetOptions));
  });
});

function compare(path: string, generated: any, expected: any): void {
  if (typeof generated === typeof expected) {
    if (typeof generated === 'object' && typeof expected === 'object') {
      const leftKeys = Object.keys(generated);
      const rightKeys = Object.keys(expected);

      it(`should have no extra key in ${path ? path : '/'} of the generated options`, () => {
        expect(
          leftKeys.filter(key => !rightKeys.includes(key)).join(', ')
        ).toEqual('');
      });

      it(`should have no extra key in ${path ? path : '/'} of the expected options`, () => {
        expect(
          rightKeys.filter(key => !leftKeys.includes(key)).join(', ')
        ).toEqual('');
      });

      for (const key of leftKeys) {
        compare(`${path}/${key}`, generated[key], expected[key]);
      }
    } else {
      it(`should have identical value on both side at ${path}`, () => {
        expect(generated).toEqual(expected);
      });
    }
  } else {
    it(`should have identical types on both side at ${path}`, () => {
      expect(typeof generated).toEqual(typeof expected);
    });
  }
}
