import { Router, type IRouter } from "express";
import { db, facturasTable, facturaItemsTable, clientesTable, abonosTable } from "@workspace/db";
import { eq, and, sql, ilike, desc } from "drizzle-orm";

const router: IRouter = Router();

function generateNumero(prefix: string = "FV") {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

router.get("/facturas", async (req, res): Promise<void> => {
  const { estado, clienteId, search } = req.query;
  const conditions: any[] = [];
  if (estado && typeof estado === "string") conditions.push(eq(facturasTable.estado, estado));
  if (clienteId) conditions.push(eq(facturasTable.clienteId, parseInt(String(clienteId), 10)));

  const rows = await db.select({
    id: facturasTable.id,
    numero: facturasTable.numero,
    clienteId: facturasTable.clienteId,
    clienteNombre: clientesTable.nombre,
    fecha: facturasTable.fecha,
    fechaVencimiento: facturasTable.fechaVencimiento,
    subtotal: facturasTable.subtotal,
    descuento: facturasTable.descuento,
    impuesto: facturasTable.impuesto,
    total: facturasTable.total,
    saldoPendiente: facturasTable.saldoPendiente,
    estado: facturasTable.estado,
    notas: facturasTable.notas,
    createdAt: facturasTable.createdAt,
  })
    .from(facturasTable)
    .leftJoin(clientesTable, eq(facturasTable.clienteId, clientesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(facturasTable.createdAt));

  const filtered = search && typeof search === "string"
    ? rows.filter(r => r.clienteNombre?.toLowerCase().includes(search.toLowerCase()) || r.numero.includes(search))
    : rows;

  res.json(filtered.map(r => ({
    ...r,
    clienteNombre: r.clienteNombre ?? "",
    subtotal: Number(r.subtotal),
    descuento: r.descuento ? Number(r.descuento) : null,
    impuesto: Number(r.impuesto),
    total: Number(r.total),
    saldoPendiente: r.saldoPendiente ? Number(r.saldoPendiente) : null,
  })));
});

router.post("/facturas", async (req, res): Promise<void> => {
  const { clienteId, fecha, fechaVencimiento, descuento, notas, items } = req.body;
  if (!clienteId || !fecha || !fechaVencimiento || !items?.length) {
    res.status(400).json({ error: "clienteId, fecha, fechaVencimiento e items son requeridos" });
    return;
  }

  const subtotalCalc = items.reduce((acc: number, item: any) => {
    const itemSubtotal = Number(item.cantidad) * Number(item.precioUnitario);
    const itemDesc = item.descuento ? (itemSubtotal * Number(item.descuento)) / 100 : 0;
    return acc + itemSubtotal - itemDesc;
  }, 0);

  const descuentoVal = descuento ? Number(descuento) : 0;
  const subtotalFinal = subtotalCalc - descuentoVal;
  const impuesto = subtotalFinal * 0.19;
  const total = subtotalFinal + impuesto;

  const [factura] = await db.insert(facturasTable).values({
    numero: generateNumero("FV"),
    clienteId: Number(clienteId),
    fecha,
    fechaVencimiento,
    subtotal: String(subtotalFinal),
    descuento: String(descuentoVal),
    impuesto: String(impuesto),
    total: String(total),
    saldoPendiente: String(total),
    estado: "emitida",
    notas,
  }).returning();

  await db.insert(facturaItemsTable).values(
    items.map((item: any) => {
      const itemSubtotal = Number(item.cantidad) * Number(item.precioUnitario);
      const itemDesc = item.descuento ? (itemSubtotal * Number(item.descuento)) / 100 : 0;
      return {
        facturaId: factura.id,
        productoId: item.productoId ?? null,
        descripcion: item.descripcion,
        cantidad: String(item.cantidad),
        precioUnitario: String(item.precioUnitario),
        descuento: item.descuento ? String(item.descuento) : "0",
        subtotal: String(itemSubtotal - itemDesc),
      };
    })
  );

  const cliente = await db.select({ nombre: clientesTable.nombre }).from(clientesTable).where(eq(clientesTable.id, factura.clienteId));
  res.status(201).json({
    ...factura,
    clienteNombre: cliente[0]?.nombre ?? "",
    subtotal: Number(factura.subtotal),
    descuento: factura.descuento ? Number(factura.descuento) : null,
    impuesto: Number(factura.impuesto),
    total: Number(factura.total),
    saldoPendiente: Number(factura.saldoPendiente),
  });
});

router.get("/facturas/stats/resumen", async (req, res): Promise<void> => {
  const [stats] = await db.select({
    totalBorrador: sql<number>`count(*) filter (where estado = 'borrador')::int`,
    totalEmitidas: sql<number>`count(*) filter (where estado = 'emitida')::int`,
    totalPagadas: sql<number>`count(*) filter (where estado = 'pagada')::int`,
    totalAnuladas: sql<number>`count(*) filter (where estado = 'anulada')::int`,
    montoPendiente: sql<number>`coalesce(sum(saldo_pendiente::numeric) filter (where estado = 'emitida'), 0)`,
    montoMes: sql<number>`coalesce(sum(total::numeric) filter (where fecha >= date_trunc('month', current_date) AND estado != 'anulada'), 0)`,
  }).from(facturasTable);

  res.json({
    totalBorrador: stats?.totalBorrador ?? 0,
    totalEmitidas: stats?.totalEmitidas ?? 0,
    totalPagadas: stats?.totalPagadas ?? 0,
    totalAnuladas: stats?.totalAnuladas ?? 0,
    montoPendiente: Number(stats?.montoPendiente ?? 0),
    montoMes: Number(stats?.montoMes ?? 0),
  });
});

router.get("/facturas/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [factura] = await db.select({
    id: facturasTable.id,
    numero: facturasTable.numero,
    clienteId: facturasTable.clienteId,
    clienteNombre: clientesTable.nombre,
    fecha: facturasTable.fecha,
    fechaVencimiento: facturasTable.fechaVencimiento,
    subtotal: facturasTable.subtotal,
    descuento: facturasTable.descuento,
    impuesto: facturasTable.impuesto,
    total: facturasTable.total,
    saldoPendiente: facturasTable.saldoPendiente,
    estado: facturasTable.estado,
    notas: facturasTable.notas,
    createdAt: facturasTable.createdAt,
  })
    .from(facturasTable)
    .leftJoin(clientesTable, eq(facturasTable.clienteId, clientesTable.id))
    .where(eq(facturasTable.id, id));

  if (!factura) {
    res.status(404).json({ error: "Factura no encontrada" });
    return;
  }

  const items = await db.select().from(facturaItemsTable).where(eq(facturaItemsTable.facturaId, id));
  res.json({
    ...factura,
    clienteNombre: factura.clienteNombre ?? "",
    subtotal: Number(factura.subtotal),
    descuento: factura.descuento ? Number(factura.descuento) : null,
    impuesto: Number(factura.impuesto),
    total: Number(factura.total),
    saldoPendiente: factura.saldoPendiente ? Number(factura.saldoPendiente) : null,
    items: items.map(i => ({
      ...i,
      cantidad: Number(i.cantidad),
      precioUnitario: Number(i.precioUnitario),
      descuento: i.descuento ? Number(i.descuento) : null,
      subtotal: Number(i.subtotal),
    })),
  });
});

router.patch("/facturas/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fecha, fechaVencimiento, estado, notas } = req.body;
  const [factura] = await db.update(facturasTable)
    .set({ fecha, fechaVencimiento, estado, notas })
    .where(eq(facturasTable.id, id))
    .returning();
  if (!factura) {
    res.status(404).json({ error: "Factura no encontrada" });
    return;
  }
  const cliente = await db.select({ nombre: clientesTable.nombre }).from(clientesTable).where(eq(clientesTable.id, factura.clienteId));
  res.json({
    ...factura,
    clienteNombre: cliente[0]?.nombre ?? "",
    subtotal: Number(factura.subtotal),
    descuento: factura.descuento ? Number(factura.descuento) : null,
    impuesto: Number(factura.impuesto),
    total: Number(factura.total),
    saldoPendiente: factura.saldoPendiente ? Number(factura.saldoPendiente) : null,
  });
});

router.delete("/facturas/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(facturasTable).set({ estado: "anulada" }).where(eq(facturasTable.id, id));
  res.sendStatus(204);
});

router.post("/cartera/abonos", async (req, res): Promise<void> => {
  const { facturaId, monto, fecha, descripcion } = req.body;
  if (!facturaId || !monto || !fecha) {
    res.status(400).json({ error: "facturaId, monto y fecha son requeridos" });
    return;
  }
  const [abono] = await db.insert(abonosTable).values({
    facturaId: Number(facturaId),
    monto: String(monto),
    fecha,
    descripcion,
  }).returning();

  const [factura] = await db.select().from(facturasTable).where(eq(facturasTable.id, Number(facturaId)));
  if (factura) {
    const nuevoSaldo = Math.max(0, Number(factura.saldoPendiente) - Number(monto));
    await db.update(facturasTable).set({
      saldoPendiente: String(nuevoSaldo),
      estado: nuevoSaldo === 0 ? "pagada" : factura.estado,
    }).where(eq(facturasTable.id, Number(facturaId)));
  }

  res.status(201).json({
    ...abono,
    monto: Number(abono.monto),
  });
});

export default router;
