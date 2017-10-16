// import { Sher } from '../source';
// import { booleanize, debug } from '../source/utilities';

import { booleanize } from '../source/utilities';

describe('booleanize', () => {
  it('should recognise numbers', () => {
    expect(booleanize('0')).toEqual(false);
    expect(booleanize('0', { default: true })).toEqual(false);
    expect(booleanize('1')).toEqual(true);
    expect(booleanize('1', { default: true })).toEqual(true);
    expect(booleanize('01')).toEqual(true);
    expect(booleanize('01', { default: true })).toEqual(true);
  });

  it('should recognise y/n', () => {
    expect(booleanize('y')).toEqual(true);
    expect(booleanize('y', { default: true })).toEqual(true);
    expect(booleanize('n')).toEqual(false);
    expect(booleanize('n', { default: true })).toEqual(false);
  });

  it('should recognise yes/no', () => {
    expect(booleanize('yes')).toEqual(true);
    expect(booleanize('yes', { default: true })).toEqual(true);
    expect(booleanize('no')).toEqual(false);
    expect(booleanize('no', { default: true })).toEqual(false);
  });

  it('should recognise t/f', () => {
    expect(booleanize('t')).toEqual(true);
    expect(booleanize('t', { default: true })).toEqual(true);
    expect(booleanize('f')).toEqual(false);
    expect(booleanize('f', { default: true })).toEqual(false);
  });

  it('should recognise true/false', () => {
    expect(booleanize('true')).toEqual(true);
    expect(booleanize('true', { default: true })).toEqual(true);
    expect(booleanize('false')).toEqual(false);
    expect(booleanize('false', { default: true })).toEqual(false);
  });

  it('should honor the default if unrecognised', () => {
    expect(booleanize('-1')).toEqual(false);
    expect(booleanize('-1', { default: true })).toEqual(true);
    expect(booleanize('yesss')).toEqual(false);
    expect(booleanize('yesss', { default: true })).toEqual(true);
  });
});

// /** A helper class for testing the @debug decorator */
// class Message {
//   /**
//    * This function
//    */
//   @debug
//   public print(): void {
//     const sher = new Sher({
//       level: 'verbose'
//     });
//
//     sher.error('message');
//   }
// }
//
// const message = new Message();
// message.print();
