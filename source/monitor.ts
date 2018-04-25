import bind from 'bind-decorator';
import * as byteSize from 'byte-size';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import * as prettyMS from 'pretty-ms';

export interface MonitorOptions {
  updateInterval: number;
  alertThreshold: number;
}

export interface Usage {
  cpu: number;
  memory: number;
}

export interface Meta {
  isAlert: boolean;
  usage: Usage;
}

export declare interface Monitor {
  on(event: 'update', listener: (meta: Meta) => void): this;
}

/**
 * This class monitors resource usage of the process.
 */
export class Monitor extends EventEmitter {
  /**
   * The options of the class
   */
  private options: MonitorOptions;

  private framePosition: number = 0;
  private frames: string[] = ['⢄', '⢂', '⢁', '⡁', '⡈', '⡐', '⡠'];

  private totalCPUTime: NodeJS.CpuUsage;
  private lastCheckTime: number;
  private currentUsage: Usage;

  private statusTimer: NodeJS.Timer;
  private startTime: number;

  constructor(options: MonitorOptions) {
    super();

    this.options = options;

    // initialse variables
    this.lastCheckTime = Date.now() - 1000;
    this.currentUsage = this.getUsage();

    // start the timers
    this.startTime = Date.now();
    this.statusTimer = setInterval(() => {
      // get current usage
      const currentUsage = this.getUsage();

      const meta = {
        // indicate if it there's a significant change in memory usage
        isAlert:
          Math.abs(Math.log(this.currentUsage.memory / currentUsage.memory)) >
          this.options.alertThreshold,
        // current usage
        usage: currentUsage
      };

      // update the usage
      this.currentUsage = currentUsage;

      // emiit a timer event at the end of each interval
      this.emit('update', meta);
    }, this.options.updateInterval);
  }

  public get usage(): Usage {
    return this.currentUsage;
  }

  public get consoleMessage(): string {
    const spinner = chalk.blue(
      this.frames[
        (this.framePosition = ++this.framePosition % this.frames.length)
      ]
    );
    const runningTime = chalk.yellow(prettyMS(Date.now() - this.startTime));
    // const cpuLabel = chalk.grey(`CPU:`) + '';
    const cpuUsage = chalk.cyan(this.usage.cpu.toPrecision(2));
    // const memoryLabel = chalk.grey(`Memory:`) + '';
    const memoryUsage = chalk.cyan(byteSize(this.usage.memory).toString());
    const status = chalk.grey(
      `${spinner} CPU: ${cpuUsage} Memory: ${memoryUsage} | ${runningTime}`
    );

    return status;
  }

  public get logMessage(): string {
    const runningTime = prettyMS(Date.now() - this.startTime);
    const cpuUsage = this.usage.cpu.toPrecision(2);
    const memoryUsage = byteSize(this.usage.memory).toString();
    const status = `CPU: ${cpuUsage} Memory: ${memoryUsage} | ${runningTime}`;

    return status;
  }

  /**
   * This function unloads the monitor
   */
  @bind
  public stop(): void {
    clearInterval(this.statusTimer);
  }

  /**
   * This function returns the current resource consumption by the process
   */
  private getUsage(): Usage {
    const usage = {
      cpu:
        process.cpuUsage(this.totalCPUTime).user /
        (Date.now() - this.lastCheckTime) /
        1000.0,
      memory: process.memoryUsage().heapUsed
    };
    this.totalCPUTime = process.cpuUsage();
    this.lastCheckTime = Date.now();

    return usage;
  }
}
