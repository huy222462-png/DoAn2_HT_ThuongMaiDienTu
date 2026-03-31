const sql = require('mssql/msnodesqlv8');

const instances = ['SQLEXPRESS', 'SQLEXPRESS01'];

async function testInstance(instanceName) {
  const config = {
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=localhost\\${instanceName};Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;Connection Timeout=5;`
  };

  const started = Date.now();
  try {
    const pool = await sql.connect(config);
    const existsResult = await pool.request().query("SELECT DB_ID('TMDT') AS id");
    const dbId = existsResult.recordset[0]?.id ?? null;
    console.log(`${instanceName}: CONNECTED in ${Date.now() - started}ms | TMDT DB ID: ${dbId}`);
    await pool.close();
  } catch (error) {
    console.log(`${instanceName}: ERROR | ${error.message}`);
  } finally {
    try {
      await sql.close();
    } catch (_) {
      // Ignore close errors in diagnostics script.
    }
  }
}

(async () => {
  for (const instanceName of instances) {
    // Run sequentially to keep output easy to read.
    await testInstance(instanceName);
  }
})();
