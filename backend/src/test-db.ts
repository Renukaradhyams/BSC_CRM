import mysql from 'mysql2/promise';

async function testConnection() {
  const host = 'localhost';
  const user = 'u510366842_BSC_DVG01';
  const database = 'u510366842_BSC_DVG';
  const password = 'Btpldvg@2026';

  console.log(`🔍 Attempting direct MySQL connection to ${host}...`);
  console.log(`User: ${user}`);
  console.log(`Database: ${database}`);

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: 3306
    });

    console.log('✅ Direct connection successful!');
    await connection.end();
  } catch (error: any) {
    console.error('❌ Connection failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
  }
}

testConnection();
