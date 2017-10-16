import { Sher } from '../source';

import { leakTest } from './memory';

describe('Memory Test', () => {
  const message = `Dont' leak!`.repeat(1000);
  const data = { data: new Date() };
  const meta = { timestamp: new Date().toISOString() };

  leakTest({
    description: 'should not leak with instance methods (default options)',
    shouldPass: true,
    fn: (): void => {
      const sher = new Sher();

      sher.error(message, { data, meta });
      sher.log('custom', message, { data, meta });
      sher.status(message, { data, meta });
    }
  });

  leakTest({
    description: 'should not leak with monitor and progress (default options)',
    shouldPass: true,
    fn: (): void => {
      const sher = new Sher();

      const progress = sher.progress({ limit: 4 });
      progress.tick({ step: 1, message: 'step 1' });

      sher.error(message, { data, meta });
      progress.tick({ step: 1, message: 'step 2' });

      sher.log('custom', message, { data, meta });
      progress.tick({ step: 1, message: 'step 3' });

      sher.status(message, { data, meta });
      progress.tick({ step: 1, message: 'step 4' });
    }
  });

  leakTest({
    description: 'should not leak with static methods (default options)',
    shouldPass: true,
    fn: (): void => {
      Sher.error(message, { data, meta });
      Sher.log('custom', message, { data, meta });
      Sher.status(message, { data, meta });
    }
  });

  leakTest({
    description: 'should not leak with mixed methods (default options)',
    shouldPass: true,
    fn: (): void => {
      const sher = new Sher();

      const progress = sher.progress({ limit: 4 });
      progress.tick({ step: 1, message: 'step 1' });

      sher.error(message, { data, meta });
      progress.tick({ step: 1, message: 'step 2' });
      Sher.error(message, { data, meta });
      progress.tick({ step: 1, message: 'step 3' });

      sher.log('custom', message, { data, meta });
      progress.tick({ step: 1, message: 'step 4' });
      Sher.log('custom', message, { data, meta });
      progress.tick({ step: 1, message: 'step 5' });

      sher.status(message, { data, meta });
      progress.tick({ step: 1, message: 'step 6' });
      Sher.status(message, { data, meta });
      progress.tick({ step: 1, message: 'step 7' });
    }
  });
});
