const stderr = process.stderr.write;
const stdout = process.stdout.write;

/** This function replaces process.stdout.write with a mocked function */
export function setup(): jest.Mock<boolean> {
  const fn = jest.fn<boolean>();
  process.stderr.write = fn;
  process.stdout.write = fn;

  return fn;
}

/** This function restores the original process.stdout.write */
export function teardown(): void {
  process.stderr.write = stderr;
  process.stdout.write = stdout;
}
