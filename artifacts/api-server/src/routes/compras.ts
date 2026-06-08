import { Router, type IRouter } from "express";
import { db, comprasTable, compraItemsTable, proveedoresTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

function generateNumero() {
  return `OC-${Date.now().toString().slice(-8)}`;
}

router.get("/compras", async (req, res): Promise<void> => {
  const { estado, proveedorId } = req.query;
  const conditions: any[] = [];
  if (estado && typeof estado === "string") conditions.push(eq(comprasTable.estado, estado));
  if (proveedorId) conditions.push(eq(comprasTable.proveedorId, parseInt(String(proveedorId), 10)));

  const rows = await db.select({
    id: comprasTable.id,
    numero: comprasTable.numero,
    proveedorId: comprasTable.proveedorId,
    proveedorNombre: proveedoresTable.nombre,
    fecha: comprasTable.fecha,
    fechaVencimiento: comprasTable.fechaVencimiento,
    subtotal: comprasTable.subtotal,
    impuesto: comprasTable.impuesto,
    total: comprasTable.total,
    estado: comprasTable.estado,
    notas: comprasTable.notas,
    createdAt: comprasTable.createdAt,
  })
    .from(comprasTable)
    .leftJoin(proveedoresTable, eq(comprasTable.proveedorId, proveedoresTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(comprasTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    proveedorNombre: r.proveedorNombre ?? "",
    subtotal: Number(r.subtotal),
    impuesto: Number(r.impuesto),
    total: Number(r.total),
  })));
});

router.post("/compras", async (req, res): Promise<void> => {
  const { proveedorId, fecha, fechaVencimiento, notas, items } = req.body;
  if (!proveedorId || !fecha || !items?.length) {
    res.status(400).json({ error: "proveedorId, fecha e items son requeridos" });
    return;
  }
  const subtotal = items.reduce((acc: number, item: any) => acc + Number(item.cantidad) * Number(item.precioUnitario), 0);
  const impuesto = subtotal * 0.19;
  const total = subtotal + impuesto;

  const [compra] = await db.insert(comprasTable).values({
    numero: generateNumero(),
    proveedorId: Number(proveedorId),
    fecha,
    fechaVencimiento: fechaVencimiento ?? null,
    subtotal: String(subtotal),
    impuesto: String(impuesto),
    total: String(total),
    saldoPendiente: String(total),
    estado: "pendiente",
    notas,
  }).returning();

  await db.insert(compraItemsTable).values(
    items.map((item: any) => ({
      compraId: compra.id,
      productoId: item.productoId ?? null,
      descripcion: item.descripcion,
      cantidad: String(item.cantidad),
      precioUnitario: String(item.precioUnitario),
      subtotal: String(Number(item.cantidad) * Number(item.precioUnitario)),
    }))
  );

  const proveedor = await db.select({ nombre: proveedoresTable.nombre }).from(proveedoresTable).where(eq(proveedoresTable.id, compra.proveedorId));
  res.status(201).json({
    ...compra,
    proveedorNombre: proveedor[0]?.nombre ?? "",
    subtotal: Number(compra.subtotal),
    impuesto: Number(compra.impuesto),
    total: Number(compra.total),
  });
});

router.get("/compras/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [compra] = await db.select({
    id: comprasTable.id,
    numero: comprasTable.numero,
    proveedorId: comprasTable.proveedorId,
    proveedorNombre: proveedoresTable.nombre,
    fecha: comprasTable.fecha,
    fechaVencimiento: comprasTable.fechaVencimiento,
    subtotal: comprasTable.subtotal,
    impuesto: comprasTable.impuesto,
    total: comprasTable.total,
    estado: comprasTable.estado,
    notas: comprasTable.notas,
    createdAt: comprasTable.createdAt,
  })
    .from(comprasTable)
    .leftJoin(proveedoresTable, eq(comprasTable.proveedorId, proveedoresTable.id))
    .where(eq(comprasTable.id, id));

  if (!compra) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }
  const items = await db.select().from(compraItemsTable).where(eq(compraItemsTable.compraId, id));
  res.json({
    ...compra,
    proveedorNombre: compra.proveedorNombre ?? "",
    subtotal: Number(compra.subtotal),
    impuesto: Number(compra.impuesto),
    total: Number(compra.total),
    items: items.map(i => ({
      ...i,
      cantidad: Number(i.cantidad),
      precioUnitario: Number(i.precioUnitario),
      subtotal: Number(i.subtotal),
    })),
  });
});

router.patch("/compras/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fecha, fechaVencimiento, estado, notas } = req.body;
  const [compra] = await db.update(comprasTable)
    .set({ fecha, fechaVencimiento, estado, notas })
    .where(eq(comprasTable.id, id))
    .returning();
  if (!compra) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }
  const proveedor = await db.select({ nombre: proveedoresTable.nombre }).from(proveedoresTable).where(eq(proveedoresTable.id, compra.proveedorId));
  res.json({
    ...compra,
    proveedorNombre: proveedor[0]?.nombre ?? "",
    subtotal: Number(compra.subtotal),
    impuesto: Number(compra.impuesto),
    total: Number(compra.total),
  });
});

router.delete("/compras/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(comprasTable).set({ estado: "anulada" }).where(eq(comprasTable.id, id));
  res.sendStatus(204);
});

export default router;
