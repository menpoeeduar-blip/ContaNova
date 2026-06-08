import { Router, type IRouter } from "express";
import { db, proveedoresTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/proveedores", async (req, res): Promise<void> => {
  const { search } = req.query;
  const rows = search && typeof search === "string"
    ? await db.select().from(proveedoresTable).where(ilike(proveedoresTable.nombre, `%${search}%`)).orderBy(proveedoresTable.nombre)
    : await db.select().from(proveedoresTable).orderBy(proveedoresTable.nombre);
  res.json(rows);
});

router.post("/proveedores", async (req, res): Promise<void> => {
  const { nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad } = req.body;
  if (!nombre || !tipoDocumento || !numeroDocumento) {
    res.status(400).json({ error: "nombre, tipoDocumento y numeroDocumento son requeridos" });
    return;
  }
  const [proveedor] = await db.insert(proveedoresTable).values({
    nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad,
  }).returning();
  res.status(201).json(proveedor);
});

router.get("/proveedores/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [proveedor] = await db.select().from(proveedoresTable).where(eq(proveedoresTable.id, id));
  if (!proveedor) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(proveedor);
});

router.patch("/proveedores/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad, activo } = req.body;
  const [proveedor] = await db.update(proveedoresTable)
    .set({ nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad, activo })
    .where(eq(proveedoresTable.id, id))
    .returning();
  if (!proveedor) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(proveedor);
});

router.delete("/proveedores/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(proveedoresTable).where(eq(proveedoresTable.id, id));
  res.sendStatus(204);
});

export default router;
