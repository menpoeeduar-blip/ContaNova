import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";

export const oportunidadesTable = pgTable("oportunidades", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  etapa: text("etapa").notNull().default("prospecto"),
  valor: numeric("valor", { precision: 14, scale: 2 }).notNull().default("0"),
  probabilidad: integer("probabilidad").notNull().default(25),
  fechaCierre: date("fecha_cierre", { mode: "string" }).notNull(),
  descripcion: text("descripcion"),
  responsable: text("responsable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOportunidadSchema = createInsertSchema(oportunidadesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOportunidad = z.infer<typeof insertOportunidadSchema>;
export type Oportunidad = typeof oportunidadesTable.$inferSelect;
