import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Caption1,
  Field,
  Input,
  Radio,
  RadioGroup,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

export type ScheduleMode = 'minutes' | 'hours' | 'daily' | 'weekly' | 'custom';

export interface ScheduleBuilderProps {
  error?: string | null;
  onChange: (cron: string) => void;
  onCustomEdit?: () => void;
  value: string;
}

const weekdays = [
  { label: 'Mon', value: '1' },
  { label: 'Tue', value: '2' },
  { label: 'Wed', value: '3' },
  { label: 'Thu', value: '4' },
  { label: 'Fri', value: '5' },
  { label: 'Sat', value: '6' },
  { label: 'Sun', value: '0' },
];

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    flexWrap: 'wrap',
  },
  dayChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },
  preview: {
    color: tokens.colorNeutralForeground3,
  },
});

export function ScheduleBuilder({ error, onChange, onCustomEdit, value }: ScheduleBuilderProps) {
  const styles = useStyles();
  const initial = useMemo(() => parseCron(value), [value]);
  const [mode, setMode] = useState<ScheduleMode>(initial.mode);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [hours, setHours] = useState(initial.hours);
  const [time, setTime] = useState(initial.time);
  const [days, setDays] = useState<string[]>(initial.days);
  const [custom, setCustom] = useState(value || '0 6 * * *');

  useEffect(() => {
    const next = compileSchedule(mode, { minutes, hours, time, days, custom });
    if (next !== value) {
      onChange(next);
    }
  }, [custom, days, hours, minutes, mode, onChange, time, value]);

  const setScheduleMode = (nextMode: ScheduleMode) => {
    setMode(nextMode);
    if (nextMode === 'custom') {
      setCustom(value || custom);
    }
  };

  const preview = compileSchedule(mode, { minutes, hours, time, days, custom });

  return (
    <div className={styles.root}>
      <RadioGroup
        layout="horizontal"
        value={mode}
        onChange={(_, data) => setScheduleMode(data.value as ScheduleMode)}
      >
        <Radio value="minutes" label="Every N minutes" />
        <Radio value="hours" label="Every N hours" />
        <Radio value="daily" label="Daily at HH:MM" />
        <Radio value="weekly" label="Weekly" />
        <Radio value="custom" label="Custom cron" />
      </RadioGroup>

      {mode === 'minutes' ? (
        <Field label="Minutes">
          <Input type="number" min={1} max={59} value={String(minutes)} onChange={(_, data) => setMinutes(toBoundedInt(data.value, 1, 59, 15))} />
        </Field>
      ) : null}

      {mode === 'hours' ? (
        <Field label="Hours">
          <Input type="number" min={1} max={23} value={String(hours)} onChange={(_, data) => setHours(toBoundedInt(data.value, 1, 23, 6))} />
        </Field>
      ) : null}

      {mode === 'daily' || mode === 'weekly' ? (
        <div className={styles.row}>
          {mode === 'weekly' ? (
            <Field label="Weekdays">
              <div className={styles.dayChips}>
                {weekdays.map((day) => (
                  <Button
                    key={day.value}
                    appearance={days.includes(day.value) ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setDays(toggleDay(days, day.value))}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </Field>
          ) : null}
          <Field label="Time (UTC)">
            <Input type="time" value={time} onChange={(_, data) => setTime(data.value || '06:00')} />
          </Field>
        </div>
      ) : null}

      {mode === 'custom' ? (
        <Field label="Cron expression" validationMessage={error ?? undefined} validationState={error ? 'error' : 'none'}>
          <Input value={custom} onChange={(_, data) => { setCustom(data.value); onCustomEdit?.(); }} />
        </Field>
      ) : null}

      <Caption1 className={styles.preview}>Compiles to <code>{preview}</code></Caption1>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function compileSchedule(
  mode: ScheduleMode,
  values: { minutes: number; hours: number; time: string; days: string[]; custom: string },
) {
  const [hour, minute] = parseTime(values.time);
  switch (mode) {
    case 'minutes':
      return `*/${toBoundedInt(String(values.minutes), 1, 59, 15)} * * * *`;
    case 'hours':
      return `0 */${toBoundedInt(String(values.hours), 1, 23, 6)} * * *`;
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${(values.days.length ? values.days : ['1']).join(',')}`;
    case 'custom':
    default:
      return values.custom;
  }
}

function parseCron(value: string): { mode: ScheduleMode; minutes: number; hours: number; time: string; days: string[] } {
  const trimmed = value.trim();
  const minutes = /^\*\/(\d+) \* \* \* \*$/.exec(trimmed);
  if (minutes) return { mode: 'minutes', minutes: Number(minutes[1]), hours: 6, time: '06:00', days: ['1'] };
  const hours = /^0 \*\/(\d+) \* \* \*$/.exec(trimmed);
  if (hours) return { mode: 'hours', minutes: 15, hours: Number(hours[1]), time: '06:00', days: ['1'] };
  const daily = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(trimmed);
  if (daily) return { mode: 'daily', minutes: 15, hours: 6, time: `${daily[2].padStart(2, '0')}:${daily[1].padStart(2, '0')}`, days: ['1'] };
  const weekly = /^(\d{1,2}) (\d{1,2}) \* \* ([0-6](?:,[0-6])*)$/.exec(trimmed);
  if (weekly) return { mode: 'weekly', minutes: 15, hours: 6, time: `${weekly[2].padStart(2, '0')}:${weekly[1].padStart(2, '0')}`, days: weekly[3].split(',') };
  return { mode: trimmed ? 'custom' : 'daily', minutes: 15, hours: 6, time: '06:00', days: ['1'] };
}

function parseTime(value: string) {
  const [hour = '6', minute = '0'] = value.split(':');
  return [toBoundedInt(hour, 0, 23, 6), toBoundedInt(minute, 0, 59, 0)];
}

function toBoundedInt(value: string, min: number, max: number, fallback: number) {
  const next = Number.parseInt(value, 10);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function toggleDay(days: string[], day: string) {
  const next = days.includes(day) ? days.filter((value) => value !== day) : [...days, day];
  return next.length ? next.sort() : [day];
}
