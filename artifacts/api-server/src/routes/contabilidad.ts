import { Router, type IRouter } from "express";
import { db, cuentasContablesTable, movimientosTable, movimientoLineasTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

// ─── CUENTAS ─────────────────────────────────────────────────────────────────

router.get("/cuentas", async (req, res): Promise<void> => {
  const { tipo } = req.query;
  const rows = tipo && typeof tipo === "string"
    ? await db.select().from(cuentasContablesTable).where(eq(cuentasContablesTable.tipo, tipo)).orderBy(cuentasContablesTable.codigo)
    : await db.select().from(cuentasContablesTable).orderBy(cuentasContablesTable.codigo);

  const withSaldo = await Promise.all(rows.map(async (cuenta) => {
    const debitoResult = await db.select({ total: sql<number>`coalesce(sum(debito::numeric), 0)` })
      .from(movimientoLineasTable)
      .where(eq(movimientoLineasTable.cuentaId, cuenta.id));
    const creditoResult = await db.select({ total: sql<number>`coalesce(sum(credito::numeric), 0)` })
      .from(movimientoLineasTable)
      .where(eq(movimientoLineasTable.cuentaId, cuenta.id));
    const saldo = Number(debitoResult[0]?.total ?? 0) - Number(creditoResult[0]?.total ?? 0);
    return { ...cuenta, saldo };
  }));

  res.json(withSaldo);
});

router.post("/cuentas", async (req, res): Promise<void> => {
  const { codigo, nombre, tipo, descripcion, cuentaPadreId } = req.body;
  if (!codigo || !nombre || !tipo) {
    res.status(400).json({ error: "codigo, nombre y tipo son requeridos" });
    return;
  }
  const [cuenta] = await db.insert(cuentasContablesTable).values({
    codigo, nombre, tipo, descripcion, cuentaPadreId: cuentaPadreId ?? null,
  }).returning();
  res.status(201).json({ ...cuenta, saldo: 0 });
});

router.patch("/cuentas/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { codigo, nombre, tipo, descripcion, activo } = req.body;
  const [cuenta] = await db.update(cuentasContablesTable)
    .set({ codigo, nombre, tipo, descripcion, activo })
    .where(eq(cuentasContablesTable.id, id))
    .returning();
  if (!cuenta) {
    res.status(404).json({ error: "Cuenta no encontrada" });
    return;
  }
  res.json({ ...cuenta, saldo: null });
});

router.delete("/cuentas/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(cuentasContablesTable).set({ activo: false }).where(eq(cuentasContablesTable.id, id));
  res.sendStatus(204);
});

// ─── MOVIMIENTOS ─────────────────────────────────────────────────────────────

router.get("/movimientos", async (req, res): Promise<void> => {
  const { tipo, fechaDesde, fechaHasta } = req.query;
  const conditions: any[] = [];
  if (tipo && typeof tipo === "string") conditions.push(eq(movimientosTable.tipo, tipo));
  if (fechaDesde && typeof fechaDesde === "string") conditions.push(gte(movimientosTable.fecha, fechaDesde));
  if (fechaHasta && typeof fechaHasta === "string") conditions.push(lte(movimientosTable.fecha, fechaHasta));

  const rows = conditions.length > 0
    ? await db.select().from(movimientosTable).where(and(...conditions)).orderBy(desc(movimientosTable.fecha))
    : await db.select().from(movimientosTable).orderBy(desc(movimientosTable.fecha));

  const withLineas = await Promise.all(rows.map(async (m) => {
    const lineas = await db.select({
      id: movimientoLineasTable.id,
      cuentaId: movimientoLineasTable.cuentaId,
      cuentaCodigo: cuentasContablesTable.codigo,
      cuentaNombre: cuentasContablesTable.nombre,
      debito: movimientoLineasTable.debito,
      credito: movimientoLineasTable.credito,
      descripcion: movimientoLineasTable.descripcion,
    })
      .from(movimientoLineasTable)
      .leftJoin(cuentasContablesTable, eq(movimientoLineasTable.cuentaId, cuentasContablesTable.id))
      .where(eq(movimientoLineasTable.movimientoId, m.id));
    return {
      ...m,
      totalDebito: Number(m.totalDebito),
      totalCredito: Number(m.totalCredito),
      lineas: lineas.map(l => ({
        ...l,
        cuentaCodigo: l.cuentaCodigo ?? "",
        cuentaNombre: l.cuentaNombre ?? "",
        debito: Number(l.debito),
        credito: Number(l.credito),
      })),
    };
  }));

  res.json(withLineas);
});

router.post("/movimientos", async (req, res): Promise<void> => {
  const { tipo, fecha, descripcion, lineas } = req.body;
  if (!tipo || !fecha || !descripcion || !lineas?.length) {
    res.status(400).json({ error: "tipo, fecha, descripcion y lineas son requeridos" });
    return;
  }
  const totalDebito = lineas.reduce((acc: number, l: any) => acc + Number(l.debito ?? 0), 0);
  const totalCredito = lineas.reduce((acc: number, l: any) => acc + Number(l.credito ?? 0), 0);

  const [mov] = await db.insert(movimientosTable).values({
    numero: `CB-${Date.now().toString().slice(-8)}`,
    tipo, fecha, descripcion,
    totalDebito: String(totalDebito),
    totalCredito: String(totalCredito),
  }).returning();

  await db.insert(movimientoLineasTable).values(
    lineas.map((l: any) => ({
      movimientoId: mov.id,
      cuentaId: Number(l.cuentaId),
      debito: String(l.debito ?? 0),
      credito: String(l.credito ?? 0),
      descripcion: l.descripcion ?? null,
    }))
  );

  res.status(201).json({
    ...mov,
    totalDebito: Number(mov.totalDebito),
    totalCredito: Number(mov.totalCredito),
    lineas: [],
  });
});

router.get("/movimientos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [mov] = await db.select().from(movimientosTable).where(eq(movimientosTable.id, id));
  if (!mov) {
    res.status(404).json({ error: "Movimiento no encontrado" });
    return;
  }
  const lineas = await db.select({
    id: movimientoLineasTable.id,
    cuentaId: movimientoLineasTable.cuentaId,
    cuentaCodigo: cuentasContablesTable.codigo,
    cuentaNombre: cuentasContablesTable.nombre,
    debito: movimientoLineasTable.debito,
    credito: movimientoLineasTable.credito,
    descripcion: movimientoLineasTable.descripcion,
  })
    .from(movimientoLineasTable)
    .leftJoin(cuentasContablesTable, eq(movimientoLineasTable.cuentaId, cuentasContablesTable.id))
    .where(eq(movimientoLineasTable.movimientoId, id));

  res.json({
    ...mov,
    totalDebito: Number(mov.totalDebito),
    totalCredito: Number(mov.totalCredito),
    lineas: lineas.map(l => ({
      ...l,
      cuentaCodigo: l.cuentaCodigo ?? "",
      cuentaNombre: l.cuentaNombre ?? "",
      debito: Number(l.debito),
      credito: Number(l.credito),
    })),
  });
});

router.delete("/movimientos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(movimientosTable).where(eq(movimientosTable.id, id));
  res.sendStatus(204);
});

export default router;
