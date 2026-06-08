import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";

export const facturasTable = pgTable("facturas", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  fecha: date("fecha", { mode: "string" }).notNull(),
  fechaVencimiento: date("fecha_vencimiento", { mode: "string" }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  descuento: numeric("descuento", { precision: 14, scale: 2 }).default("0"),
  impuesto: numeric("impuesto", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  saldoPendiente: numeric("saldo_pendiente", { precision: 14, scale: 2 }).notNull().default("0"),
  estado: text("estado").notNull().default("borrador"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const facturaItemsTable = pgTable("factura_items", {
  id: serial("id").primaryKey(),
  facturaId: integer("factura_id").notNull().references(() => facturasTable.id, { onDelete: "cascade" }),
  productoId: integer("producto_id"),
  descripcion: text("descripcion").notNull(),
  cantidad: numeric("cantidad", { precision: 14, scale: 4 }).notNull(),
  precioUnitario: numeric("precio_unitario", { precision: 14, scale: 2 }).notNull(),
  descuento: numeric("descuento", { precision: 14, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

export const abonosTable = pgTable("abonos", {
  id: serial("id").primaryKey(),
  facturaId: integer("factura_id").notNull().references(() => facturasTable.id),
  monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
  fecha: date("fecha", { mode: "string" }).notNull(),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFacturaSchema = createInsertSchema(facturasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFactura = z.infer<typeof insertFacturaSchema>;
export type Factura = typeof facturasTable.$inferSelect;
export type FacturaItem = typeof facturaItemsTable.$inferSelect;
