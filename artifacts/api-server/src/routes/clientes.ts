import { Router, type IRouter } from "express";
import { db, clientesTable, facturasTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clientes", async (req, res): Promise<void> => {
  const { search, activo } = req.query;
  let query = db.select().from(clientesTable);
  const conditions: any[] = [];
  if (search && typeof search === "string") {
    conditions.push(ilike(clientesTable.nombre, `%${search}%`));
  }
  if (activo !== undefined) {
    conditions.push(eq(clientesTable.activo, activo === "true"));
  }
  const rows = conditions.length > 0
    ? await db.select().from(clientesTable).where(and(...conditions)).orderBy(clientesTable.nombre)
    : await db.select().from(clientesTable).orderBy(clientesTable.nombre);

  const withSaldo = await Promise.all(rows.map(async (c) => {
    const saldoResult = await db.select({ total: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)` })
      .from(facturasTable)
      .where(and(eq(facturasTable.clienteId, c.id), sql`estado IN ('emitida')`));
    return { ...c, saldoPendiente: Number(saldoResult[0]?.total ?? 0) };
  }));

  res.json(withSaldo);
});

router.post("/clientes", async (req, res): Promise<void> => {
  const { nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad } = req.body;
  if (!nombre || !tipoDocumento || !numeroDocumento) {
    res.status(400).json({ error: "nombre, tipoDocumento y numeroDocumento son requeridos" });
    return;
  }
  const [cliente] = await db.insert(clientesTable).values({
    nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad,
  }).returning();
  res.status(201).json({ ...cliente, saldoPendiente: 0 });
});

router.get("/clientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  const saldoResult = await db.select({ total: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)` })
    .from(facturasTable)
    .where(and(eq(facturasTable.clienteId, id), sql`estado IN ('emitida')`));
  res.json({ ...cliente, saldoPendiente: Number(saldoResult[0]?.total ?? 0) });
});

router.patch("/clientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad, activo, estadoCobranza, notasCobranza } = req.body;
  const [cliente] = await db.update(clientesTable)
    .set({ nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad, activo, estadoCobranza, notasCobranza })
    .where(eq(clientesTable.id, id))
    .returning();
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json({ ...cliente, saldoPendiente: null });
});

router.delete("/clientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(clientesTable).where(eq(clientesTable.id, id));
  res.sendStatus(204);
});

router.get("/clientes/:id/resumen", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const result = await db.select({
    totalFacturado: sql<number>`coalesce(sum(total::numeric), 0)`,
    totalPagado: sql<number>`coalesce(sum((total::numeric - coalesce(saldo_pendiente::numeric, 0))), 0)`,
    saldoPendiente: sql<number>`coalesce(sum(saldo_pendiente::numeric), 0)`,
    cantidadFacturas: sql<number>`count(*)::int`,
    ultimaCompra: sql<string | null>`max(fecha)`,
  }).from(facturasTable).where(and(eq(facturasTable.clienteId, id), sql`estado != 'anulada'`));

  res.json({
    clienteId: id,
    totalFacturado: Number(result[0]?.totalFacturado ?? 0),
    totalPagado: Number(result[0]?.totalPagado ?? 0),
    saldoPendiente: Number(result[0]?.saldoPendiente ?? 0),
    cantidadFacturas: Number(result[0]?.cantidadFacturas ?? 0),
    ultimaCompra: result[0]?.ultimaCompra ?? null,
  });
});

export default router;
