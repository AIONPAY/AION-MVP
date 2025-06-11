import { Router } from "express";
import { z } from "zod";
import { TransactionQueue } from "./queue";
import { SignedTransferMessage } from "./validator";

const signedTransferSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
  amount: z.string().refine(val => {
    try {
      const num = parseFloat(val);
      return num > 0 && !isNaN(num);
    } catch {
      return false;
    }
  }, "Invalid amount"),
  nonce: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid nonce format"),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address")
});

export function createRelayerRoutes(queue: TransactionQueue): Router {
  const router = Router();

  // Rate limiting middleware
  const rateLimitMap = new Map<string, number[]>();
  const rateLimit = (maxRequests: number, windowMs: number) => {
    return (req: any, res: any, next: any) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, []);
      }
      
      const requests = rateLimitMap.get(clientIP)!;
      const windowStart = now - windowMs;
      
      // Remove old requests
      const recentRequests = requests.filter(time => time > windowStart);
      
      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      recentRequests.push(now);
      rateLimitMap.set(clientIP, recentRequests);
      next();
    };
  };

  // Apply rate limiting: 10 requests per minute
  router.use(rateLimit(10, 60000));

  // Submit signed transfer for execution (both endpoints for compatibility)
  router.post("/submit", async (req, res) => {
    console.log("=== RELAYER: Transfer submission received ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const validation = signedTransferSchema.safeParse(req.body);
      
      if (!validation.success) {
        console.log("Validation failed:", validation.error.errors);
        return res.status(400).json({
          error: "Invalid transfer data",
          details: validation.error.errors
        });
      }

      const transfer: SignedTransferMessage = validation.data;
      console.log("Validated transfer:", transfer);
      
      const result = await queue.submitTransfer(transfer);
      console.log("Queue submission result:", result);

      if (result.success) {
        console.log(`Transfer ${result.transferId} accepted and queued`);
        res.status(201).json({
          success: true,
          transferId: result.transferId,
          message: "Transfer accepted and queued for execution"
        });
      } else {
        console.log("Queue submission failed:", result.errors);
        res.status(400).json({
          success: false,
          errors: result.errors
        });
      }
    } catch (error: any) {
      console.error("Error in transfer submission:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  router.post("/transfers", async (req, res) => {
    try {
      const validation = signedTransferSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid transfer data",
          details: validation.error.errors
        });
      }

      const transfer: SignedTransferMessage = validation.data;
      const result = await queue.submitTransfer(transfer);

      if (result.success) {
        res.status(201).json({
          success: true,
          transferId: result.transferId,
          message: "Transfer accepted and queued for execution"
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors
        });
      }
    } catch (error: any) {
      console.error("Error in transfer submission:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  // Get transfer status
  router.get("/transfers/:id", async (req, res) => {
    try {
      const transferId = parseInt(req.params.id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({
          error: "Invalid transfer ID"
        });
      }

      const transfer = await queue.getTransferStatus(transferId);
      
      if (!transfer) {
        return res.status(404).json({
          error: "Transfer not found"
        });
      }

      res.json(transfer);
    } catch (error: any) {
      console.error("Error getting transfer status:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  // Get queue statistics
  router.get("/stats", async (req, res) => {
    try {
      const stats = await queue.getQueueStats();
      
      res.json({
        queue: stats,
        processing: {
          current: queue.getCurrentExecutions(),
          max: queue.getMaxConcurrentExecutions()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error getting queue stats:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  // Health check endpoint
  router.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Admin endpoint to adjust concurrency (basic auth required)
  router.put("/admin/concurrency", (req, res) => {
    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${Buffer.from('admin:' + (process.env.ADMIN_PASSWORD || 'admin')).toString('base64')}`;
    
    if (authHeader !== expectedAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { maxConcurrent } = req.body;
    
    if (typeof maxConcurrent !== 'number' || maxConcurrent < 1 || maxConcurrent > 10) {
      return res.status(400).json({
        error: "Invalid concurrency value. Must be between 1 and 10."
      });
    }

    queue.setMaxConcurrentExecutions(maxConcurrent);
    
    res.json({
      message: "Concurrency updated",
      maxConcurrent: queue.getMaxConcurrentExecutions()
    });
  });

  return router;
}