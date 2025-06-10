import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { TransactionQueue } from "./relayer/queue";
import { WebSocketManager } from "./relayer/websocket";
import { createRelayerRoutes } from "./relayer/routes";

// Environment variables for relayer configuration
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

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
