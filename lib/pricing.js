const MONTH_DAYS = 30;

/**
 * Calculates an estimated total for a lease/rental/purchase request.
 *
 * Rental/lease pricing: count the inclusive number of days between start and
 * end date (pickup day counts as day 1). Every full 30-day block is charged
 * at the monthly rate, and any leftover days are charged at the daily rate.
 * This rewards longer bookings with the monthly rate instead of always
 * multiplying daily rate x days, while still handling short bookings sanely.
 *
 * Purchase pricing: just the vehicle's purchase price - no dates involved.
 *
 * Returns { total, days, months, remainingDays, breakdown } so the caller
 * (customer site, admin panel) can show a human-readable explanation, not
 * just a bare number.
 */
function calculateEstimatedTotal({ type, startDate, endDate, dailyRentalRate = 0, monthlyLeaseRate = 0, purchasePrice = 0 }) {
  if (type === 'purchase') {
    return { total: purchasePrice || 0, days: null, months: 0, remainingDays: 0, breakdown: 'Purchase price' };
  }

  if (!startDate || !endDate) {
    return { total: 0, days: null, months: 0, remainingDays: 0, breakdown: 'Add your dates to see a total' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { total: 0, days: null, months: 0, remainingDays: 0, breakdown: 'Invalid date range' };
  }

  const days = Math.round((end - start) / 86400000) + 1; // inclusive of both pickup and return day

  let total, months, remainingDays;
  if (days >= MONTH_DAYS && monthlyLeaseRate > 0) {
    months = Math.floor(days / MONTH_DAYS);
    remainingDays = days % MONTH_DAYS;
    total = months * monthlyLeaseRate + remainingDays * dailyRentalRate;
  } else {
    months = 0;
    remainingDays = days;
    total = days * dailyRentalRate;
  }

  const parts = [];
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (remainingDays > 0) parts.push(`${remainingDays} day${remainingDays > 1 ? 's' : ''}`);
  const breakdown = parts.join(' + ') || `${days} day${days > 1 ? 's' : ''}`;

  return { total, days, months, remainingDays, breakdown };
}

module.exports = { calculateEstimatedTotal, MONTH_DAYS };
