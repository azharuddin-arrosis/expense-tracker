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
    const [rows] = await connection.query(
      'SELECT * FROM transactions WHERE id = ?',
      ['test2']
    );
    console.log('Result for id = test2:');
    console.log(rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

main();
