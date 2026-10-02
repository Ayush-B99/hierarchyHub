const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

/** 125000 -> "R 125 000" */
export function formatSalary(amount: number): string {
  const [whole = '0', cents] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return cents === '00' ? `R ${grouped}` : `R ${grouped},${cents}`;
}

/** "1985-04-12" -> "12 Apr 1985" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''} ${year}`;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
