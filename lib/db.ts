import mysql from 'mysql2/promise';
import { Expense, Budget, RecurringTransaction } from './types';

function getEnv(name: string): string | undefined {
  const prefixed = `expensetracker_${name}`;
  return process.env[prefixed] || process.env[name];
}

export const pool = mysql.createPool({
  host: getEnv('MYSQL_HOST') || 'localhost',
  port: parseInt(getEnv('MYSQL_PORT') || '3306', 10),
  user: getEnv('MYSQL_USER'),
  password: getEnv('MYSQL_PASSWORD'),
  database: getEnv('MYSQL_DATABASE'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ── Transactions ──

export async function getTransactions(email: string): Promise<Expense[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, email, amount, category, description, date, flow, account, created_at, updated_at FROM transactions WHERE email = ? ORDER BY date DESC',
    [email]
  );
  return rows.map(mapRowToExpense);
}

export async function replaceTransactions(email: string, transactions: Expense[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM transactions WHERE email = ?', [email]);
    if (transactions.length > 0) {
      const values = transactions.map(tx => [
        tx.id, email, tx.amount, tx.category, tx.description || '',
        tx.date, tx.flow, tx.account || null,
        toMySqlDatetime(tx.createdAt), toMySqlDatetime(tx.updatedAt),
      ]);
      await conn.query(
        'INSERT INTO transactions (id, email, amount, category, description, date, flow, account, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function mapRowToExpense(row: mysql.RowDataPacket): Expense {
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    description: row.description || '',
    date: formatDate(row.date),
    flow: row.flow,
    account: row.account || undefined,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
  };
}

// ── Budgets ──

export async function getBudgets(email: string): Promise<Budget[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT month, target FROM budgets WHERE email = ?',
    [email]
  );
  return rows.map(r => ({ month: r.month, target: Number(r.target) }));
}

export async function replaceBudgets(email: string, budgets: Budget[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM budgets WHERE email = ?', [email]);
    if (budgets.length > 0) {
      const values = budgets.map(b => [email, b.month, b.target]);
      await conn.query(
        'INSERT INTO budgets (email, month, target) VALUES ?',
        [values]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ── Recurring ──

export async function getRecurring(email: string): Promise<RecurringTransaction[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM recurring_transactions WHERE email = ?',
    [email]
  );
  return rows.map(mapRowToRecurring);
}

export async function replaceRecurring(email: string, recurring: RecurringTransaction[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM recurring_transactions WHERE email = ?', [email]);
    if (recurring.length > 0) {
      const values = recurring.map(r => [
        r.id, email, r.name, r.amount, r.category, r.flow,
        r.description || '', r.frequency,
        r.dayOfMonth ?? null, r.dayOfWeek ?? null,
        r.startDate, r.endDate || null,
        r.isActive, r.lastGenerated || null, r.nextDueDate,
        toMySqlDatetime(r.createdAt), toMySqlDatetime(r.updatedAt),
      ]);
      await conn.query(
        `INSERT INTO recurring_transactions
         (id, email, name, amount, category, flow, description, frequency,
          day_of_month, day_of_week, start_date, end_date,
          is_active, last_generated, next_due_date, created_at, updated_at)
         VALUES ?`,
        [values]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function mapRowToRecurring(row: mysql.RowDataPacket): RecurringTransaction {
  return {
    id: row.id,
    userEmail: row.email,
    name: row.name,
    amount: Number(row.amount),
    category: row.category,
    flow: row.flow,
    description: row.description || undefined,
    frequency: row.frequency,
    dayOfMonth: row.day_of_month ?? undefined,
    dayOfWeek: row.day_of_week ?? undefined,
    startDate: formatDate(row.start_date),
    endDate: row.end_date ? formatDate(row.end_date) : undefined,
    isActive: Boolean(row.is_active),
    lastGenerated: row.last_generated ? formatDate(row.last_generated) : undefined,
    nextDueDate: formatDate(row.next_due_date),
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
  };
}

// ── Helpers ──

function formatDate(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const str = String(d);
  if (str.includes('T')) return str.slice(0, 10);
  return str;
}

function formatDateTime(d: Date | string): string {
  if (!d || d === '0000-00-00 00:00:00') return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  const str = String(d);
  if (str.includes('T')) return str;
  return str.replace(' ', 'T') + 'Z';
}

/** Convert ISO datetime string ('2026-06-25T09:15:49.687Z') to MySQL format ('2026-06-25 09:15:49') */
function toMySqlDatetime(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
