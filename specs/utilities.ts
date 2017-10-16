/** This function reset all the environment variables */
export function reset(): void {
  [
    'SHERLOG_TEST_CONTAINER',
    'SHERLOG_LEVEL',
    'SHERLOG_STDOUT_LEVEL',
    'SHERLOG_STDOUT',
    'SHERLOG_HUMAN_LOG_LEVEL',
    'SHERLOG_HUMAN_LOG_PATH',
    'SHERLOG_JSON_LOG_LEVEL',
    'SHERLOG_JSON_LOG_PATH',
    'SHERLOG_STACKDRIVER_LOG_LEVEL',
    'SHERLOG_STACKDRIVER_KEY_FILE',
    'SHERLOG_STACKDRIVER_PROJECT_ID',
    'SHERLOG_CAPTURE_UNHANDLED_EXCEPTION',
    'SHERLOG_EXIT_ON_ERROR',
    'SHERLOG_EMIT_ERRORS',
    'SHERLOG_MONITOR_DISPLAY',
    'SHERLOG_MONITOR_LOGGING_MAX_INTERVAL',
    'SHERLOG_MONITOR_LOGGING_MAX_CHANGE'
  ].forEach(variable => delete process.env[variable]);
}

/**
 * This function turns an ANSI string into pure string
 * @param input - The ANSI string to be stripped
 * @return The stripped string
 */
export function stripANSI(input: string): string {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
  ].join('|');

  return typeof input === 'string'
    ? input.replace(new RegExp(pattern, 'g'), '')
    : input;
}
