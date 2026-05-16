import { describe, expect, it } from 'vitest';
import { compileSchedule } from '../ScheduleBuilder';

describe('ScheduleBuilder', () => {
  it('compiles every six hours to cron', () => {
    expect(compileSchedule('hours', { minutes: 15, hours: 6, time: '06:00', days: ['1'], custom: '' })).toBe('0 */6 * * *');
  });

  it('defaults daily schedules to 06:00 UTC cron shape', () => {
    expect(compileSchedule('daily', { minutes: 15, hours: 6, time: '06:00', days: ['1'], custom: '' })).toBe('0 6 * * *');
  });
});
