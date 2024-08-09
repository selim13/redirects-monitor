import timestring from 'timestring';

export function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function str2ms(time: string | number): number {
  if (typeof time === 'number') return time;
  return timestring(time) * 1000;
}
