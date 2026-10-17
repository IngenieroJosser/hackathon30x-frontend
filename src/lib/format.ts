export const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(amount);

export const integer = (value: number) => new Intl.NumberFormat('es-CO').format(value);

export const shortDate = (date: string) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
