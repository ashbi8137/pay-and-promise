/**
 * Date Utilities for Pay & Promise
 * Enforces strict Midnight Local Time reset logic.
 */

/**
 * Returns the current date in YYYY-MM-DD format based on LOCAL time.
 * Use this instead of new Date().toISOString() which returns UTC.
 */
export const getLocalTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates the current day number (1-based) of a promise.
 * Uses strict Midnight Reset logic based on the user's local device time.
 * 
 * Example:
 * - Created at 11:50 PM.
 * - At 11:59 PM -> Day 1.
 * - At 12:00 AM -> Day 2.
 * 
 * @param startDateStr - The creation date ISO string (from DB/UTC).
 * @returns number - The current day (e.g., 1, 2, ...). returns 1 if date is future (shouldn't happen).
 */
export const getPromiseDay = (startDateStr: string): number => {
    if (!startDateStr) return 1;

    const start = new Date(startDateStr);
    const now = new Date();

    // Get "Local Midnight" of the start date
    // Note: new Date(y, m, d) creates a date at 00:00:00 Local Time
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    // Get "Local Midnight" of today
    const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Difference in milliseconds
    const diffTime = nowLocal.getTime() - startLocal.getTime();

    // Difference in days
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Day 1 is index 0 in calculation terms (same day), so we add 1.
    return Math.max(1, diffDays + 1);
};
