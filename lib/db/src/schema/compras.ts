import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { proveedoresTable } from "./proveedores";

export const comprasTable = pgTable("compras", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull(),
  proveedorId: integer("proveedor_id").notNull().references(() => proveedoresTable.id),
  fecha: date("fecha", { mode: "string" }).notNull(),
  fechaVencimiento: date("fecha_vencimiento", { mode: "string" }),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  impuesto: numeric("impuesto", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  saldoPendiente: numeric("saldo_pendiente", { precision: 14, scale: 2 }).notNull().default("0"),
  estado: text("estado").notNull().default("pendiente"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const compraItemsTable = pgTable("compra_items", {
  id: serial("id").primaryKey(),
  compraId: integer("compra_id").notNull().references(() => comprasTable.id, { onDelete: "cascade" }),
  productoId: integer("producto_id"),
  descripcion: text("descripcion").notNull(),
  cantidad: numeric("cantidad", { precision: 14, scale: 4 }).notNull(),
  precioUnitario: numeric("precio_unitario", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

export const insertCompraSchema = createInsertSchema(comprasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompra = z.infer<typeof insertCompraSchema>;
export type Compra = typeof comprasTable.$inferSelect;
