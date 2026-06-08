import { pgTable, text, serial, timestamp, integer, numeric, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cuentasContablesTable = pgTable("cuentas_contables", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull(), // activo, pasivo, patrimonio, ingreso, egreso
  descripcion: text("descripcion"),
  cuentaPadreId: integer("cuenta_padre_id"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const movimientosTable = pgTable("movimientos_contables", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull(),
  tipo: text("tipo").notNull().default("comprobante"),
  fecha: date("fecha", { mode: "string" }).notNull(),
  descripcion: text("descripcion").notNull(),
  totalDebito: numeric("total_debito", { precision: 14, scale: 2 }).notNull().default("0"),
  totalCredito: numeric("total_credito", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const movimientoLineasTable = pgTable("movimiento_lineas", {
  id: serial("id").primaryKey(),
  movimientoId: integer("movimiento_id").notNull().references(() => movimientosTable.id, { onDelete: "cascade" }),
  cuentaId: integer("cuenta_id").notNull().references(() => cuentasContablesTable.id),
  debito: numeric("debito", { precision: 14, scale: 2 }).notNull().default("0"),
  credito: numeric("credito", { precision: 14, scale: 2 }).notNull().default("0"),
  descripcion: text("descripcion"),
});

export const insertCuentaContableSchema = createInsertSchema(cuentasContablesTable).omit({ id: true, createdAt: true });
export type InsertCuentaContable = z.infer<typeof insertCuentaContableSchema>;
export type CuentaContable = typeof cuentasContablesTable.$inferSelect;
