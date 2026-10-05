const pad = value => String(value).padStart(2, '0');

export function initialPaymentDate(now = new Date()) {
  return { date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

export function maskPaymentDate(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

export function maskPaymentTime(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2)].filter(Boolean).join(':');
}

export function parsePaymentDate(date, time, now = new Date()) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Informe a data em DD/MM/AAAA e o horário em HH:MM.');
  }
  const [day, month, year] = date.split('/').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (year < 1900 || value.getFullYear() !== year || value.getMonth() !== month - 1
      || value.getDate() !== day || hour > 23 || minute > 59) {
    throw new Error('Informe uma data e um horário válidos.');
  }
  if (value > now) { throw new Error('A data do pagamento não pode estar no futuro.'); }
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
}
