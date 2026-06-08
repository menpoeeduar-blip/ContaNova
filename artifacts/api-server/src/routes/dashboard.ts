import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  clientesTable,
  proveedoresTable,
  productosTable,
  facturasTable,
  comprasTable,
  oportunidadesTable,
  abonosTable,
} from "@workspace/db";
import { sql, gte, and, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];

  const [
    totalClientesResult,
    totalProductosResult,
    ventasHoyResult,
    ventasMesResult,
    ventasUltimoMesResult,
    facturasPendientesResult,
    cuentasPorCobrarResult,
    cuentasPorPagarResult,
    oportunidadesResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(clientesTable).where(eq(clientesTable.activo, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(productosTable).where(eq(productosTable.activo, true)),
    db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(facturasTable).where(
      and(eq(facturasTable.fecha, todayStr), sql`estado != 'anulada'`)
    ),
    db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(facturasTable).where(
      and(gte(facturasTable.fecha, firstOfMonth), sql`estado != 'anulada'`)
    ),
    db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(facturasTable).where(
      and(gte(facturasTable.fecha, firstOfLastMonth), sql`fecha <= ${lastOfLastMonth} AND estado != 'anulada'`)
    ),
    db.select({ count: sql<number>`count(*)::int` }).from(facturasTable).where(
      sql`estado IN ('borrador', 'emitida')`
    ),
    db.select({ total: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)` }).from(facturasTable).where(
      sql`estado IN ('emitida') AND saldo_pendiente::numeric > 0`
    ),
    db.select({ total: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)` }).from(comprasTable).where(
      sql`estado IN ('recibida', 'pendiente') AND saldo_pendiente::numeric > 0`
    ),
    db.select({ count: sql<number>`count(*)::int` }).from(oportunidadesTable).where(
      sql`etapa NOT IN ('ganado', 'perdido')`
    ),
  ]);

  const ventasMes = Number(ventasMesResult[0]?.total ?? 0);
  const ventasUltimoMes = Number(ventasUltimoMesResult[0]?.total ?? 0);
  const variacion = ventasUltimoMes > 0 ? ((ventasMes - ventasUltimoMes) / ventasUltimoMes) * 100 : null;

  res.json({
    ventasHoy: Number(ventasHoyResult[0]?.total ?? 0),
    ventasMes,
    utilidadMes: ventasMes * 0.35,
    totalClientes: totalClientesResult[0]?.count ?? 0,
    totalProductos: totalProductosResult[0]?.count ?? 0,
    facturasPendientes: facturasPendientesResult[0]?.count ?? 0,
    cuentasPorCobrar: Number(cuentasPorCobrarResult[0]?.total ?? 0),
    cuentasPorPagar: Number(cuentasPorPagarResult[0]?.total ?? 0),
    oportunidadesAbiertas: oportunidadesResult[0]?.count ?? 0,
    variacionVentasMes: variacion,
  });
});

router.get("/dashboard/ventas-mensuales", async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      to_char(fecha::date, 'YYYY-MM') as mes,
      coalesce(sum(total::numeric), 0) as total,
      count(*)::int as cantidad
    FROM facturas
    WHERE estado != 'anulada'
      AND fecha >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY mes
    ORDER BY mes ASC
  `);
  res.json(result.rows.map((r: any) => ({
    mes: r.mes,
    total: Number(r.total),
    cantidad: Number(r.cantidad),
  })));
});

router.get("/dashboard/top-productos", async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      fi.producto_id as "productoId",
      fi.descripcion as nombre,
      coalesce(sum(fi.cantidad::numeric), 0) as "cantidadVendida",
      coalesce(sum(fi.subtotal::numeric), 0) as "totalVentas"
    FROM factura_items fi
    JOIN facturas f ON fi.factura_id = f.id
    WHERE f.estado != 'anulada'
    GROUP BY fi.producto_id, fi.descripcion
    ORDER BY "totalVentas" DESC
    LIMIT 8
  `);
  res.json(result.rows.map((r: any) => ({
    productoId: r.productoId ?? 0,
    nombre: r.nombre,
    cantidadVendida: Number(r.cantidadVendida),
    totalVentas: Number(r.totalVentas),
  })));
});

router.get("/dashboard/actividad-reciente", async (req, res): Promise<void> => {
  const facturas = await db.execute(sql`
    SELECT f.id, 'factura' as tipo, 
      'Factura ' || f.numero || ' - ' || c.nombre as descripcion,
      f.created_at as fecha,
      f.total::numeric as monto
    FROM facturas f
    JOIN clientes c ON f.cliente_id = c.id
    ORDER BY f.created_at DESC LIMIT 5
  `);
  const compras = await db.execute(sql`
    SELECT c.id, 'compra' as tipo,
      'Compra ' || c.numero || ' - ' || p.nombre as descripcion,
      c.created_at as fecha,
      c.total::numeric as monto
    FROM compras c
    JOIN proveedores p ON c.proveedor_id = p.id
    ORDER BY c.created_at DESC LIMIT 5
  `);

  const combined = [
    ...facturas.rows.map((r: any) => ({ id: r.id, tipo: r.tipo, descripcion: r.descripcion, fecha: r.fecha, monto: Number(r.monto) })),
    ...compras.rows.map((r: any) => ({ id: r.id, tipo: r.tipo, descripcion: r.descripcion, fecha: r.fecha, monto: Number(r.monto) })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10);

  res.json(combined);
});

router.get("/dashboard/flujo-caja", async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    WITH dias AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date as dia
    ),
    ingresos_dia AS (
      SELECT fecha::date as dia, coalesce(sum(total::numeric), 0) as monto
      FROM facturas WHERE estado != 'anulada' AND fecha >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY fecha::date
    ),
    egresos_dia AS (
      SELECT fecha::date as dia, coalesce(sum(total::numeric), 0) as monto
      FROM compras WHERE estado != 'anulada' AND fecha >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY fecha::date
    )
    SELECT
      d.dia as fecha,
      coalesce(i.monto, 0) as ingresos,
      coalesce(e.monto, 0) as egresos,
      coalesce(i.monto, 0) - coalesce(e.monto, 0) as saldo
    FROM dias d
    LEFT JOIN ingresos_dia i ON i.dia = d.dia
    LEFT JOIN egresos_dia e ON e.dia = d.dia
    ORDER BY d.dia ASC
  `);
  res.json(result.rows.map((r: any) => ({
    fecha: r.fecha,
    ingresos: Number(r.ingresos),
    egresos: Number(r.egresos),
    saldo: Number(r.saldo),
  })));
});

export default router;
