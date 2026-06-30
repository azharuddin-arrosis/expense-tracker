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
    // First, check the record exists
    const [before] = await connection.query(
      'SELECT * FROM transactions WHERE id = ? AND email = ?',
      ['test2', 'azharoce@gmail.com']
    );
    console.log('Before DELETE:', before);

    // Now run the actual DELETE query
    const [result] = await connection.execute(
      'DELETE FROM transactions WHERE email = ? AND id = ?',
      ['azharoce@gmail.com', 'test2']
    );
    console.log('DELETE result:', result);

    // Check if record still exists
    const [after] = await connection.query(
      'SELECT * FROM transactions WHERE id = ? AND email = ?',
      ['test2', 'azharoce@gmail.com']
    );
    console.log('After DELETE:', after);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

main();