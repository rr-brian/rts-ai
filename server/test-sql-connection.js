const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Log the SQL configuration values (without the password)
console.log('SQL Configuration:');
console.log('  User:', process.env.SQL_USER);
console.log('  Server:', process.env.SQL_SERVER);
console.log('  Database:', process.env.SQL_DATABASE);
console.log('  Password Length:', process.env.SQL_PASSWORD ? process.env.SQL_PASSWORD.length : 0);

// SQL Server configuration
const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || 'rts-sql-main.database.windows.net',
  database: process.env.SQL_DATABASE || 'rts-sql-main',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function testConnection() {
  try {
    console.log('Attempting to connect to SQL Server...');
    await sql.connect(config);
    console.log('Connected successfully!');
    
    // Test a simple query
    const result = await sql.query`SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES`;
    console.log('Query executed successfully!');
    console.log('First table:', result.recordset[0]);
    
  } catch (error) {
    console.error('Error connecting to SQL Server:');
    console.error(error);
  } finally {
    // Close the connection
    await sql.close();
    console.log('Connection closed.');
  }
}

// Run the test
testConnection();
