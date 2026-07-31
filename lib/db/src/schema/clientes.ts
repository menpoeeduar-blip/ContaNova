import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipoDocumento: text("tipo_documento").notNull().default("NIT"),
  numeroDocumento: text("numero_documento").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  direccion: text("direccion"),
  ciudad: text("ciudad"),
  activo: boolean("activo").notNull().default(true),
  estadoCobranza: text("estado_cobranza").notNull().default("activo"),
  notasCobranza: text("notas_cobranza"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
