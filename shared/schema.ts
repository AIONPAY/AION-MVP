import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  type: text("type").notNull(), // 'lock', 'transfer', 'withdrawal'
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  amount: decimal("amount", { precision: 18, scale: 18 }).notNull(),
  status: text("status").notNull(), // 'pending', 'confirmed', 'failed'
  blockNumber: integer("block_number"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const signedTransfers = pgTable("signed_transfers", {
  id: serial("id").primaryKey(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: decimal("amount", { precision: 18, scale: 18 }).notNull(),
  nonce: text("nonce").notNull().unique(),
  deadline: integer("deadline").notNull(),
  signature: text("signature").notNull(),
  executed: boolean("executed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  timestamp: true,
});

export const insertSignedTransferSchema = createInsertSchema(signedTransfers).omit({
  id: true,
  executed: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type SignedTransfer = typeof signedTransfers.$inferSelect;
export type InsertSignedTransfer = z.infer<typeof insertSignedTransferSchema>;
