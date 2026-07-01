import mysql from 'mysql2/promise';
import { Expense, Budget, RecurringTransaction, SavingGoal, AutoSisihSettings } from './types';

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
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 5000,
});

// ── Transactions ──

export async function getTransactions(email: string): Promise<Expense[]> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id, email, amount, category, description, date, flow, account, created_at, updated_at FROM transactions WHERE email = ? ORDER BY date DESC',
      [email]
    );
    return rows.map(mapRowToExpense);
  } catch (e) {
    console.error('getTransactions error:', e);
    return [];
  }
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
    console.error('replaceTransactions error:', e);
  } finally {
    conn.release();
  }
}

export async function deleteTransaction(email: string, id: string): Promise<void> {
  try {
    await pool.execute(
      'DELETE FROM transactions WHERE email = ? AND id = ?',
      [email, id]
    );
  } catch (e) {
    console.error('deleteTransaction error:', e);
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

// ── Goals ──

export async function getGoals(email: string): Promise<SavingGoal[]> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM goals WHERE email = ?',
      [email]
    );
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      target: Number(r.target),
      saved: Number(r.saved),
      icon: r.icon || undefined,
      color: r.color,
      createdAt: formatDateTime(r.created_at),
      updatedAt: formatDateTime(r.updated_at),
    }));
  } catch {
    return [];
  }
}

export async function replaceGoals(email: string, goals: SavingGoal[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM goals WHERE email = ?', [email]);
    if (goals.length > 0) {
      const values = goals.map(g => [
        g.id, email, g.name, g.target, g.saved,
        g.icon || null, g.color,
        toMySqlDatetime(g.createdAt), toMySqlDatetime(g.updatedAt),
      ]);
      await conn.query(
        'INSERT INTO goals (id, email, name, target, saved, icon, color, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    console.error('replaceGoals error:', e);
  } finally {
    conn.release();
  }
}

// ── Budgets ──

export async function getBudgets(email: string): Promise<Budget[]> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT month, target FROM budgets WHERE email = ?',
      [email]
    );
    return rows.map(r => ({ month: r.month, target: Number(r.target) }));
  } catch (e) {
    console.error('getBudgets error:', e);
    return [];
  }
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

// ── Settings ──

import { PeriodSettings } from './types';

export async function getSettings(email: string): Promise<PeriodSettings | null> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT settings_json FROM settings WHERE email = ?',
      [email]
    );
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].settings_json);
  } catch {
    return null;
  }
}

export async function replaceSettings(email: string, settings: PeriodSettings): Promise<void> {
  const json = JSON.stringify(settings);
  await pool.execute(
    'REPLACE INTO settings (email, settings_json) VALUES (?, ?)',
    [email, json]
  );
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

// ── Goals ──

let tablesInitialized = false;

export async function initGoalTables(): Promise<void> {
  if (tablesInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        target DECIMAL(15,2) DEFAULT 0,
        saved DECIMAL(15,2) DEFAULT 0,
        icon VARCHAR(50),
        color VARCHAR(20) DEFAULT '#06B6D4',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_goals_email (email)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS auto_sisih (
        email VARCHAR(255) PRIMARY KEY,
        settings_json TEXT NOT NULL
      )
    `);
    tablesInitialized = true;
  } catch (e) {
    console.error('initGoalTables error:', e);
  }
}

// ── Auto-Sisih ──

export async function getAutoSisih(email: string): Promise<AutoSisihSettings | null> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT settings_json FROM auto_sisih WHERE email = ?',
      [email]
    );
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].settings_json);
  } catch {
    return null;
  }
}

export async function replaceAutoSisih(email: string, settings: AutoSisihSettings): Promise<void> {
  try {
    const json = JSON.stringify(settings);
    await pool.execute(
      'REPLACE INTO auto_sisih (email, settings_json) VALUES (?, ?)',
      [email, json]
    );
  } catch (e) {
    console.error('replaceAutoSisih error:', e);
  }
}

/** Convert ISO datetime string ('2026-06-25T09:15:49.687Z') to MySQL format ('2026-06-25 09:15:49') */
function toMySqlDatetime(iso: string | undefined | null): string {
  if (!iso) return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
