const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

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

async function setupDatabase() {
  try {
    console.log('Connecting to SQL Server...');
    await sql.connect(config);
    console.log('Connected successfully!');
    
    // Read and execute the SQL script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');
    console.log('Executing SQL script...');
    await sql.query(sqlScript);
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close the connection
    await sql.close();
  }
}

// Run the setup
setupDatabase();
