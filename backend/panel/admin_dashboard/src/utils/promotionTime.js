// Promotion schedules use the shop's timezone, regardless of the admin's device.
export const toScheduleInput = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 16);
};
export const scheduleToISO = value => value ? new Date(`${value}:00+05:30`).toISOString() : '';
export const schedulePayload = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
  ['startDate', 'expiryDate', 'endDate'].includes(key) ? scheduleToISO(value) : value
]));
