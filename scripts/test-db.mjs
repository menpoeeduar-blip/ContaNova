import pg from 'pg';

const poolerUrl = "postgresql://postgres.thcbpglurbxpyuwsuteu:Eduar-231192@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const directUrl = "postgresql://postgres:Eduar-231192@db.thcbpglurbxpyuwsuteu.supabase.co:5432/postgres";

async function testConn(url, name) {
  console.log(`Intentando conectar a ${name}...`);
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ ¡Conexión exitosa a ${name}! Hora servidor:`, res.rows[0].now);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Error al conectar a ${name}:`, err.message);
    return false;
  }
}

async function run() {
  await testConn(poolerUrl, "Supabase Pooler (6543)");
  await testConn(directUrl, "Supabase Direct (5432)");
}

run();
