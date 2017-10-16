import * as fs from 'fs';

const debugToken = 'V6YULbBVrz';

/** The return of this function indicates whether all loggers should be forced to output */
export function shouldPrint(): boolean {
  return process.env.SHERLOG_TOKEN === debugToken;
}

/**
 * This is a function decorator function which temporarily enforces logging regardless the level set.
 * @param classInstance - The class instance in which the function lives
 * @param functionName - The name of the decorated function
 * @param descriptor - The original descriptor of the function
 * @return - The descriptor to be set to the function
 */
export function debug(
  classInstance: object,
  functionName: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const _descriptor = {
    ...descriptor,
    ...typeof descriptor.value === 'function'
      ? {
          value: (): typeof descriptor.value => {
            // store the original setting;
            const _sherlogToken = process.env.SHERLOG_TOKEN;

            // activate forced print
            process.env.SHERLOG_TOKEN = debugToken;

            // store the result
            const result = descriptor.value.apply(this, arguments);

            // return the original setting
            process.env.SHERLOG_TOKEN = _sherlogToken;

            // return the result
            return result;
          }
        }
      : null
  };

  return _descriptor;
}

export interface BooleanizeOptions {
  default: boolean;
}

/**
 * This function contextualises a string into a boolean.
 * @param input - The input string
 * @param options - The options for the recogniser
 */
export function booleanize(
  input: string | undefined,
  options?: BooleanizeOptions
): boolean {
  const _options = {
    default: false,
    ...options
  };

  if (input) {
    const value = String(input).trim();

    if (parseInt(value, 10) > 0) {
      return true;
    }

    if (/^(?:y|yes|t|true|1)$/i.test(value)) {
      return true;
    }

    if (/^(?:n|no|f|false|0)$/i.test(value)) {
      return false;
    }
  }

  return _options.default;
}

/** The return of this function indicates whether the process is running in a container */
export function isRunningInContainer(): boolean {
  return (
    fs.existsSync('/.dockerenv') ||
    (fs.existsSync('/proc/self/cgroup') &&
      fs.readFileSync('/proc/self/cgroup', 'utf8').indexOf('docker') !== -1)
  );
}
