import { Router, type IRouter } from "express";
import { db, oportunidadesTable, clientesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/crm/oportunidades", async (req, res): Promise<void> => {
  const { etapa } = req.query;
  const rows = await db.select({
    id: oportunidadesTable.id,
    titulo: oportunidadesTable.titulo,
    clienteId: oportunidadesTable.clienteId,
    clienteNombre: clientesTable.nombre,
    etapa: oportunidadesTable.etapa,
    valor: oportunidadesTable.valor,
    probabilidad: oportunidadesTable.probabilidad,
    fechaCierre: oportunidadesTable.fechaCierre,
    descripcion: oportunidadesTable.descripcion,
    responsable: oportunidadesTable.responsable,
    createdAt: oportunidadesTable.createdAt,
  })
    .from(oportunidadesTable)
    .leftJoin(clientesTable, eq(oportunidadesTable.clienteId, clientesTable.id))
    .where(etapa && typeof etapa === "string" ? eq(oportunidadesTable.etapa, etapa) : undefined)
    .orderBy(desc(oportunidadesTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    clienteNombre: r.clienteNombre ?? "",
    valor: Number(r.valor),
  })));
});

router.post("/crm/oportunidades", async (req, res): Promise<void> => {
  const { titulo, clienteId, etapa, valor, probabilidad, fechaCierre, descripcion, responsable } = req.body;
  if (!titulo || !clienteId || !etapa || !fechaCierre) {
    res.status(400).json({ error: "titulo, clienteId, etapa y fechaCierre son requeridos" });
    return;
  }
  const [oportunidad] = await db.insert(oportunidadesTable).values({
    titulo,
    clienteId: Number(clienteId),
    etapa,
    valor: String(valor ?? 0),
    probabilidad: Number(probabilidad ?? 25),
    fechaCierre,
    descripcion,
    responsable,
  }).returning();

  const cliente = await db.select({ nombre: clientesTable.nombre }).from(clientesTable).where(eq(clientesTable.id, oportunidad.clienteId));
  res.status(201).json({
    ...oportunidad,
    clienteNombre: cliente[0]?.nombre ?? "",
    valor: Number(oportunidad.valor),
  });
});

router.patch("/crm/oportunidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { titulo, etapa, valor, probabilidad, fechaCierre, descripcion, responsable } = req.body;
  const updateData: any = { titulo, etapa, probabilidad, fechaCierre, descripcion, responsable };
  if (valor !== undefined) updateData.valor = String(valor);
  if (probabilidad !== undefined) updateData.probabilidad = Number(probabilidad);

  const [oportunidad] = await db.update(oportunidadesTable).set(updateData).where(eq(oportunidadesTable.id, id)).returning();
  if (!oportunidad) {
    res.status(404).json({ error: "Oportunidad no encontrada" });
    return;
  }
  const cliente = await db.select({ nombre: clientesTable.nombre }).from(clientesTable).where(eq(clientesTable.id, oportunidad.clienteId));
  res.json({
    ...oportunidad,
    clienteNombre: cliente[0]?.nombre ?? "",
    valor: Number(oportunidad.valor),
  });
});

router.delete("/crm/oportunidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(oportunidadesTable).where(eq(oportunidadesTable.id, id));
  res.sendStatus(204);
});

router.get("/crm/stats", async (req, res): Promise<void> => {
  const [stats] = await db.select({
    totalOportunidades: sql<number>`count(*)::int`,
    valorPipeline: sql<number>`coalesce(sum(valor::numeric) filter (where etapa not in ('ganado','perdido')), 0)`,
    ganadas: sql<number>`count(*) filter (where etapa = 'ganado')::int`,
    perdidas: sql<number>`count(*) filter (where etapa = 'perdido')::int`,
  }).from(oportunidadesTable);

  const total = Number(stats?.totalOportunidades ?? 0);
  const ganadas = Number(stats?.ganadas ?? 0);
  const tasaConversion = total > 0 ? (ganadas / total) * 100 : 0;

  const porEtapaRows = await db.select({
    etapa: oportunidadesTable.etapa,
    cantidad: sql<number>`count(*)::int`,
    valor: sql<number>`coalesce(sum(valor::numeric), 0)`,
  }).from(oportunidadesTable).groupBy(oportunidadesTable.etapa);

  res.json({
    totalOportunidades: total,
    valorPipeline: Number(stats?.valorPipeline ?? 0),
    ganadas,
    perdidas: Number(stats?.perdidas ?? 0),
    tasaConversion,
    porEtapa: porEtapaRows.map(r => ({
      etapa: r.etapa,
      cantidad: r.cantidad,
      valor: Number(r.valor),
    })),
  });
});

export default router;
