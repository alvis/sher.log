import bind from 'bind-decorator';
import * as chalk from 'chalk';
import { EventEmitter } from 'events';

export interface ProgressOptions {
  name: string;
  limit: number;
  progress: number;
  message: string;
  updateInterval: number;
}

export interface MessageOptions {
  nameLength: number;
  barLength: number;
}

export class Progress extends EventEmitter {
  public name: string;
  public message?: string;
  public meta?: object;

  private progress: number;
  private limit: number;
  private updateInterval: number;

  private startTime: number;
  private lastEmit: number;

  constructor(options?: Partial<ProgressOptions>) {
    super();

    const defaultOptions: ProgressOptions = {
      name: '',
      message: '',
      progress: 0,
      limit: 0,
      updateInterval: 1000
    };
    const _options: ProgressOptions = {
      ...defaultOptions,
      ...options
    };

    // configurate the class
    for (const key of Object.keys(defaultOptions)) {
      this[key] = _options[key];
    }

    // start the timers
    this.startTime = Date.now();
    this.lastEmit = Date.now();
  }

  public get status(): string {
    const limitMessage = this.limit ? this.limit : 'unknown';
    const message = `[${this.progress} | ${limitMessage}]`;

    return message;
  }

  @bind
  public consoleMessage(options: MessageOptions): string {
    const name = this.name ? `${this.name}: ` : '';

    if (this.progress < this.limit) {
      const percentage = this.limit
        ? Math.floor(this.progress / this.limit * 100)
        : 0;
      const blocks = Math.floor(options.barLength * percentage / 100);
      const progressBar =
        '█'.repeat(blocks) + '.'.repeat(options.barLength - blocks);

      const limit = this.limit ? this.limit : 'unknown';
      const info = this.message ? ` ${this.message}` : '';
      const progress = `[${this.progress} | ${limit} | ${percentage}%]`;
      const message = `${name}${progressBar} ${progress}${info}`;

      return chalk.white(message);
    } else {
      const message = `${name}Done`;

      return chalk.white(message);
    }
  }

  @bind
  public logMessage(options: Pick<MessageOptions, 'nameLength'>): string {
    const percentage = this.limit
      ? Math.floor(this.progress / this.limit * 100)
      : 0;

    const name = this.name ? `${this.name}: ` : '';
    const limit = this.limit ? this.limit : 'unknown';
    const info = this.message ? ` ${this.message}` : '';
    const progress = `[${this.progress} | ${limit} | ${percentage}%]`;
    const message = `${name}${info} ${progress}`;

    return message;
  }

  @bind
  public tick(options?: { step?: number; message?: string }): void {
    if (options) {
      this.progress += options.step ? options.step : 1;
      this.message = options.message;
    } else {
      this.progress++;
    }

    // check if the process has already finished
    const hasFinished = this.progress >= this.limit;

    // singal an update is available only when a certain time has passed or the process has already finished
    if (Date.now() - this.lastEmit > this.updateInterval || hasFinished) {
      this.emit('update');
      this.lastEmit = Date.now();
    }

    // signal the end
    if (hasFinished) {
      this.emit('end');
    }
  }

  @bind
  public updateLimit(limit: number): this {
    this.limit = limit;

    return this;
  }
}
