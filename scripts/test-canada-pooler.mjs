import pg from 'pg';

const url = "postgresql://postgres.thcbpglurbxpyuwsuteu:Eduar-231192@aws-0-ca-central-1.pooler.supabase.com:6543/postgres";

async function test() {
  console.log("Conectando al pooler de Canadá...");
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query("SELECT NOW()");
    console.log("✅ ¡CONEXIÓN EXITOSA A SUPABASE!");
    console.log("   Hora del servidor Supabase:", res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error("❌ Error de conexión:", err.message);
  }
}

test();
