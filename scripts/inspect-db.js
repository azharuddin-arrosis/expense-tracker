const mysql = require('mysql2/promise');

const config = {
  host: '153.92.15.71',
  port: 3306,
  user: 'u739061521_duit',
  password: '#Jandamuda2025',
  database: 'u739061521_duit',
};

async function main() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('Connected to MySQL database.');

    // 1. Inspect table structure
    const [columns] = await connection.query('DESCRIBE transactions');
    console.log('--- Table Structure (transactions) ---');
    console.table(columns);

    // 2. Query some rows for this email
    const email = 'azharoce@gmail.com';
    const [rows] = await connection.query(
      'SELECT id, email, amount, category, description, date, flow FROM transactions WHERE email = ? LIMIT 10',
      [email]
    );
    console.log(`\n--- First 10 transactions for ${email} ---`);
    console.table(rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

main();
