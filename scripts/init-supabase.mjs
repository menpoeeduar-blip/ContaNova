import pkg from "pg";
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Eduar-231192@db.thcbpglurbxpyuwsuteu.supabase.co:5432/postgres";

console.log("Intentando conectar a Supabase...");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Conexión exitosa a Supabase!");
    
    // Crear tablas básicas
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo_documento TEXT NOT NULL DEFAULT 'NIT',
        numero_documento TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        activo BOOLEAN NOT NULL DEFAULT true,
        estado_cobranza TEXT NOT NULL DEFAULT 'activo',
        notas_cobranza TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS proveedores (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo_documento TEXT NOT NULL DEFAULT 'NIT',
        numero_documento TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        codigo TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        categoria TEXT,
        unidad TEXT NOT NULL DEFAULT 'UND',
        precio_venta NUMERIC(15,2) NOT NULL,
        precio_costo NUMERIC(15,2),
        stock NUMERIC(15,2) NOT NULL DEFAULT 0,
        stock_minimo NUMERIC(15,2) DEFAULT 5,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        numero_factura TEXT NOT NULL UNIQUE,
        cliente_id INTEGER REFERENCES clientes(id),
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE,
        subtotal NUMERIC(15,2) NOT NULL,
        impuestos NUMERIC(15,2) NOT NULL DEFAULT 0,
        total NUMERIC(15,2) NOT NULL,
        saldo_pendiente NUMERIC(15,2),
        estado TEXT NOT NULL DEFAULT 'emitida',
        notas TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS factura_detalles (
        id SERIAL PRIMARY KEY,
        factura_id INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id),
        cantidad NUMERIC(15,2) NOT NULL,
        precio_unitario NUMERIC(15,2) NOT NULL,
        subtotal NUMERIC(15,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS compras (
        id SERIAL PRIMARY KEY,
        numero_compra TEXT NOT NULL UNIQUE,
        proveedor_id INTEGER REFERENCES proveedores(id),
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE,
        total NUMERIC(15,2) NOT NULL,
        saldo_pendiente NUMERIC(15,2),
        estado TEXT NOT NULL DEFAULT 'recibida',
        notas TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS abonos (
        id SERIAL PRIMARY KEY,
        tipo TEXT NOT NULL,
        factura_id INTEGER REFERENCES facturas(id),
        compra_id INTEGER REFERENCES compras(id),
        monto NUMERIC(15,2) NOT NULL,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
        referencia TEXT,
        notas TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cuentas_puc (
        id SERIAL PRIMARY KEY,
        codigo TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        nivel INTEGER NOT NULL DEFAULT 1,
        padre_codigo TEXT,
        activa BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS comprobantes (
        id SERIAL PRIMARY KEY,
        numero TEXT NOT NULL UNIQUE,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        tipo TEXT NOT NULL,
        concepto TEXT NOT NULL,
        cuadrado BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_oportunidades (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        cliente_id INTEGER REFERENCES clientes(id),
        proveedor_id INTEGER REFERENCES proveedores(id),
        valor_estimado NUMERIC(15,2) NOT NULL DEFAULT 0,
        etapa TEXT NOT NULL DEFAULT 'prospecto',
        probabilidad INTEGER NOT NULL DEFAULT 50,
        fecha_cierre_esperada DATE,
        notas TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("🎉 ¡Todas las tablas creadas exitosamente en tu Supabase!");
  } catch (err) {
    console.error("❌ Error de conexión:", err);
  } finally {
    await client.end();
  }
}

run();
