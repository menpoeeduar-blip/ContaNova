/**
 * ContaNova API — Vercel serverless (Express + pg)
 * Compatible with OpenAPI / frontend camelCase contracts.
 */
const express = require("express");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
});

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  // Normalize /api prefix so routes work with or without it
  if (req.url.startsWith("/api/")) req.url = req.url.slice(4);
  else if (req.url === "/api") req.url = "/";
  next();
});
app.use(express.json());

const q = (sql, params) => pool.query(sql, params);

function camelKey(k) {
  return k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamel(value) {
  if (Array.isArray(value)) return value.map(toCamel);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[camelKey(k)] = toCamel(v);
    return out;
  }
  return value;
}

function num(v) {
  if (v === null || v === undefined) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function pick(body, camel, snake) {
  if (body[camel] !== undefined) return body[camel];
  if (snake && body[snake] !== undefined) return body[snake];
  return undefined;
}

function mapCliente(row, saldoPendiente = 0) {
  const c = toCamel(row);
  return {
    ...c,
    saldoPendiente: num(saldoPendiente),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

function mapProducto(row) {
  const p = toCamel(row);
  return {
    ...p,
    precioVenta: num(p.precioVenta),
    precioCosto: p.precioCosto != null ? num(p.precioCosto) : null,
    stock: num(p.stock),
    stockMinimo: p.stockMinimo != null ? num(p.stockMinimo) : null,
  };
}

function mapFactura(row) {
  const f = toCamel(row);
  return {
    ...f,
    subtotal: num(f.subtotal),
    descuento: f.descuento != null ? num(f.descuento) : null,
    impuesto: num(f.impuesto),
    total: num(f.total),
    saldoPendiente: f.saldoPendiente != null ? num(f.saldoPendiente) : null,
    createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
  };
}

function asyncHandler(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((e) => {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal error" });
    });
  };
}

// ── Health ──────────────────────────────────────────────────
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// ── Dashboard ───────────────────────────────────────────────
app.get("/dashboard/stats", asyncHandler(async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const firstMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const firstLast = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const lastLast = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    .toISOString()
    .split("T")[0];

  const [clientes, productos, ventasHoy, ventasMes, ventasUltimo, pendientes, cobrar, pagar, opps] =
    await Promise.all([
      q("SELECT count(*)::int AS n FROM clientes WHERE activo = true"),
      q("SELECT count(*)::int AS n FROM productos WHERE activo = true"),
      q("SELECT coalesce(sum(total::numeric),0) AS n FROM facturas WHERE fecha = $1 AND estado != 'anulada'", [today]),
      q("SELECT coalesce(sum(total::numeric),0) AS n FROM facturas WHERE fecha >= $1 AND estado != 'anulada'", [firstMonth]),
      q("SELECT coalesce(sum(total::numeric),0) AS n FROM facturas WHERE fecha >= $1 AND fecha <= $2 AND estado != 'anulada'", [firstLast, lastLast]),
      q("SELECT count(*)::int AS n FROM facturas WHERE estado IN ('borrador','emitida')"),
      q("SELECT coalesce(sum(saldo_pendiente::numeric),0) AS n FROM facturas WHERE estado = 'emitida' AND saldo_pendiente::numeric > 0"),
      q("SELECT coalesce(sum(saldo_pendiente::numeric),0) AS n FROM compras WHERE estado IN ('pendiente','recibida') AND saldo_pendiente::numeric > 0"),
      q("SELECT count(*)::int AS n FROM oportunidades WHERE etapa NOT IN ('ganada','perdida','ganado','perdido')"),
    ]);

  const mes = num(ventasMes.rows[0].n);
  const ultimo = num(ventasUltimo.rows[0].n);
  res.json({
    ventasHoy: num(ventasHoy.rows[0].n),
    ventasMes: mes,
    utilidadMes: mes * 0.35,
    totalClientes: clientes.rows[0].n,
    totalProductos: productos.rows[0].n,
    facturasPendientes: pendientes.rows[0].n,
    cuentasPorCobrar: num(cobrar.rows[0].n),
    cuentasPorPagar: num(pagar.rows[0].n),
    oportunidadesAbiertas: opps.rows[0].n,
    variacionVentasMes: ultimo > 0 ? ((mes - ultimo) / ultimo) * 100 : null,
  });
}));

app.get("/dashboard/ventas-mensuales", asyncHandler(async (_req, res) => {
  const r = await q(`
    SELECT to_char(fecha::date, 'YYYY-MM') AS mes,
           coalesce(sum(total::numeric),0) AS total,
           count(*)::int AS cantidad
    FROM facturas
    WHERE estado != 'anulada' AND fecha >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY mes ORDER BY mes ASC
  `);
  res.json(r.rows.map((row) => ({ mes: row.mes, total: num(row.total), cantidad: row.cantidad })));
}));

app.get("/dashboard/top-productos", asyncHandler(async (_req, res) => {
  const r = await q(`
    SELECT fi.producto_id AS "productoId", fi.descripcion AS nombre,
           coalesce(sum(fi.cantidad::numeric),0) AS "cantidadVendida",
           coalesce(sum(fi.subtotal::numeric),0) AS "totalVentas"
    FROM factura_items fi
    JOIN facturas f ON fi.factura_id = f.id
    WHERE f.estado != 'anulada'
    GROUP BY fi.producto_id, fi.descripcion
    ORDER BY "totalVentas" DESC LIMIT 8
  `);
  res.json(r.rows.map((row) => ({
    productoId: row.productoId ?? 0,
    nombre: row.nombre,
    cantidadVendida: num(row.cantidadVendida),
    totalVentas: num(row.totalVentas),
  })));
}));

app.get("/dashboard/actividad-reciente", asyncHandler(async (_req, res) => {
  const [facturas, compras] = await Promise.all([
    q(`SELECT f.id, 'factura' AS tipo, 'Factura ' || f.numero || ' - ' || c.nombre AS descripcion,
              f.created_at AS fecha, f.total::numeric AS monto
       FROM facturas f JOIN clientes c ON f.cliente_id = c.id
       ORDER BY f.created_at DESC LIMIT 5`),
    q(`SELECT c.id, 'compra' AS tipo, 'Compra ' || c.numero || ' - ' || p.nombre AS descripcion,
              c.created_at AS fecha, c.total::numeric AS monto
       FROM compras c JOIN proveedores p ON c.proveedor_id = p.id
       ORDER BY c.created_at DESC LIMIT 5`),
  ]);
  const combined = [...facturas.rows, ...compras.rows]
    .map((r) => ({
      id: r.id,
      tipo: r.tipo,
      descripcion: r.descripcion,
      fecha: r.fecha instanceof Date ? r.fecha.toISOString() : r.fecha,
      monto: num(r.monto),
    }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);
  res.json(combined);
}));

app.get("/dashboard/flujo-caja", asyncHandler(async (_req, res) => {
  const r = await q(`
    WITH dias AS (
      SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS dia
    ),
    ingresos_dia AS (
      SELECT fecha::date AS dia, coalesce(sum(total::numeric),0) AS monto
      FROM facturas WHERE estado != 'anulada' AND fecha >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY fecha::date
    ),
    egresos_dia AS (
      SELECT fecha::date AS dia, coalesce(sum(total::numeric),0) AS monto
      FROM compras WHERE estado != 'anulada' AND fecha >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY fecha::date
    )
    SELECT d.dia AS fecha, coalesce(i.monto,0) AS ingresos, coalesce(e.monto,0) AS egresos,
           coalesce(i.monto,0) - coalesce(e.monto,0) AS saldo
    FROM dias d
    LEFT JOIN ingresos_dia i ON i.dia = d.dia
    LEFT JOIN egresos_dia e ON e.dia = d.dia
    ORDER BY d.dia ASC
  `);
  res.json(r.rows.map((row) => ({
    fecha: row.fecha,
    ingresos: num(row.ingresos),
    egresos: num(row.egresos),
    saldo: num(row.saldo),
  })));
}));

// ── Clientes ────────────────────────────────────────────────
app.get("/clientes", asyncHandler(async (req, res) => {
  const { search, activo } = req.query;
  const params = [];
  let sql = "SELECT * FROM clientes WHERE 1=1";
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR numero_documento ILIKE $${params.length})`;
  }
  if (activo !== undefined) {
    params.push(activo === "true");
    sql += ` AND activo = $${params.length}`;
  }
  sql += " ORDER BY nombre";
  const rows = await q(sql, params);
  const out = [];
  for (const row of rows.rows) {
    const saldo = await q(
      "SELECT coalesce(sum(saldo_pendiente::numeric),0) AS n FROM facturas WHERE cliente_id=$1 AND estado='emitida'",
      [row.id]
    );
    out.push(mapCliente(row, saldo.rows[0].n));
  }
  res.json(out);
}));

app.get("/clientes/:id", asyncHandler(async (req, res) => {
  const r = await q("SELECT * FROM clientes WHERE id=$1", [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  const saldo = await q(
    "SELECT coalesce(sum(saldo_pendiente::numeric),0) AS n FROM facturas WHERE cliente_id=$1 AND estado='emitida'",
    [req.params.id]
  );
  res.json(mapCliente(r.rows[0], saldo.rows[0].n));
}));

app.get("/clientes/:id/resumen", asyncHandler(async (req, res) => {
  const r = await q(`
    SELECT coalesce(sum(total::numeric),0) AS "totalFacturado",
           coalesce(sum(total::numeric - coalesce(saldo_pendiente::numeric,0)),0) AS "totalPagado",
           coalesce(sum(saldo_pendiente::numeric) FILTER (WHERE estado='emitida'),0) AS "saldoPendiente",
           count(*)::int AS "cantidadFacturas",
           max(fecha) AS "ultimaCompra"
    FROM facturas WHERE cliente_id=$1 AND estado != 'anulada'
  `, [req.params.id]);
  const row = r.rows[0];
  res.json({
    clienteId: Number(req.params.id),
    totalFacturado: num(row.totalFacturado),
    totalPagado: num(row.totalPagado),
    saldoPendiente: num(row.saldoPendiente),
    cantidadFacturas: row.cantidadFacturas,
    ultimaCompra: row.ultimaCompra,
  });
}));

app.post("/clientes", asyncHandler(async (req, res) => {
  const b = req.body;
  const nombre = pick(b, "nombre");
  const tipoDocumento = pick(b, "tipoDocumento", "tipo_documento") || "NIT";
  const numeroDocumento = pick(b, "numeroDocumento", "numero_documento");
  if (!nombre || !numeroDocumento) return res.status(400).json({ error: "nombre y numeroDocumento requeridos" });
  const r = await q(
    `INSERT INTO clientes (nombre,tipo_documento,numero_documento,email,telefono,direccion,ciudad,estado_cobranza,notas_cobranza)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      nombre, tipoDocumento, numeroDocumento,
      pick(b, "email") || null,
      pick(b, "telefono") || null,
      pick(b, "direccion") || null,
      pick(b, "ciudad") || null,
      pick(b, "estadoCobranza", "estado_cobranza") || "activo",
      pick(b, "notasCobranza", "notas_cobranza") || null,
    ]
  );
  res.status(201).json(mapCliente(r.rows[0], 0));
}));

app.patch("/clientes/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM clientes WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const r = await q(
    `UPDATE clientes SET nombre=$1,tipo_documento=$2,numero_documento=$3,email=$4,telefono=$5,
     direccion=$6,ciudad=$7,activo=$8,estado_cobranza=$9,notas_cobranza=$10,updated_at=now()
     WHERE id=$11 RETURNING *`,
    [
      pick(b, "nombre") ?? c.nombre,
      pick(b, "tipoDocumento", "tipo_documento") ?? c.tipo_documento,
      pick(b, "numeroDocumento", "numero_documento") ?? c.numero_documento,
      pick(b, "email") ?? c.email,
      pick(b, "telefono") ?? c.telefono,
      pick(b, "direccion") ?? c.direccion,
      pick(b, "ciudad") ?? c.ciudad,
      pick(b, "activo") ?? c.activo,
      pick(b, "estadoCobranza", "estado_cobranza") ?? c.estado_cobranza,
      pick(b, "notasCobranza", "notas_cobranza") ?? c.notas_cobranza,
      req.params.id,
    ]
  );
  res.json(mapCliente(r.rows[0]));
}));

app.delete("/clientes/:id", asyncHandler(async (req, res) => {
  await q("UPDATE clientes SET activo=false, updated_at=now() WHERE id=$1", [req.params.id]);
  res.status(204).end();
}));

// ── Proveedores ─────────────────────────────────────────────
app.get("/proveedores", asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = "SELECT * FROM proveedores WHERE 1=1";
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR numero_documento ILIKE $${params.length})`;
  }
  sql += " ORDER BY nombre";
  const r = await q(sql, params);
  res.json(r.rows.map((row) => toCamel(row)));
}));

app.post("/proveedores", asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await q(
    `INSERT INTO proveedores (nombre,tipo_documento,numero_documento,email,telefono,direccion,ciudad)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      pick(b, "nombre"),
      pick(b, "tipoDocumento", "tipo_documento") || "NIT",
      pick(b, "numeroDocumento", "numero_documento"),
      pick(b, "email") || null,
      pick(b, "telefono") || null,
      pick(b, "direccion") || null,
      pick(b, "ciudad") || null,
    ]
  );
  res.status(201).json(toCamel(r.rows[0]));
}));

app.patch("/proveedores/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM proveedores WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const r = await q(
    `UPDATE proveedores SET nombre=$1,tipo_documento=$2,numero_documento=$3,email=$4,telefono=$5,
     direccion=$6,ciudad=$7,activo=$8,updated_at=now() WHERE id=$9 RETURNING *`,
    [
      pick(b, "nombre") ?? c.nombre,
      pick(b, "tipoDocumento", "tipo_documento") ?? c.tipo_documento,
      pick(b, "numeroDocumento", "numero_documento") ?? c.numero_documento,
      pick(b, "email") ?? c.email,
      pick(b, "telefono") ?? c.telefono,
      pick(b, "direccion") ?? c.direccion,
      pick(b, "ciudad") ?? c.ciudad,
      pick(b, "activo") ?? c.activo,
      req.params.id,
    ]
  );
  res.json(toCamel(r.rows[0]));
}));

app.delete("/proveedores/:id", asyncHandler(async (req, res) => {
  await q("UPDATE proveedores SET activo=false WHERE id=$1", [req.params.id]);
  res.status(204).end();
}));

// ── Productos ───────────────────────────────────────────────
app.get("/productos", asyncHandler(async (req, res) => {
  const { search, categoria } = req.query;
  let sql = "SELECT * FROM productos WHERE 1=1";
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR codigo ILIKE $${params.length})`;
  }
  if (categoria) {
    params.push(categoria);
    sql += ` AND categoria = $${params.length}`;
  }
  sql += " ORDER BY nombre";
  res.json((await q(sql, params)).rows.map(mapProducto));
}));

app.get("/productos/stats/inventario", asyncHandler(async (_req, res) => {
  const [stats, bajo] = await Promise.all([
    q(`SELECT count(*)::int AS "totalProductos",
              coalesce(sum(stock::numeric * precio_venta::numeric),0) AS "valorInventario",
              count(distinct categoria)::int AS categorias
       FROM productos WHERE activo = true`),
    q(`SELECT count(*)::int AS n FROM productos
       WHERE activo = true AND stock_minimo IS NOT NULL AND stock::numeric <= stock_minimo::numeric`),
  ]);
  res.json({
    totalProductos: stats.rows[0].totalProductos,
    productosBajoStock: bajo.rows[0].n,
    valorInventario: num(stats.rows[0].valorInventario),
    categorias: stats.rows[0].categorias,
  });
}));

app.get("/productos/:id", asyncHandler(async (req, res) => {
  const r = await q("SELECT * FROM productos WHERE id=$1", [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(mapProducto(r.rows[0]));
}));

app.post("/productos", asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await q(
    `INSERT INTO productos (codigo,nombre,descripcion,categoria,unidad,precio_venta,precio_costo,stock,stock_minimo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      pick(b, "codigo"),
      pick(b, "nombre"),
      pick(b, "descripcion") || null,
      pick(b, "categoria") || null,
      pick(b, "unidad") || "UND",
      pick(b, "precioVenta", "precio_venta"),
      pick(b, "precioCosto", "precio_costo") ?? null,
      pick(b, "stock") ?? 0,
      pick(b, "stockMinimo", "stock_minimo") ?? null,
    ]
  );
  res.status(201).json(mapProducto(r.rows[0]));
}));

app.patch("/productos/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM productos WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const r = await q(
    `UPDATE productos SET codigo=$1,nombre=$2,descripcion=$3,categoria=$4,unidad=$5,
     precio_venta=$6,precio_costo=$7,stock=$8,stock_minimo=$9,activo=$10,updated_at=now()
     WHERE id=$11 RETURNING *`,
    [
      pick(b, "codigo") ?? c.codigo,
      pick(b, "nombre") ?? c.nombre,
      pick(b, "descripcion") ?? c.descripcion,
      pick(b, "categoria") ?? c.categoria,
      pick(b, "unidad") ?? c.unidad,
      pick(b, "precioVenta", "precio_venta") ?? c.precio_venta,
      pick(b, "precioCosto", "precio_costo") ?? c.precio_costo,
      pick(b, "stock") ?? c.stock,
      pick(b, "stockMinimo", "stock_minimo") ?? c.stock_minimo,
      pick(b, "activo") ?? c.activo,
      req.params.id,
    ]
  );
  res.json(mapProducto(r.rows[0]));
}));

app.delete("/productos/:id", asyncHandler(async (req, res) => {
  await q("UPDATE productos SET activo=false WHERE id=$1", [req.params.id]);
  res.status(204).end();
}));

// ── Facturas ────────────────────────────────────────────────
app.get("/facturas", asyncHandler(async (req, res) => {
  const { estado, clienteId, search } = req.query;
  const params = [];
  let sql = `SELECT f.*, c.nombre AS cliente_nombre
             FROM facturas f LEFT JOIN clientes c ON c.id = f.cliente_id WHERE 1=1`;
  if (estado) {
    params.push(estado);
    sql += ` AND f.estado = $${params.length}`;
  }
  if (clienteId) {
    params.push(clienteId);
    sql += ` AND f.cliente_id = $${params.length}`;
  }
  sql += " ORDER BY f.created_at DESC";
  let rows = (await q(sql, params)).rows;
  if (search) {
    const s = String(search).toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.cliente_nombre || "").toLowerCase().includes(s) ||
        (r.numero || "").toLowerCase().includes(s)
    );
  }
  res.json(
    rows.map((r) => {
      const m = mapFactura(r);
      m.clienteNombre = r.cliente_nombre || "";
      delete m.cliente_nombre;
      return m;
    })
  );
}));

app.get("/facturas/stats/resumen", asyncHandler(async (_req, res) => {
  const r = await q(`
    SELECT
      count(*) FILTER (WHERE estado='borrador')::int AS "totalBorrador",
      count(*) FILTER (WHERE estado='emitida')::int AS "totalEmitidas",
      count(*) FILTER (WHERE estado='pagada')::int AS "totalPagadas",
      count(*) FILTER (WHERE estado='anulada')::int AS "totalAnuladas",
      coalesce(sum(saldo_pendiente::numeric) FILTER (WHERE estado='emitida'),0) AS "montoPendiente",
      coalesce(sum(total::numeric) FILTER (WHERE fecha >= date_trunc('month', current_date) AND estado != 'anulada'),0) AS "montoMes"
    FROM facturas
  `);
  const row = r.rows[0];
  res.json({
    totalBorrador: row.totalBorrador,
    totalEmitidas: row.totalEmitidas,
    totalPagadas: row.totalPagadas,
    totalAnuladas: row.totalAnuladas,
    montoPendiente: num(row.montoPendiente),
    montoMes: num(row.montoMes),
  });
}));

app.get("/facturas/:id", asyncHandler(async (req, res) => {
  const f = await q(
    `SELECT f.*, c.nombre AS cliente_nombre FROM facturas f
     LEFT JOIN clientes c ON c.id=f.cliente_id WHERE f.id=$1`,
    [req.params.id]
  );
  if (!f.rows[0]) return res.status(404).json({ error: "Not found" });
  const items = await q("SELECT * FROM factura_items WHERE factura_id=$1", [req.params.id]);
  const m = mapFactura(f.rows[0]);
  m.clienteNombre = f.rows[0].cliente_nombre || "";
  m.items = items.rows.map((i) => {
    const it = toCamel(i);
    return {
      ...it,
      cantidad: num(it.cantidad),
      precioUnitario: num(it.precioUnitario),
      descuento: it.descuento != null ? num(it.descuento) : null,
      subtotal: num(it.subtotal),
    };
  });
  res.json(m);
}));

app.post("/facturas", asyncHandler(async (req, res) => {
  const b = req.body;
  const clienteId = pick(b, "clienteId", "cliente_id");
  const fecha = pick(b, "fecha");
  const fechaVencimiento = pick(b, "fechaVencimiento", "fecha_vencimiento");
  const items = pick(b, "items") || [];
  if (!clienteId || !fecha || !fechaVencimiento || !items.length) {
    return res.status(400).json({ error: "clienteId, fecha, fechaVencimiento e items requeridos" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let subtotalCalc = 0;
    for (const item of items) {
      const cant = num(pick(item, "cantidad"));
      const precio = num(pick(item, "precioUnitario", "precio_unitario"));
      const desc = num(pick(item, "descuento") || 0);
      const raw = cant * precio;
      subtotalCalc += raw - (raw * desc) / 100;
    }
    const descuentoVal = num(pick(b, "descuento") || 0);
    const subtotalFinal = subtotalCalc - descuentoVal;
    const impuesto = subtotalFinal * 0.19;
    const total = subtotalFinal + impuesto;
    const numero = pick(b, "numero") || `FV-${Date.now().toString().slice(-8)}`;
    const f = await client.query(
      `INSERT INTO facturas (numero,cliente_id,fecha,fecha_vencimiento,subtotal,descuento,impuesto,total,saldo_pendiente,estado,notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'emitida',$10) RETURNING *`,
      [numero, clienteId, fecha, fechaVencimiento, subtotalFinal, descuentoVal, impuesto, total, total, pick(b, "notas") || null]
    );
    for (const item of items) {
      const cant = num(pick(item, "cantidad"));
      const precio = num(pick(item, "precioUnitario", "precio_unitario"));
      const desc = num(pick(item, "descuento") || 0);
      const raw = cant * precio;
      await client.query(
        `INSERT INTO factura_items (factura_id,producto_id,descripcion,cantidad,precio_unitario,descuento,subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          f.rows[0].id,
          pick(item, "productoId", "producto_id") || null,
          pick(item, "descripcion"),
          cant, precio, desc, raw - (raw * desc) / 100,
        ]
      );
    }
    await client.query("COMMIT");
    const cliente = await q("SELECT nombre FROM clientes WHERE id=$1", [clienteId]);
    const m = mapFactura(f.rows[0]);
    m.clienteNombre = cliente.rows[0]?.nombre || "";
    res.status(201).json(m);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

app.patch("/facturas/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM facturas WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const estado = pick(b, "estado") ?? c.estado;
  let saldo = pick(b, "saldoPendiente", "saldo_pendiente");
  if (saldo === undefined) saldo = c.saldo_pendiente;
  if (estado === "pagada") saldo = 0;
  if (estado === "anulada") saldo = 0;
  const r = await q(
    `UPDATE facturas SET estado=$1, notas=$2, fecha_vencimiento=$3, saldo_pendiente=$4, updated_at=now()
     WHERE id=$5 RETURNING *`,
    [
      estado,
      pick(b, "notas") !== undefined ? pick(b, "notas") : c.notas,
      pick(b, "fechaVencimiento", "fecha_vencimiento") ?? c.fecha_vencimiento,
      saldo,
      req.params.id,
    ]
  );
  const cliente = await q("SELECT nombre FROM clientes WHERE id=$1", [r.rows[0].cliente_id]);
  const m = mapFactura(r.rows[0]);
  m.clienteNombre = cliente.rows[0]?.nombre || "";
  res.json(m);
}));

app.delete("/facturas/:id", asyncHandler(async (req, res) => {
  const r = await q(
    `UPDATE facturas SET estado='anulada', saldo_pendiente=0, updated_at=now() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
}));

// ── Compras ─────────────────────────────────────────────────
app.get("/compras", asyncHandler(async (_req, res) => {
  const r = await q(`
    SELECT c.*, p.nombre AS proveedor_nombre
    FROM compras c LEFT JOIN proveedores p ON p.id=c.proveedor_id
    ORDER BY c.fecha DESC
  `);
  res.json(
    r.rows.map((row) => {
      const m = toCamel(row);
      return {
        ...m,
        proveedorNombre: row.proveedor_nombre || "",
        subtotal: num(m.subtotal),
        impuesto: num(m.impuesto),
        total: num(m.total),
        saldoPendiente: m.saldoPendiente != null ? num(m.saldoPendiente) : null,
      };
    })
  );
}));

app.post("/compras", asyncHandler(async (req, res) => {
  const b = req.body;
  const proveedorId = pick(b, "proveedorId", "proveedor_id");
  const items = pick(b, "items") || [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subtotal = items.reduce(
      (s, i) => s + num(pick(i, "cantidad")) * num(pick(i, "precioUnitario", "precio_unitario")),
      0
    );
    const impuesto = subtotal * 0.19;
    const total = subtotal + impuesto;
    const numero = pick(b, "numero") || `OC-${Date.now().toString().slice(-8)}`;
    const c = await client.query(
      `INSERT INTO compras (numero,proveedor_id,fecha,fecha_vencimiento,subtotal,impuesto,total,saldo_pendiente,estado,notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        numero, proveedorId,
        pick(b, "fecha"),
        pick(b, "fechaVencimiento", "fecha_vencimiento") || null,
        subtotal, impuesto, total, total,
        pick(b, "estado") || "pendiente",
        pick(b, "notas") || null,
      ]
    );
    for (const item of items) {
      const cant = num(pick(item, "cantidad"));
      const precio = num(pick(item, "precioUnitario", "precio_unitario"));
      await client.query(
        `INSERT INTO compra_items (compra_id,descripcion,cantidad,precio_unitario,subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [c.rows[0].id, pick(item, "descripcion"), cant, precio, cant * precio]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(toCamel(c.rows[0]));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

app.patch("/compras/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM compras WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  let estado = pick(b, "estado") ?? c.estado;
  let saldo = num(c.saldo_pendiente);
  const pago = pick(b, "pago");
  if (pago !== undefined) {
    saldo = Math.max(0, saldo - num(pago));
  } else if (pick(b, "saldoPendiente", "saldo_pendiente") !== undefined) {
    saldo = num(pick(b, "saldoPendiente", "saldo_pendiente"));
  }
  if (estado === "anulada") {
    saldo = 0;
  } else if (saldo <= 0) {
    saldo = 0;
    estado = "pagada";
  }
  const r = await q(
    `UPDATE compras SET estado=$1, notas=$2, fecha_vencimiento=$3, saldo_pendiente=$4, updated_at=now()
     WHERE id=$5 RETURNING *`,
    [
      estado,
      pick(b, "notas") !== undefined ? pick(b, "notas") : c.notas,
      pick(b, "fechaVencimiento", "fecha_vencimiento") ?? c.fecha_vencimiento,
      saldo,
      req.params.id,
    ]
  );
  const m = toCamel(r.rows[0]);
  const prov = await q("SELECT nombre FROM proveedores WHERE id=$1", [r.rows[0].proveedor_id]);
  res.json({
    ...m,
    proveedorNombre: prov.rows[0]?.nombre || "",
    subtotal: num(m.subtotal),
    impuesto: num(m.impuesto),
    total: num(m.total),
    saldoPendiente: m.saldoPendiente != null ? num(m.saldoPendiente) : null,
  });
}));

app.delete("/compras/:id", asyncHandler(async (req, res) => {
  const r = await q(
    `UPDATE compras SET estado='anulada', saldo_pendiente=0, updated_at=now() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
}));

// ── Cartera ─────────────────────────────────────────────────
app.get("/cartera/cuentas-cobrar", asyncHandler(async (req, res) => {
  let where = "f.estado='emitida' AND f.saldo_pendiente::numeric > 0";
  if (req.query.vencidas === "true") where += " AND f.fecha_vencimiento < CURRENT_DATE";
  const r = await q(`
    SELECT f.id AS "facturaId", f.numero, c.nombre AS "clienteNombre",
           f.fecha_vencimiento AS "fechaVencimiento",
           f.total::numeric AS total, f.saldo_pendiente::numeric AS "saldoPendiente",
           (CURRENT_DATE - f.fecha_vencimiento::date) AS "diasVencida"
    FROM facturas f JOIN clientes c ON f.cliente_id=c.id
    WHERE ${where}
    ORDER BY f.fecha_vencimiento ASC
  `);
  res.json(r.rows.map((row) => ({
    facturaId: row.facturaId,
    numero: row.numero,
    clienteNombre: row.clienteNombre,
    fechaVencimiento: row.fechaVencimiento,
    total: num(row.total),
    saldoPendiente: num(row.saldoPendiente),
    diasVencida: Math.max(0, num(row.diasVencida) || 0),
  })));
}));

app.get("/cartera/cuentas-pagar", asyncHandler(async (req, res) => {
  let where = "c.estado IN ('pendiente','recibida') AND c.saldo_pendiente::numeric > 0";
  if (req.query.vencidas === "true") where += " AND c.fecha_vencimiento < CURRENT_DATE";
  const r = await q(`
    SELECT c.id AS "compraId", c.numero, p.nombre AS "proveedorNombre",
           c.fecha_vencimiento AS "fechaVencimiento",
           c.total::numeric AS total, c.saldo_pendiente::numeric AS "saldoPendiente",
           (CURRENT_DATE - c.fecha_vencimiento::date) AS "diasVencida"
    FROM compras c JOIN proveedores p ON c.proveedor_id=p.id
    WHERE ${where}
    ORDER BY c.fecha_vencimiento ASC
  `);
  res.json(r.rows.map((row) => ({
    compraId: row.compraId,
    numero: row.numero,
    proveedorNombre: row.proveedorNombre,
    fechaVencimiento: row.fechaVencimiento || "",
    total: num(row.total),
    saldoPendiente: num(row.saldoPendiente),
    diasVencida: Math.max(0, num(row.diasVencida) || 0),
  })));
}));

app.get("/cartera/stats", asyncHandler(async (_req, res) => {
  const [cobrar, pagar] = await Promise.all([
    q(`SELECT coalesce(sum(saldo_pendiente::numeric),0) AS total,
              coalesce(sum(saldo_pendiente::numeric) FILTER (WHERE fecha_vencimiento::date < current_date),0) AS vencidas,
              count(*)::int AS cantidad
       FROM facturas WHERE estado='emitida' AND saldo_pendiente::numeric > 0`),
    q(`SELECT coalesce(sum(saldo_pendiente::numeric),0) AS total,
              coalesce(sum(saldo_pendiente::numeric) FILTER (WHERE fecha_vencimiento::date < current_date),0) AS vencidas,
              count(*)::int AS cantidad
       FROM compras WHERE estado IN ('pendiente','recibida') AND saldo_pendiente::numeric > 0`),
  ]);
  res.json({
    totalPorCobrar: num(cobrar.rows[0].total),
    totalPorPagar: num(pagar.rows[0].total),
    vencidasPorCobrar: num(cobrar.rows[0].vencidas),
    vencidasPorPagar: num(pagar.rows[0].vencidas),
    cantidadPorCobrar: cobrar.rows[0].cantidad,
    cantidadPorPagar: pagar.rows[0].cantidad,
  });
}));

app.post("/cartera/abonos", asyncHandler(async (req, res) => {
  const b = req.body;
  const facturaId = pick(b, "facturaId", "factura_id");
  const monto = pick(b, "monto");
  const fecha = pick(b, "fecha");
  if (!facturaId || !monto || !fecha) return res.status(400).json({ error: "facturaId, monto y fecha requeridos" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ab = await client.query(
      `INSERT INTO abonos (factura_id,monto,fecha,descripcion) VALUES ($1,$2,$3,$4) RETURNING *`,
      [facturaId, monto, fecha, pick(b, "descripcion") || null]
    );
    await client.query(
      `UPDATE facturas SET saldo_pendiente = GREATEST(0, saldo_pendiente::numeric - $1::numeric),
       estado = CASE WHEN GREATEST(0, saldo_pendiente::numeric - $1::numeric) = 0 THEN 'pagada' ELSE estado END,
       updated_at=now() WHERE id=$2`,
      [monto, facturaId]
    );
    await client.query("COMMIT");
    const a = toCamel(ab.rows[0]);
    res.status(201).json({ ...a, monto: num(a.monto) });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

// ── Contabilidad ────────────────────────────────────────────
app.get("/cuentas", asyncHandler(async (req, res) => {
  const { tipo } = req.query;
  const params = [];
  let sql = "SELECT * FROM cuentas_contables WHERE 1=1";
  if (tipo) {
    params.push(tipo);
    sql += ` AND tipo = $${params.length}`;
  }
  sql += " ORDER BY codigo";
  const rows = (await q(sql, params)).rows;
  const out = [];
  for (const row of rows) {
    const bal = await q(
      `SELECT coalesce(sum(debito::numeric),0) AS d, coalesce(sum(credito::numeric),0) AS c
       FROM movimiento_lineas WHERE cuenta_id=$1`,
      [row.id]
    );
    out.push({ ...toCamel(row), saldo: num(bal.rows[0].d) - num(bal.rows[0].c) });
  }
  res.json(out);
}));

app.post("/cuentas", asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await q(
    `INSERT INTO cuentas_contables (codigo,nombre,tipo,descripcion,cuenta_padre_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      pick(b, "codigo"),
      pick(b, "nombre"),
      pick(b, "tipo"),
      pick(b, "descripcion") || null,
      pick(b, "cuentaPadreId", "cuenta_padre_id") || null,
    ]
  );
  res.status(201).json({ ...toCamel(r.rows[0]), saldo: 0 });
}));

app.patch("/cuentas/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM cuentas_contables WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const r = await q(
    `UPDATE cuentas_contables SET codigo=$1,nombre=$2,tipo=$3,descripcion=$4,activo=$5 WHERE id=$6 RETURNING *`,
    [
      pick(b, "codigo") ?? c.codigo,
      pick(b, "nombre") ?? c.nombre,
      pick(b, "tipo") ?? c.tipo,
      pick(b, "descripcion") ?? c.descripcion,
      pick(b, "activo") ?? c.activo,
      req.params.id,
    ]
  );
  res.json({ ...toCamel(r.rows[0]), saldo: null });
}));

app.delete("/cuentas/:id", asyncHandler(async (req, res) => {
  const r = await q(
    `UPDATE cuentas_contables SET activo=false WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
}));

app.get("/movimientos", asyncHandler(async (_req, res) => {
  const rows = (await q("SELECT * FROM movimientos_contables ORDER BY fecha DESC")).rows;
  const out = [];
  for (const m of rows) {
    const lineas = await q(
      `SELECT ml.*, cc.codigo AS cuenta_codigo, cc.nombre AS cuenta_nombre
       FROM movimiento_lineas ml
       LEFT JOIN cuentas_contables cc ON cc.id = ml.cuenta_id
       WHERE ml.movimiento_id=$1`,
      [m.id]
    );
    const mm = toCamel(m);
    out.push({
      ...mm,
      totalDebito: num(mm.totalDebito),
      totalCredito: num(mm.totalCredito),
      lineas: lineas.rows.map((l) => {
        const ll = toCamel(l);
        return {
          ...ll,
          cuentaCodigo: l.cuenta_codigo || "",
          cuentaNombre: l.cuenta_nombre || "",
          debito: num(ll.debito),
          credito: num(ll.credito),
        };
      }),
    });
  }
  res.json(out);
}));

app.post("/movimientos", asyncHandler(async (req, res) => {
  const b = req.body;
  const lineas = pick(b, "lineas") || [];
  const totalDebito = lineas.reduce((s, l) => s + num(pick(l, "debito") || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + num(pick(l, "credito") || 0), 0);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const mov = await client.query(
      `INSERT INTO movimientos_contables (numero,tipo,fecha,descripcion,total_debito,total_credito)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        `CB-${Date.now().toString().slice(-8)}`,
        pick(b, "tipo"),
        pick(b, "fecha"),
        pick(b, "descripcion"),
        totalDebito,
        totalCredito,
      ]
    );
    for (const l of lineas) {
      await client.query(
        `INSERT INTO movimiento_lineas (movimiento_id,cuenta_id,debito,credito,descripcion)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          mov.rows[0].id,
          pick(l, "cuentaId", "cuenta_id"),
          pick(l, "debito") || 0,
          pick(l, "credito") || 0,
          pick(l, "descripcion") || null,
        ]
      );
    }
    await client.query("COMMIT");
    const mm = toCamel(mov.rows[0]);
    res.status(201).json({ ...mm, totalDebito: num(mm.totalDebito), totalCredito: num(mm.totalCredito), lineas: [] });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

app.delete("/movimientos/:id", asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT id FROM movimientos_contables WHERE id=$1", [req.params.id]);
    if (!cur.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }
    await client.query("DELETE FROM movimiento_lineas WHERE movimiento_id=$1", [req.params.id]);
    await client.query("DELETE FROM movimientos_contables WHERE id=$1", [req.params.id]);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

app.get("/movimientos/:id", asyncHandler(async (req, res) => {
  const r = await q("SELECT * FROM movimientos_contables WHERE id=$1", [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  const lineas = await q(
    `SELECT ml.*, cc.codigo AS cuenta_codigo, cc.nombre AS cuenta_nombre
     FROM movimiento_lineas ml LEFT JOIN cuentas_contables cc ON cc.id=ml.cuenta_id
     WHERE ml.movimiento_id=$1`,
    [req.params.id]
  );
  const mm = toCamel(r.rows[0]);
  res.json({
    ...mm,
    totalDebito: num(mm.totalDebito),
    totalCredito: num(mm.totalCredito),
    lineas: lineas.rows.map((l) => {
      const ll = toCamel(l);
      return {
        ...ll,
        cuentaCodigo: l.cuenta_codigo || "",
        cuentaNombre: l.cuenta_nombre || "",
        debito: num(ll.debito),
        credito: num(ll.credito),
      };
    }),
  });
}));

// ── CRM ─────────────────────────────────────────────────────
app.get("/crm/oportunidades", asyncHandler(async (_req, res) => {
  const r = await q(`
    SELECT o.*, c.nombre AS cliente_nombre
    FROM oportunidades o JOIN clientes c ON c.id=o.cliente_id
    ORDER BY o.created_at DESC
  `);
  res.json(
    r.rows.map((row) => {
      const m = toCamel(row);
      return {
        ...m,
        clienteNombre: row.cliente_nombre,
        valor: num(m.valor),
        probabilidad: num(m.probabilidad),
      };
    })
  );
}));

app.post("/crm/oportunidades", asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await q(
    `INSERT INTO oportunidades (titulo,cliente_id,etapa,valor,probabilidad,fecha_cierre,descripcion,responsable)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      pick(b, "titulo"),
      pick(b, "clienteId", "cliente_id"),
      pick(b, "etapa") || "prospecto",
      pick(b, "valor") || 0,
      pick(b, "probabilidad") ?? 25,
      pick(b, "fechaCierre", "fecha_cierre") || null,
      pick(b, "descripcion") || null,
      pick(b, "responsable") || null,
    ]
  );
  res.status(201).json(toCamel(r.rows[0]));
}));

app.patch("/crm/oportunidades/:id", asyncHandler(async (req, res) => {
  const b = req.body;
  const cur = await q("SELECT * FROM oportunidades WHERE id=$1", [req.params.id]);
  if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
  const c = cur.rows[0];
  const r = await q(
    `UPDATE oportunidades SET titulo=$1,cliente_id=$2,etapa=$3,valor=$4,probabilidad=$5,
     fecha_cierre=$6,descripcion=$7,responsable=$8,updated_at=now() WHERE id=$9 RETURNING *`,
    [
      pick(b, "titulo") ?? c.titulo,
      pick(b, "clienteId", "cliente_id") ?? c.cliente_id,
      pick(b, "etapa") ?? c.etapa,
      pick(b, "valor") ?? c.valor,
      pick(b, "probabilidad") ?? c.probabilidad,
      pick(b, "fechaCierre", "fecha_cierre") ?? c.fecha_cierre,
      pick(b, "descripcion") ?? c.descripcion,
      pick(b, "responsable") ?? c.responsable,
      req.params.id,
    ]
  );
  res.json(toCamel(r.rows[0]));
}));

app.delete("/crm/oportunidades/:id", asyncHandler(async (req, res) => {
  const r = await q("DELETE FROM oportunidades WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
}));

app.get("/crm/stats", asyncHandler(async (_req, res) => {
  const rows = await q(
    `SELECT etapa, count(*)::int AS cantidad, coalesce(sum(valor::numeric),0) AS valor
     FROM oportunidades GROUP BY etapa`
  );
  const total = rows.rows.reduce((s, r) => s + r.cantidad, 0);
  const ganadas = rows.rows.find((r) => r.etapa === "ganada" || r.etapa === "ganado");
  const perdidas = rows.rows.find((r) => r.etapa === "perdida" || r.etapa === "perdido");
  res.json({
    totalOportunidades: total,
    valorPipeline: rows.rows.reduce((s, r) => s + num(r.valor), 0),
    ganadas: ganadas?.cantidad || 0,
    perdidas: perdidas?.cantidad || 0,
    tasaConversion: total > 0 ? Math.round(((ganadas?.cantidad || 0) / total) * 100) : 0,
    porEtapa: rows.rows.map((r) => ({ etapa: r.etapa, cantidad: r.cantidad, valor: num(r.valor) })),
  });
}));

// Fallback
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

module.exports = app;
