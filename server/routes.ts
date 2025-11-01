import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { TransactionQueue } from "./relayer/queue";
import { WebSocketManager } from "./relayer/websocket";
import { createRelayerRoutes } from "./relayer/routes";
import { db } from "./db";
import { signedTransfers } from "@shared/schema";
import { eq, or, desc } from "drizzle-orm";

// Utility function to validate private key
function validatePrivateKey(privateKey: string): string {
  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Check if it's a valid hex string of correct length
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid private key format. Must be 64 hex characters.');
  }
  
  // Check if it's not all zeros
  if (cleanKey === '0'.repeat(64)) {
    throw new Error('Invalid private key. Cannot be all zeros.');
  }
  
  // Ensure it has 0x prefix
  return '0x' + cleanKey;
}

// Generate a random private key for development if none provided
function generateDevPrivateKey(): string {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(32);
  return '0x' + randomBytes.toString('hex');
}

// Environment variables for relayer configuration
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";

let RELAYER_PRIVATE_KEY: string;
try {
  if (process.env.RELAYER_PRIVATE_KEY) {
    RELAYER_PRIVATE_KEY = validatePrivateKey(process.env.RELAYER_PRIVATE_KEY);
  } else {
    // Generate a development key if none provided
    RELAYER_PRIVATE_KEY = generateDevPrivateKey();
    console.log('Warning: No RELAYER_PRIVATE_KEY provided. Generated temporary key for development.');
  }
} catch (error) {
  console.error('Private key validation failed:', error);
  // Generate a development key as fallback
  RELAYER_PRIVATE_KEY = generateDevPrivateKey();
  console.log('Using generated temporary key for development.');
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  const wsManager = new WebSocketManager(httpServer);

  // Initialize transaction queue with relayer configuration
  const transactionQueue = new TransactionQueue(
    RPC_URL,
    RELAYER_PRIVATE_KEY,
    wsManager
  );

  // Start the transaction queue processing
  transactionQueue.start();

  // Register relayer API routes
  app.use("/api/relayer", createRelayerRoutes(transactionQueue));

  // Transaction history endpoint
  app.get("/api/transactions/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Get transfers for this address (both sent and received)
      const transfers = await db
        .select({
          id: signedTransfers.id,
          fromAddress: signedTransfers.fromAddress,
          toAddress: signedTransfers.toAddress,
          amount: signedTransfers.amount,
          status: signedTransfers.status,
          txHash: signedTransfers.txHash,
          blockNumber: signedTransfers.blockNumber,
          tokenAddress: signedTransfers.tokenAddress,
          createdAt: signedTransfers.createdAt,
          confirmedAt: signedTransfers.confirmedAt
        })
        .from(signedTransfers)
        .where(
          or(
            eq(signedTransfers.fromAddress, address.toLowerCase()),
            eq(signedTransfers.toAddress, address.toLowerCase())
          )
        )
        .orderBy(desc(signedTransfers.createdAt))
        .limit(50);

      res.json({ transactions: transfers });
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ error: "Failed to fetch transaction history" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        websocket: `${wsManager.getConnectedClients()} clients connected`,
        relayer: "active"
      }
    });
  });

  // WebSocket connection info endpoint
  app.get("/api/ws-info", (req, res) => {
    res.json({
      endpoint: "/ws",
      connectedClients: wsManager.getConnectedClients(),
      availableTopics: [
        "payment_accepted",
        "payment_pending", 
        "payment_submitted",
        "payment_confirmed",
        "payment_failed"
      ]
    });
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    transactionQueue.stop();
    wsManager.close();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    transactionQueue.stop();
    wsManager.close();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  return httpServer;
}
