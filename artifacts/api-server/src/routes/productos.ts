import { Router, type IRouter } from "express";
import { db, productosTable } from "@workspace/db";
import { eq, ilike, and, sql, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/productos", async (req, res): Promise<void> => {
  const { search, categoria } = req.query;
  const conditions: any[] = [];
  if (search && typeof search === "string") conditions.push(ilike(productosTable.nombre, `%${search}%`));
  if (categoria && typeof categoria === "string") conditions.push(eq(productosTable.categoria, categoria));

  const rows = conditions.length > 0
    ? await db.select().from(productosTable).where(and(...conditions)).orderBy(productosTable.nombre)
    : await db.select().from(productosTable).orderBy(productosTable.nombre);

  res.json(rows.map(p => ({
    ...p,
    precioVenta: Number(p.precioVenta),
    precioCosto: p.precioCosto ? Number(p.precioCosto) : null,
    stock: Number(p.stock),
    stockMinimo: p.stockMinimo ? Number(p.stockMinimo) : null,
  })));
});

router.post("/productos", async (req, res): Promise<void> => {
  const { codigo, nombre, descripcion, categoria, unidad, precioVenta, precioCosto, stock, stockMinimo } = req.body;
  if (!codigo || !nombre || !precioVenta || !unidad) {
    res.status(400).json({ error: "codigo, nombre, precioVenta y unidad son requeridos" });
    return;
  }
  const [producto] = await db.insert(productosTable).values({
    codigo, nombre, descripcion, categoria, unidad,
    precioVenta: String(precioVenta),
    precioCosto: precioCosto ? String(precioCosto) : null,
    stock: String(stock ?? 0),
    stockMinimo: stockMinimo ? String(stockMinimo) : null,
  }).returning();
  res.status(201).json({
    ...producto,
    precioVenta: Number(producto.precioVenta),
    precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
    stock: Number(producto.stock),
    stockMinimo: producto.stockMinimo ? Number(producto.stockMinimo) : null,
  });
});

router.get("/productos/stats/inventario", async (req, res): Promise<void> => {
  const [stats] = await db.select({
    totalProductos: sql<number>`count(*)::int`,
    valorInventario: sql<number>`coalesce(sum(stock::numeric * precio_venta::numeric), 0)`,
    categorias: sql<number>`count(distinct categoria)::int`,
  }).from(productosTable).where(eq(productosTable.activo, true));

  const bajoStockResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(productosTable)
    .where(and(
      eq(productosTable.activo, true),
      sql`stock_minimo IS NOT NULL AND stock::numeric <= stock_minimo::numeric`
    ));

  res.json({
    totalProductos: stats?.totalProductos ?? 0,
    productosBajoStock: bajoStockResult[0]?.count ?? 0,
    valorInventario: Number(stats?.valorInventario ?? 0),
    categorias: stats?.categorias ?? 0,
  });
});

router.get("/productos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [producto] = await db.select().from(productosTable).where(eq(productosTable.id, id));
  if (!producto) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.json({
    ...producto,
    precioVenta: Number(producto.precioVenta),
    precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
    stock: Number(producto.stock),
    stockMinimo: producto.stockMinimo ? Number(producto.stockMinimo) : null,
  });
});

router.patch("/productos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { codigo, nombre, descripcion, categoria, unidad, precioVenta, precioCosto, stock, stockMinimo, activo } = req.body;
  const updateData: any = { codigo, nombre, descripcion, categoria, unidad, activo };
  if (precioVenta !== undefined) updateData.precioVenta = String(precioVenta);
  if (precioCosto !== undefined) updateData.precioCosto = String(precioCosto);
  if (stock !== undefined) updateData.stock = String(stock);
  if (stockMinimo !== undefined) updateData.stockMinimo = String(stockMinimo);

  const [producto] = await db.update(productosTable).set(updateData).where(eq(productosTable.id, id)).returning();
  if (!producto) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.json({
    ...producto,
    precioVenta: Number(producto.precioVenta),
    precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
    stock: Number(producto.stock),
    stockMinimo: producto.stockMinimo ? Number(producto.stockMinimo) : null,
  });
});

router.delete("/productos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(productosTable).set({ activo: false }).where(eq(productosTable.id, id));
  res.sendStatus(204);
});

export default router;
