import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productosTable = pgTable("productos", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  categoria: text("categoria"),
  unidad: text("unidad").notNull().default("UND"),
  precioVenta: numeric("precio_venta", { precision: 14, scale: 2 }).notNull().default("0"),
  precioCosto: numeric("precio_costo", { precision: 14, scale: 2 }),
  stock: numeric("stock", { precision: 14, scale: 4 }).notNull().default("0"),
  stockMinimo: numeric("stock_minimo", { precision: 14, scale: 4 }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductoSchema = createInsertSchema(productosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProducto = z.infer<typeof insertProductoSchema>;
export type Producto = typeof productosTable.$inferSelect;
