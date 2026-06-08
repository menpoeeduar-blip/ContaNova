import { Router, type IRouter } from "express";
import { db, facturasTable, comprasTable, clientesTable, proveedoresTable } from "@workspace/db";
import { sql, eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/cartera/cuentas-cobrar", async (req, res): Promise<void> => {
  const { vencidas } = req.query;
  let whereClause = sql`f.estado = 'emitida' AND f.saldo_pendiente::numeric > 0`;
  if (vencidas === "true") whereClause = sql`f.estado = 'emitida' AND f.saldo_pendiente::numeric > 0 AND f.fecha_vencimiento < CURRENT_DATE`;

  const result = await db.execute(sql`
    SELECT
      f.id as "facturaId",
      f.numero,
      c.nombre as "clienteNombre",
      f.fecha_vencimiento as "fechaVencimiento",
      f.total::numeric as total,
      f.saldo_pendiente::numeric as "saldoPendiente",
      (CURRENT_DATE - f.fecha_vencimiento::date) as "diasVencida"
    FROM facturas f
    JOIN clientes c ON f.cliente_id = c.id
    WHERE ${whereClause}
    ORDER BY f.fecha_vencimiento ASC
  `);

  res.json(result.rows.map((r: any) => ({
    facturaId: r.facturaId,
    numero: r.numero,
    clienteNombre: r.clienteNombre,
    fechaVencimiento: r.fechaVencimiento,
    total: Number(r.total),
    saldoPendiente: Number(r.saldoPendiente),
    diasVencida: Math.max(0, Number(r.diasVencida ?? 0)),
  })));
});

router.get("/cartera/cuentas-pagar", async (req, res): Promise<void> => {
  const { vencidas } = req.query;
  let whereClause = sql`c.estado IN ('pendiente', 'recibida') AND c.saldo_pendiente::numeric > 0`;
  if (vencidas === "true") whereClause = sql`c.estado IN ('pendiente', 'recibida') AND c.saldo_pendiente::numeric > 0 AND c.fecha_vencimiento < CURRENT_DATE`;

  const result = await db.execute(sql`
    SELECT
      c.id as "compraId",
      c.numero,
      p.nombre as "proveedorNombre",
      c.fecha_vencimiento as "fechaVencimiento",
      c.total::numeric as total,
      c.saldo_pendiente::numeric as "saldoPendiente",
      (CURRENT_DATE - c.fecha_vencimiento::date) as "diasVencida"
    FROM compras c
    JOIN proveedores p ON c.proveedor_id = p.id
    WHERE ${whereClause}
    ORDER BY c.fecha_vencimiento ASC
  `);

  res.json(result.rows.map((r: any) => ({
    compraId: r.compraId,
    numero: r.numero,
    proveedorNombre: r.proveedorNombre,
    fechaVencimiento: r.fechaVencimiento ?? "",
    total: Number(r.total),
    saldoPendiente: Number(r.saldoPendiente),
    diasVencida: Math.max(0, Number(r.diasVencida ?? 0)),
  })));
});

router.get("/cartera/stats", async (req, res): Promise<void> => {
  const [cobrarStats] = await db.select({
    totalPorCobrar: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)`,
    vencidasPorCobrar: sql<number>`coalesce(sum(saldo_pendiente::numeric) filter (where fecha_vencimiento::date < current_date), 0)`,
    cantidadPorCobrar: sql<number>`count(*)::int`,
  }).from(facturasTable).where(sql`estado = 'emitida' AND saldo_pendiente::numeric > 0`);

  const [pagarStats] = await db.select({
    totalPorPagar: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)`,
    vencidasPorPagar: sql<number>`coalesce(sum(saldo_pendiente::numeric) filter (where fecha_vencimiento::date < current_date), 0)`,
    cantidadPorPagar: sql<number>`count(*)::int`,
  }).from(comprasTable).where(sql`estado IN ('pendiente', 'recibida') AND saldo_pendiente::numeric > 0`);

  res.json({
    totalPorCobrar: Number(cobrarStats?.totalPorCobrar ?? 0),
    totalPorPagar: Number(pagarStats?.totalPorPagar ?? 0),
    vencidasPorCobrar: Number(cobrarStats?.vencidasPorCobrar ?? 0),
    vencidasPorPagar: Number(pagarStats?.vencidasPorPagar ?? 0),
    cantidadPorCobrar: cobrarStats?.cantidadPorCobrar ?? 0,
    cantidadPorPagar: pagarStats?.cantidadPorPagar ?? 0,
  });
});

export default router;
