import pg from 'pg';

const regions = [
  'aws-0-us-east-1',
  'aws-0-us-west-1',
  'aws-0-sa-east-1',
  'aws-0-eu-central-1',
  'aws-0-ap-southeast-1'
];

const ref = "thcbpglurbxpyuwsuteu";
const pass = "Eduar-231192";

async function testHost(host, user) {
  const url = `postgresql://${user}:${pass}@${host}.pooler.supabase.com:6543/postgres`;
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`🎉 ¡ÉXITO CONECTANDO! Host: ${host}, User: ${user}`);
    console.log(`   Hora DB:`, res.rows[0].now);
    await client.end();
    return true;
  } catch (err) {
    if (!err.message.includes('ENOTFOUND') && !err.message.includes('timeout')) {
      console.log(`ℹ️ Respondió (${host}, ${user}):`, err.message);
    }
    return false;
  }
}

async function run() {
  console.log("Buscando región exacta de Supabase...");
  for (const r of regions) {
    if (await testHost(r, `postgres.${ref}`)) break;
    if (await testHost(r, `postgres`)) break;
  }
  console.log("Prueba finalizada.");
}

run();
