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
  txHash: text("tx_hash").unique(),
  type: text("type").notNull(), // 'lock', 'transfer', 'withdrawal'
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  amount: decimal("amount", { precision: 18, scale: 18 }).notNull(),
  status: text("status").notNull(), // 'received', 'validated', 'pending', 'confirmed', 'failed'
  blockNumber: integer("block_number"),
  gasUsed: text("gas_used"),
  gasPrice: text("gas_price"),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  submittedAt: timestamp("submitted_at"),
  confirmedAt: timestamp("confirmed_at"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const signedTransfers = pgTable("signed_transfers", {
  id: serial("id").primaryKey(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: decimal("amount", { precision: 78, scale: 18 }).notNull(),
  nonce: text("nonce").notNull().unique(),
  deadline: integer("deadline").notNull(),
  signature: text("signature").notNull(),
  contractAddress: text("contract_address").notNull(),
  tokenAddress: text("token_address"), // Optional field for ERC20 transfers
  status: text("status").notNull().default("received"), // 'received', 'validated', 'pending', 'confirmed', 'failed'
  txHash: text("tx_hash"),
  blockNumber: integer("block_number"),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  validatedAt: timestamp("validated_at"),
  submittedAt: timestamp("submitted_at"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionLogs = pgTable("transaction_logs", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id),
  signedTransferId: integer("signed_transfer_id").references(() => signedTransfers.id),
  status: text("status").notNull(),
  message: text("message"),
  metadata: text("metadata"), // JSON string for additional data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const relayerConfig = pgTable("relayer_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coinTossGames = pgTable("coin_toss_games", {
  id: serial("id").primaryKey(),
  playerAddress: text("player_address").notNull(),
  betAmount: decimal("bet_amount", { precision: 18, scale: 18 }).notNull(),
  playerChoice: text("player_choice").notNull(), // 'heads' or 'tails'
  result: text("result").notNull(), // 'heads' or 'tails'
  won: boolean("won").notNull(),
  payoutAmount: decimal("payout_amount", { precision: 18, scale: 18 }),
  payoutTxHash: text("payout_tx_hash"),
  randomSeed: text("random_seed").notNull(), // For verifiability
  timestamp: text("timestamp").notNull(), // Timestamp used in hash for verification
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  timestamp: true,
  submittedAt: true,
  confirmedAt: true,
});

export const insertSignedTransferSchema = createInsertSchema(signedTransfers).omit({
  id: true,
  status: true,
  txHash: true,
  blockNumber: true,
  retryCount: true,
  errorMessage: true,
  validatedAt: true,
  submittedAt: true,
  confirmedAt: true,
  createdAt: true,
});

export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({
  id: true,
  timestamp: true,
});

export const insertRelayerConfigSchema = createInsertSchema(relayerConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertCoinTossGameSchema = createInsertSchema(coinTossGames).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type SignedTransfer = typeof signedTransfers.$inferSelect;
export type InsertSignedTransfer = z.infer<typeof insertSignedTransferSchema>;
export type TransactionLog = typeof transactionLogs.$inferSelect;
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;
export type RelayerConfig = typeof relayerConfig.$inferSelect;
export type InsertRelayerConfig = z.infer<typeof insertRelayerConfigSchema>;
export type CoinTossGame = typeof coinTossGames.$inferSelect;
export type InsertCoinTossGame = z.infer<typeof insertCoinTossGameSchema>;
