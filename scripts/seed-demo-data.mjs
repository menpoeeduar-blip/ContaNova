/**
 * Script de seed: inserta datos demo realistas en Supabase
 * para mostrar el panel ContaNova completamente conectado.
 * 
 * Uso: node scripts/seed-demo-data.mjs
 */

import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.thcbpglurbxpyuwsuteu:Eduar-231192@aws-0-ca-central-1.pooler.supabase.com:6543/postgres";

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log("✅ Conectado a Supabase PostgreSQL\n");

  // ──────────────────────────────────────────────────
  // 1. LIMPIAR DATOS PREVIOS (orden por FK)
  // ──────────────────────────────────────────────────
  console.log("🧹 Limpiando datos anteriores...");
  await client.query("DELETE FROM abonos");
  await client.query("DELETE FROM factura_items");
  await client.query("DELETE FROM facturas");
  await client.query("DELETE FROM compra_items");
  await client.query("DELETE FROM compras");
  await client.query("DELETE FROM movimiento_lineas");
  await client.query("DELETE FROM movimientos_contables");
  await client.query("DELETE FROM cuentas_contables");
  await client.query("DELETE FROM oportunidades");
  await client.query("DELETE FROM clientes");
  await client.query("DELETE FROM proveedores");
  await client.query("DELETE FROM productos");
  console.log("   ✓ Tablas limpiadas\n");

  // ──────────────────────────────────────────────────
  // 2. CLIENTES
  // ──────────────────────────────────────────────────
  console.log("👥 Insertando clientes...");
  const clientesResult = await client.query(`
    INSERT INTO clientes (nombre, tipo_documento, numero_documento, email, telefono, direccion, ciudad, activo, estado_cobranza)
    VALUES
      ('Constructora Andina S.A.S',   'NIT', '900123456-1', 'pagos@constructoraandina.com', '601 3456789', 'Cra 15 #93-75',        'Bogotá',        true,  'activo'),
      ('Tech Solutions Colombia',      'NIT', '830456789-2', 'contabilidad@techsol.co',      '601 2345678', 'Cl 72 #10-34',         'Bogotá',        true,  'activo'),
      ('Distribuidora López & Hijos',  'NIT', '860789012-3', 'gerencia@lopezdist.com',       '604 5678901', 'Av El Poblado 1234',   'Medellín',      true,  'mora'),
      ('Agropecuaria La Esperanza',    'CC',  '79456123',    'info@agrolasperanza.com',       '315 6789012', 'Vereda El Roble s/n',  'Villavicencio', true,  'activo'),
      ('Inversiones Palomino SAS',     'NIT', '901234567-8', 'admin@palomino.com.co',         '602 3456789', 'Cl 40 #16-55',         'Cali',          true,  'prejuridico'),
      ('Ferretería El Tornillo',       'NIT', '812345678-5', 'compras@eltornillo.com',        '607 1234567', 'Cr 7 #15-22',          'Bucaramanga',   true,  'activo'),
      ('Supermercados Frescos SAS',    'NIT', '800987654-3', 'pagos@frescos.com.co',          '605 8765432', 'Av 6N #25-30',         'Cali',          false, 'inactivo'),
      ('Clínica San José IPS',         'NIT', '891234567-7', 'finanzas@sanjose.com',          '601 9876543', 'Tv 3 #45-67',          'Bogotá',        true,  'activo')
    RETURNING id, nombre;
  `);
  const clientes = clientesResult.rows;
  clientes.forEach(c => console.log(`   ✓ [id=${c.id}] ${c.nombre}`));

  // ──────────────────────────────────────────────────
  // 3. PROVEEDORES
  // ──────────────────────────────────────────────────
  console.log("\n🏭 Insertando proveedores...");
  const proveedoresResult = await client.query(`
    INSERT INTO proveedores (nombre, tipo_documento, numero_documento, email, telefono, direccion, ciudad, activo)
    VALUES
      ('Papelería El Punto',         'NIT', '900111222-1', 'ventas@papeleriapunto.com',  '601 1112222', 'Cl 13 #45-67',        'Bogotá',   true),
      ('Distribuidora Tech Parts',   'NIT', '830222333-2', 'info@techparts.co',          '604 2223333', 'Cr 45 #80-12',        'Medellín', true),
      ('Importaciones Global SAS',   'NIT', '860333444-3', 'import@global.com.co',       '601 3334444', 'Av 68 #22-10',        'Bogotá',   true),
      ('Suministros Industriales',   'NIT', '901444555-4', 'compras@sumin.com',          '602 4445555', 'Zona Industrial 5-22','Cali',     true),
      ('Editorial Norma Colombia',   'NIT', '800555666-5', 'editorial@norma.com.co',     '601 5556666', 'Cl 80 #10-21',        'Bogotá',   true)
    RETURNING id, nombre;
  `);
  const proveedores = proveedoresResult.rows;
  proveedores.forEach(p => console.log(`   ✓ [id=${p.id}] ${p.nombre}`));

  // ──────────────────────────────────────────────────
  // 4. PRODUCTOS / INVENTARIO
  // ──────────────────────────────────────────────────
  console.log("\n📦 Insertando productos...");
  await client.query(`
    INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, precio_venta, precio_costo, stock, stock_minimo, activo)
    VALUES
      ('SERV-CONT-001', 'Consultoría Contable Mensual',   'Servicio mensual de contabilidad',      'Servicios',    'MES', 850000,  500000,  999, 0,  true),
      ('SERV-AUDIT-001','Auditoría Financiera',            'Revisión integral de estados financ.',  'Servicios',    'UND', 3500000, 2000000, 999, 0,  true),
      ('PROD-ERP-001',  'Licencia ERP Anual',              'Licencia anual software ContaNova',     'Software',     'UND', 4200000, 2500000, 50,  5,  true),
      ('PROD-ERP-MES',  'Licencia ERP Mensual',            'Licencia mensual software ContaNova',   'Software',     'MES', 420000,  250000,  999, 0,  true),
      ('SERV-CAP-001',  'Capacitación Empresarial',        'Taller de 8 horas en sede del cliente', 'Capacitación', 'UND', 1200000, 700000,  999, 0,  true),
      ('PROD-PC-001',   'Computador Portátil i7',          'Laptop 16GB RAM 512GB SSD',             'Hardware',     'UND', 4800000, 3500000, 12,  3,  true),
      ('PROD-MONITOR',  'Monitor 27" 4K',                  'Monitor UltraHD DisplayPort',           'Hardware',     'UND', 1650000, 1100000, 8,   2,  true),
      ('PROD-PAPEL-A4', 'Papel Bond A4 Resma',             'Resma 500 hojas 75g',                   'Papelería',    'UND', 16500,   11000,   150, 20, true),
      ('PROD-TONER',    'Tóner Impresora Láser',           'Compatible HP LaserJet',                'Insumos',      'UND', 185000,  120000,  25,  5,  true),
      ('SERV-NOMINA',   'Liquidación de Nómina',           'Servicio mensual procesamiento nóm.',   'Servicios',    'MES', 650000,  380000,  999, 0,  true)
  `);
  console.log("   ✓ 10 productos creados");

  // ──────────────────────────────────────────────────
  // 5. FACTURAS
  // ──────────────────────────────────────────────────
  console.log("\n🧾 Insertando facturas...");

  const ci = (i) => clientes[i].id;

  const facturasDef = [
    { clienteIdx:0, fecha:'2025-12-01', venc:'2025-12-30', estado:'pagada',
      items:[{desc:'Consultoría Contable Diciembre 2025', qty:1, price:850000}] },
    { clienteIdx:1, fecha:'2026-01-05', venc:'2026-01-20', estado:'pagada',
      items:[{desc:'Licencia ERP Anual - ContaNova', qty:1, price:4200000}] },
    { clienteIdx:2, fecha:'2026-03-01', venc:'2026-03-31', estado:'emitida',
      items:[{desc:'Consultoría Contable Marzo 2026', qty:1, price:850000},
             {desc:'Capacitación ERP x2 sesiones',   qty:2, price:1200000}] },
    { clienteIdx:3, fecha:'2026-04-01', venc:'2026-04-30', estado:'pagada',
      items:[{desc:'Liquidación de Nómina Abril',   qty:1, price:650000},
             {desc:'Consultoría Contable Abril',    qty:1, price:850000}] },
    { clienteIdx:4, fecha:'2026-02-15', venc:'2026-03-17', estado:'emitida',
      items:[{desc:'Auditoría Financiera 2025',     qty:1, price:3500000}] },
    { clienteIdx:5, fecha:'2026-05-01', venc:'2026-05-15', estado:'emitida',
      items:[{desc:'Licencia ERP Mensual Mayo',     qty:1, price:420000},
             {desc:'Soporte técnico premium',       qty:3, price:180000}] },
    { clienteIdx:7, fecha:'2026-06-01', venc:'2026-07-01', estado:'emitida',
      items:[{desc:'Computador Portátil i7',        qty:3, price:4800000},
             {desc:'Monitor 27" 4K',               qty:3, price:1650000}] },
    { clienteIdx:0, fecha:'2026-01-15', venc:'2026-02-14', estado:'pagada',
      items:[{desc:'Consultoría Contable Enero 2026', qty:1, price:850000}] },
    { clienteIdx:1, fecha:'2026-05-10', venc:'2026-06-10', estado:'pagada',
      items:[{desc:'Capacitación ERP - 2 sesiones', qty:2, price:1200000}] },
    { clienteIdx:5, fecha:'2026-07-20', venc:'2026-08-20', estado:'emitida',
      items:[{desc:'Tóner Impresora Láser',         qty:5, price:185000},
             {desc:'Papel Bond A4 Resma',           qty:20, price:16500}] },
  ];

  for (let i = 0; i < facturasDef.length; i++) {
    const fv = facturasDef[i];
    const numero = `FV-2026-${String(i + 1).padStart(4, '0')}`;
    const subtotal = fv.items.reduce((s, it) => s + it.qty * it.price, 0);
    const impuesto = Math.round(subtotal * 0.19);
    const total = subtotal + impuesto;
    const saldo = fv.estado === 'pagada' ? 0 : total;

    const fvRes = await client.query(`
      INSERT INTO facturas (numero, cliente_id, fecha, fecha_vencimiento, subtotal, impuesto, total, saldo_pendiente, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id;
    `, [numero, ci(fv.clienteIdx), fv.fecha, fv.venc, subtotal, impuesto, total, saldo, fv.estado]);
    const fid = fvRes.rows[0].id;

    for (const item of fv.items) {
      await client.query(`
        INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, subtotal)
        VALUES ($1,$2,$3,$4,$5);
      `, [fid, item.desc, item.qty, item.price, item.qty * item.price]);
    }

    if (fv.estado === 'pagada') {
      await client.query(`
        INSERT INTO abonos (factura_id, monto, fecha, descripcion)
        VALUES ($1,$2,$3,$4);
      `, [fid, total, fv.venc, 'Pago total recibido']);
    }

    const clienteNombre = clientes[fv.clienteIdx].nombre.substring(0, 25);
    console.log(`   ✓ ${numero} [${fv.estado.toUpperCase()}] $${total.toLocaleString('es-CO')} — ${clienteNombre}`);
  }

  // ──────────────────────────────────────────────────
  // 6. COMPRAS
  // ──────────────────────────────────────────────────
  console.log("\n🛒 Insertando órdenes de compra...");
  const comprasDef = [
    { provIdx:0, fecha:'2026-06-01', venc:'2026-07-01', estado:'pagada',
      items:[{desc:'Papel Bond A4 - 200 resmas', qty:200, price:11000},
             {desc:'Bolígrafos caja x50',        qty:10,  price:18500}] },
    { provIdx:1, fecha:'2026-06-10', venc:'2026-07-10', estado:'pendiente',
      items:[{desc:'Memorias RAM DDR5 16GB',     qty:20,  price:185000},
             {desc:'Cables HDMI 2m',             qty:30,  price:25000}] },
    { provIdx:2, fecha:'2026-05-15', venc:'2026-06-15', estado:'pagada',
      items:[{desc:'Laptops HP ProBook 14"',     qty:5,   price:3200000}] },
    { provIdx:3, fecha:'2026-07-01', venc:'2026-08-01', estado:'pendiente',
      items:[{desc:'Sillas Ergonómicas',         qty:10,  price:650000},
             {desc:'Escritorios ejecutivos',     qty:5,   price:980000}] },
    { provIdx:4, fecha:'2026-04-20', venc:'2026-05-20', estado:'pagada',
      items:[{desc:'Libros contabilidad 2026',   qty:50,  price:75000}] },
  ];

  for (let i = 0; i < comprasDef.length; i++) {
    const cp = comprasDef[i];
    const numero = `OC-2026-${String(i + 1).padStart(4, '0')}`;
    const subtotal = cp.items.reduce((s, it) => s + it.qty * it.price, 0);
    const impuesto = Math.round(subtotal * 0.19);
    const total = subtotal + impuesto;
    const saldo = cp.estado === 'pagada' ? 0 : total;

    const cpRes = await client.query(`
      INSERT INTO compras (numero, proveedor_id, fecha, fecha_vencimiento, subtotal, impuesto, total, saldo_pendiente, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id;
    `, [numero, proveedores[cp.provIdx].id, cp.fecha, cp.venc, subtotal, impuesto, total, saldo, cp.estado]);
    const cpId = cpRes.rows[0].id;

    for (const item of cp.items) {
      await client.query(`
        INSERT INTO compra_items (compra_id, descripcion, cantidad, precio_unitario, subtotal)
        VALUES ($1,$2,$3,$4,$5);
      `, [cpId, item.desc, item.qty, item.price, item.qty * item.price]);
    }
    console.log(`   ✓ ${numero} [${cp.estado.toUpperCase()}] $${total.toLocaleString('es-CO')} — ${proveedores[cp.provIdx].nombre}`);
  }

  // ──────────────────────────────────────────────────
  // 7. PLAN DE CUENTAS CONTABLES
  // ──────────────────────────────────────────────────
  console.log("\n📒 Insertando plan de cuentas contables...");
  const cuentasResult = await client.query(`
    INSERT INTO cuentas_contables (codigo, nombre, tipo, activo)
    VALUES
      ('1105', 'Caja General',                        'activo',    true),
      ('1110', 'Bancos - Cuenta Corriente',            'activo',    true),
      ('1305', 'Clientes - Cuentas por Cobrar',        'activo',    true),
      ('1524', 'Equipos de Cómputo',                   'activo',    true),
      ('1536', 'Muebles y Enseres',                    'activo',    true),
      ('2205', 'Proveedores - Cuentas por Pagar',      'pasivo',    true),
      ('2365', 'IVA por Pagar',                        'pasivo',    true),
      ('2370', 'Retenciones por Pagar',                'pasivo',    true),
      ('3105', 'Capital Social',                       'patrimonio',true),
      ('3405', 'Utilidad del Ejercicio',               'patrimonio',true),
      ('4135', 'Ingresos por Servicios',               'ingreso',   true),
      ('4145', 'Ingresos por Venta de Software',       'ingreso',   true),
      ('5105', 'Gastos de Personal - Nómina',          'egreso',    true),
      ('5195', 'Gastos Generales de Administración',   'egreso',    true),
      ('5260', 'Servicios Públicos',                   'egreso',    true)
    RETURNING id, codigo;
  `);
  const cuentas = Object.fromEntries(cuentasResult.rows.map(r => [r.codigo, r.id]));
  console.log(`   ✓ ${cuentasResult.rows.length} cuentas contables creadas`);

  // ──────────────────────────────────────────────────
  // 8. MOVIMIENTOS CONTABLES (Asientos Diario)
  // ──────────────────────────────────────────────────
  console.log("\n📔 Insertando movimientos contables...");
  const movimientos = [
    { fecha:'2026-05-31', desc:'Facturación servicios mayo 2026', debito:18750000, credito:18750000,
      lineas:[ {cta:'1305', deb:18750000, cred:0}, {cta:'4135', deb:0, cred:15756302}, {cta:'2365', deb:0, cred:2993698} ] },
    { fecha:'2026-06-30', desc:'Pago nómina junio 2026', debito:8500000, credito:8500000,
      lineas:[ {cta:'5105', deb:8500000, cred:0}, {cta:'1110', deb:0, cred:8500000} ] },
    { fecha:'2026-07-01', desc:'Compra equipos cómputo proveedor Tech Parts', debito:6700000, credito:6700000,
      lineas:[ {cta:'1524', deb:5630252, cred:0}, {cta:'2365', deb:1069748, cred:0}, {cta:'2205', deb:0, cred:6700000} ] },
    { fecha:'2026-07-15', desc:'Recaudo cartera - Constructora Andina', debito:1011500, credito:1011500,
      lineas:[ {cta:'1110', deb:1011500, cred:0}, {cta:'1305', deb:0, cred:1011500} ] },
    { fecha:'2026-07-25', desc:'Pago proveedor Papelería El Punto', debito:2618500, credito:2618500,
      lineas:[ {cta:'2205', deb:2618500, cred:0}, {cta:'1110', deb:0, cred:2618500} ] },
    { fecha:'2026-07-31', desc:'Liquidación IVA bimestre may-jun 2026', debito:4200000, credito:4200000,
      lineas:[ {cta:'2365', deb:4200000, cred:0}, {cta:'1110', deb:0, cred:4200000} ] },
    { fecha:'2026-07-10', desc:'Gastos servicios públicos julio 2026', debito:850000, credito:850000,
      lineas:[ {cta:'5260', deb:850000, cred:0}, {cta:'1105', deb:0, cred:850000} ] },
    { fecha:'2026-07-20', desc:'Facturación equipos Clínica San José', debito:20216000, credito:20216000,
      lineas:[ {cta:'1305', deb:20216000, cred:0}, {cta:'4145', deb:0, cred:16987395}, {cta:'2365', deb:0, cred:3228605} ] },
  ];

  for (let i = 0; i < movimientos.length; i++) {
    const mv = movimientos[i];
    const numero = `AC-2026-${String(i + 1).padStart(4, '0')}`;
    const mvRes = await client.query(`
      INSERT INTO movimientos_contables (numero, tipo, fecha, descripcion, total_debito, total_credito)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id;
    `, [numero, 'comprobante', mv.fecha, mv.desc, mv.debito, mv.credito]);
    const mvId = mvRes.rows[0].id;

    for (const linea of mv.lineas) {
      const cuentaId = cuentas[linea.cta];
      if (cuentaId) {
        await client.query(`
          INSERT INTO movimiento_lineas (movimiento_id, cuenta_id, debito, credito)
          VALUES ($1,$2,$3,$4);
        `, [mvId, cuentaId, linea.deb, linea.cred]);
      }
    }
    console.log(`   ✓ ${numero} [${mv.fecha}] ${mv.desc.substring(0, 45)}`);
  }

  // ──────────────────────────────────────────────────
  // 9. OPORTUNIDADES CRM
  // ──────────────────────────────────────────────────
  console.log("\n🎯 Insertando oportunidades CRM...");
  await client.query(`
    INSERT INTO oportunidades (titulo, cliente_id, etapa, valor, probabilidad, fecha_cierre, descripcion, responsable)
    VALUES
      ('Renovación Licencia ERP - Constructora',     $1, 'negociacion',   4200000,  85, '2026-08-31', 'Renovación anual ERP ContaNova',           'Eduardo'),
      ('Implementación Nómina - Tech Solutions',     $2, 'propuesta',     7800000,  60, '2026-09-15', 'Módulo nómina y RR.HH.',                   'Eduardo'),
      ('Auditoría Anual - Distribuidora López',      $3, 'prospecto',     3500000,  30, '2026-10-01', 'Auditoría financiera pendiente de cobro',   'Eduardo'),
      ('Capacitación Financiera - Ferretería',       $4, 'calificacion',  2400000,  70, '2026-08-15', '2 sesiones de capacitación en ERP',        'Eduardo'),
      ('Consultoría ERP - Clínica San José',         $5, 'ganada',       12000000, 100, '2026-07-01', 'Proyecto finalizado y en producción',       'Eduardo'),
      ('Migración Contable - Agropecuaria',          $6, 'prospecto',    1800000,   20, '2026-11-30', 'Migración desde sistema legacy a ContaNova','Eduardo')
    ;
  `, [ci(0), ci(1), ci(2), ci(5), ci(7), ci(3)]);
  console.log("   ✓ 6 oportunidades CRM creadas");

  // ──────────────────────────────────────────────────
  // RESUMEN FINAL
  // ──────────────────────────────────────────────────
  const counts = await client.query(`
    SELECT 
      (SELECT count(*) FROM clientes)              AS clientes,
      (SELECT count(*) FROM proveedores)            AS proveedores,
      (SELECT count(*) FROM productos)              AS productos,
      (SELECT count(*) FROM facturas)               AS facturas,
      (SELECT count(*) FROM abonos)                 AS abonos,
      (SELECT count(*) FROM compras)                AS compras,
      (SELECT count(*) FROM cuentas_contables)      AS cuentas,
      (SELECT count(*) FROM movimientos_contables)  AS movimientos,
      (SELECT count(*) FROM oportunidades)          AS oportunidades;
  `);
  const c = counts.rows[0];

  const stats = await client.query(`
    SELECT 
      coalesce(sum(total::numeric) FILTER (WHERE estado='pagada'), 0)  AS total_cobrado,
      coalesce(sum(saldo_pendiente::numeric) FILTER (WHERE estado='emitida'), 0) AS total_pendiente,
      count(*) FILTER (WHERE estado='emitida') AS pend,
      count(*) FILTER (WHERE estado='pagada')  AS pags
    FROM facturas;
  `);
  const s = stats.rows[0];

  console.log("\n" + "═".repeat(58));
  console.log("🎉  SEED COMPLETADO EXITOSAMENTE");
  console.log("═".repeat(58));
  console.log(`  👥 Clientes:           ${c.clientes}`);
  console.log(`  🏭 Proveedores:        ${c.proveedores}`);
  console.log(`  📦 Productos:          ${c.productos}`);
  console.log(`  🧾 Facturas:           ${c.facturas} (${s.pags} pagadas / ${s.pend} pendientes)`);
  console.log(`  💰 Abonos:             ${c.abonos}`);
  console.log(`  🛒 Compras:            ${c.compras}`);
  console.log(`  📒 Cuentas contables:  ${c.cuentas}`);
  console.log(`  📔 Movimientos:        ${c.movimientos}`);
  console.log(`  🎯 Oportunidades CRM:  ${c.oportunidades}`);
  console.log("");
  console.log(`  ✅ Total cobrado:      $${Number(s.total_cobrado).toLocaleString('es-CO')} COP`);
  console.log(`  🕐 Total pendiente:    $${Number(s.total_pendiente).toLocaleString('es-CO')} COP`);
  console.log("═".repeat(58));
  console.log("");

  await client.end();
}

run().catch(async (e) => {
  console.error("\n❌ Error:", e.message);
  if (e.detail) console.error("   Detalle:", e.detail);
  await client.end().catch(() => {});
  process.exit(1);
});
