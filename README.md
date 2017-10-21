# Sher.LOG
> Sher.log is an opinionated implementation of winston, a popular logging utilities. As a package, it enables easy configuration to 4 types of transport, including `stdout` in a containerised environment and strackdriver.


STDOUT (Local): Show directly on the user's console. Maximum readibility for the user, but very poor for the machine.
STDOUT (Container): Stored as a history for future viewing from a proxied interface, such as the dashboard provided by Kubernetes and Google's stackdriver logging. Not optimal for both human and machine, but the advantage is that the log is automatically stored via fluentd on K8S.
Log File (Normal): For human examinaton, it mimic the experience of an user see on their console. Good for Human, but the machine may have difficulty on reading message in multiline.
Log File (JSON)/Stack Driver: For automated alert, and debug purpose, the log is stored with maximum readibility to the machine.

| **status**(message?: string | null, alternativeMessage?: string)** |
| `message: string`
| `alternativeMessage: string` (Optional)                    |
`metadata: object`

To clear the status message on the console, use
```ts
Sher.status(null);
```

**REMARK**
In a non-local terminal environment, the behaviour of `status` is in a special case. The differences are
1. the output is throttled for one output per the time length specified in `options.throttlingTimeout`, and
2. if `alternativeMessage` is provided, it will be used instead.

|             | STDOUT (Local)     | STDOUT (Container) | Log File (Human)   | Log File (JSON) / Stack Driver |
|-------------|--------------------|--------------------|--------------------|--------------------------------|
| Level Label | No                 | Every line         | First line Only    | Embedded                       |
| Multiline   | :white_check_mark: | :white_check_mark: | :white_check_mark: | No                             |
| JSON Format | YAML               | Formatted JSON     | YAML               | Nested JSON                    |
| Color       | :white_check_mark: | -                  | -                  | -                              |

**error/warn/info/verbose/debug**
`message: string`,
`metadata: object`

|             | STDOUT (Local)     | STDOUT (Container) | Log File (Human)            | Log File (JSON) / Stack Driver |
|-------------|--------------------|--------------------|-----------------------------|--------------------------------|
| Level Label | First line Only    | Every line         | First line Only             | Embedded                       |
| Multiline   | :white_check_mark: | :white_check_mark: | :white_check_mark: (padded) | No                             |
| JSON Format | YAML               | Formatted JSON     | YAML                        | Nested JSON                    |
| Color       | :white_check_mark: | -                  | -                           | -                              |



When running in a terminal, this function would print the message on `stdout` on the first call, and update the status message in all subsequent calls. In addition, no level icon would be printed.


## Running in a local terminal
`status` would continuously update the output.

## Running in docker

# Setup

Out of the box, Sher.log is ready for duty by simply including the library, i.e.
```ts
import sher from 'sher.log'; // ES 6 syntax for default import
or
import { Sher } from 'sher.log'; // ES 6 syntax class import
or
var sher = require('sher.log'); // commonjs
```

Further, Sher.log can be configurated in two ways, either by setting up the environment variables or enbedding the configuration into an instance.

## Configurating with Environment Variables
### Global Options
Sher.log support 5 error levels as the same as winston. They are `error`, `warning`, `info`, `verbose` and `debug`. To set the global level, set `SHERLOG_LEVEL` to the desired level name.

* **SHERLOG_LEVEL** *(Default: "ERROR" for process.env.NODE_ENV === 'production', "DEBUG" otherwise.)*
  The minimum level at which logs will be outputed on all channels.

### Options Related to STDOUT
By default, all logs will be printed on STDOUT unless `SHERLOG_LEVEL` or `SHERLOG_STDOUT_LEVEL` is set, or the STDOUT output is disabled by `SHERLOG_STDOUT`.

* **SHERLOG_STDOUT_LEVEL** *(Default: SHERLOG_LEVEL)*
  The minimum level at which logs will be printed on stdout.
* **SHERLOG_STDOUT** *(Default: "TRUE")*
  If set to 0, false or FALSE, no output will be printed on the terminal.

### Options Related to Log Files
By default, Sher.log do not save any log unless the path is specified. Similar to the setting for STDOUT, the log level for human and machine logs can be overridden by their corresponding variables.

* **SHERLOG_HUMAN_LOG_LEVEL** *(Default: SHERLOG_LEVEL)*
  The minimum level at which logs will be saved.
* **SHERLOG_HUMAN_LOG_PATH** *(Default: "")*
  If set, this will be the path where a human readable log is saved.
* **SHERLOG_JSON_LOG_LEVEL** *(Default: SHERLOG_LEVEL)*
  The minimum level at which logs will be saved.
* **SHERLOG_JSON_LOG_PATH** *(Default: "")*
  If set, this will be the path where a human readable log is saved.

### Options Related to StackDriver
Besides local logging, Sher.log supports remote logging on StackDriver. To setup, both

* **SHERLOG_STACKDRIVER_LOG_LEVEL** *(Default: SHERLOG_LEVEL)*
  The minimum level at which logs will be saved.
* **SHERLOG_STACKDRIVER_KEY_FILE** *(Default: "")*
  The JSON key file for accessing StackDriver.
* **SHERLOG_STACKDRIVER_PROJECT_ID** *(Default: "")*
  The related project ID on GCP.

### Options Realted to Error Capture

* **SHERLOG_CAPTURE_UNHANDLED_EXCEPTION** *(Default: "TRUE")*
  If set to 0, false or FALSE, any unhandled exception and promise rejection will be ignored.

* **SHERLOG_EXIT_ON_ERROR** *(Default: "FALSE")*
  If set to 1, true, or TRUE, any error would result in an immediate non-zero exit.

* **SHERLOG_EMIT_ERRORS** *(Default: "FALSE")*
    If set to 1, true, or TRUE, all errors would be printed.

### Options Realted to Monitor Display

* **SHERLOG_MONITOR_DISPLAY** *(Default: "TRUE")*
  If set to 0, false or FALSE, no running time and memory consumption information etc. will be printed on a local console.

* **SHERLOG_MONITOR_LOGGING_MAX_INTERVAL** *(Default: "300")*
  The max number of seconds between each status update on a logging channel.

* **SHERLOG_MONITOR_LOGGING_MAX_CHANGE** *(Default: "0.1")*
  The degree of change in resource consumption (e.g. 0.1 means ±10% change in either cpu or memory usage) for a status update on a logging channel.

## Additional Configuration via Instance Option

In additional to the configuration derived from environment variables, extra configuration can be passed to a Sher.log instance by supplying an option object at initialisation. i.e.

```ts
import { Sher, SherOptions } from 'sher.log';

const options: SherOptions = {};
const sher = new Sher(options);
```

The structure of the option is shown  is parallel to the environment variables. They can be directly mapped to the corresponding environment variables as the name suggested.

```ts
interface SherOptions {
  captureUnhandledException: boolean;
  exitOnError: boolean;
  emitErrors: boolean;
  level: PrintLevel;
  customLevels: string[];
  stdout: {
    level?: PrintLevel;
    output?: boolean;
  };
  humanLog: {
    level?: PrintLevel;
    path: string;
  };
  jsonLog: {
    level?: PrintLevel;
    path: string;
  };
  stackdriver: {
    level?: PrintLevel;
    keyFile: string;
    projectID: string;
  };
  status: {
    display: boolean;
    logging: {
      maxInterval: number;
      maxChange: number;
    };
  };
}
```

# Usage
Simplicity is the design philosphy of Sher.LOG. It is designed to handled three common scenarios -- logging, status, and exception -- with only one simple command.

## Logging
Use `sher.error`, `sher.warn`, `sher.info`, `sher.verbose` and `sher.debug` as shortcuts, or `sher.log(level, ...)` to log at the destinated levels. For example,
```ts
sher.debug(message: string, metadata?: any);
or
sher.log('debug', message: string, metadata?: any);
```

will produce
```sh
$ [DEBUG] Debug Message
```
on the terminal, or

```sh
no $
```
on a dockerised environment.

Further, if configurated, it will also save

```
log
```
and
```json
```
to the log files and StackDriver.

### Options
* Meta Data
For each of the log, you can pass two types of JSON object `data` and `meta` as part of the options.
The difference is summarised in the following table.

|         | STDOUT (Local)     | STDOUT (Container) | Log File (Human)   | Log File (JSON) / Stack Driver |
|-------- | ------------------ | ------------------ | ------------------ | ------------------------------ |
|data     | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
|meta     | -                  | -                  | :white_check_mark: | :white_check_mark: |

* Channel
To specify the channel for output

*console* is a synonym to the local stdout
*log* includes stdout in a container environment, and other logging channels
*json* includes both local JSON log and Google's Stack Driver
*human*,

## Progress Update

In addition to logging messages, Sher.log can also help to keep
```
const progress = new Sher.progress();
progress.start();
progress.tick();
progress.stop();
```

Internally, the progress instance would use a special status print inherited from the parent Sher.log instance.

## Status Update
To print out the current status, the command is simply

```ts
sher.status(message: string, alternativeMessage?: string, metadata?: any)
```

**Remark:**
If a progress recorder is activated, the status will be printed above the progress bar.

Status Message:
Mem status  [1] file 1 [2] file 2
Progress [1] ------------- [50%] EST 50s
Progress [2] -------------

## Error Handling

```ts
try {
   ...
} catch(error) {
  sher.log(error, metadata); // use default setting captured from environmental variables
}
```

class Sher {
public log(levelOrError: string | Error, message?: string, metadata? object){} // check overload in ts

public static log (levelOrError: string | Error){}
}
