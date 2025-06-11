import { db } from "../db";
import { signedTransfers, transactionLogs } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { TransactionExecutor } from "./executor";
import { TransferValidator, SignedTransferMessage } from "./validator";
// WebSocketManager type definition
interface WebSocketManager {
  broadcast(type: string, data: any, topic?: string): void;
  sendToTransferSubscribers(transferId: number, type: string, data: any): void;
}

export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
}

export class TransactionQueue {
  private validator: TransferValidator;
  private executor: TransactionExecutor;
  private wsManager: WebSocketManager;
  private isProcessing = false;
  private maxConcurrentExecutions = 3;
  private currentExecutions = 0;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    rpcUrl: string,
    privateKey: string,
    wsManager: WebSocketManager
  ) {
    this.wsManager = wsManager;
    this.validator = new TransferValidator(rpcUrl);
    this.executor = new TransactionExecutor(rpcUrl, privateKey, wsManager);
  }

  public start(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log("Transaction queue started");
    
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000);

    // Initial processing
    this.processQueue();
  }

  public stop(): void {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log("Transaction queue stopped");
  }

  public async submitTransfer(transfer: SignedTransferMessage): Promise<{
    success: boolean;
    transferId?: number;
    errors?: string[];
  }> {
    console.log("=== QUEUE: Processing transfer submission ===");
    console.log("Transfer details:", {
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount,
      tokenAddress: transfer.tokenAddress || "ETH"
    });
    
    try {
      // Validate the transfer
      console.log("Validating transfer signature and conditions...");
      const validation = await this.validator.validateSignedTransfer(transfer);
      console.log("Validation result:", validation);
      
      if (!validation.isValid) {
        console.log("Transfer validation failed:", validation.errors);
        return {
          success: false,
          errors: validation.errors
        };
      }

      console.log("Transfer validation passed, storing in database...");

      // Store in database with "received" status
      const [insertedTransfer] = await db
        .insert(signedTransfers)
        .values({
          fromAddress: transfer.from,
          toAddress: transfer.to,
          amount: transfer.amount,
          nonce: transfer.nonce,
          deadline: transfer.deadline,
          signature: transfer.signature,
          contractAddress: transfer.contractAddress,
          tokenAddress: transfer.tokenAddress || null,
          status: "received"
        })
        .returning();

      console.log("Transfer stored in database with ID:", insertedTransfer.id);

      await this.logTransferEvent(
        insertedTransfer.id,
        "received",
        "Transfer received and stored"
      );

      // Immediate validation and status update
      console.log("Updating transfer status to validated...");
      await db
        .update(signedTransfers)
        .set({ 
          status: "validated",
          validatedAt: new Date()
        })
        .where(eq(signedTransfers.id, insertedTransfer.id));

      await this.logTransferEvent(
        insertedTransfer.id,
        "validated",
        "Transfer validated and queued for execution"
      );

      console.log("Transfer queued for execution with ID:", insertedTransfer.id);

      // Notify subscribers
      this.wsManager.broadcast("payment_accepted", {
        transferId: insertedTransfer.id,
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount
      });

      // Trigger immediate processing if capacity available
      if (this.currentExecutions < this.maxConcurrentExecutions) {
        setImmediate(() => this.processQueue());
      }

      return {
        success: true,
        transferId: insertedTransfer.id
      };

    } catch (error: any) {
      console.error("Error submitting transfer:", error);
      return {
        success: false,
        errors: [error.message || "Internal server error"]
      };
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isProcessing || this.currentExecutions >= this.maxConcurrentExecutions) {
      console.log(`Queue processing skipped - processing: ${this.isProcessing}, executions: ${this.currentExecutions}/${this.maxConcurrentExecutions}`);
      return;
    }

    try {
      // Get next validated transfer to process (exclude permanently failed)
      const pendingTransfers = await db
        .select()
        .from(signedTransfers)
        .where(
          and(
            eq(signedTransfers.status, "validated"),
            not(eq(signedTransfers.status, "permanently_failed"))
          )
        )
        .orderBy(signedTransfers.createdAt)
        .limit(this.maxConcurrentExecutions - this.currentExecutions);

      console.log(`=== QUEUE PROCESSING: Found ${pendingTransfers.length} validated transfers ===`);

      for (const transfer of pendingTransfers) {
        if (this.currentExecutions >= this.maxConcurrentExecutions) break;
        
        console.log(`Starting execution of transfer ${transfer.id}`);
        this.currentExecutions++;
        
        // Execute in background
        this.executeTransferAsync(transfer.id)
          .finally(() => {
            this.currentExecutions--;
            console.log(`Finished execution of transfer ${transfer.id}`);
          });
      }

      // Process retry queue
      await this.processRetryQueue();

    } catch (error) {
      console.error("Error processing queue:", error);
    }
  }

  private async executeTransferAsync(transferId: number): Promise<void> {
    try {
      await this.executor.executeSignedTransfer(transferId);
    } catch (error) {
      console.error(`Failed to execute transfer ${transferId}:`, error);
    }
  }

  private async processRetryQueue(): Promise<void> {
    const retryableTransfers = await db
      .select()
      .from(signedTransfers)
      .where(
        and(
          eq(signedTransfers.status, "failed"),
          lt(signedTransfers.retryCount, 3)
        )
      )
      .limit(5);

    for (const transfer of retryableTransfers) {
      const timeSinceLastRetry = Date.now() - transfer.createdAt.getTime();
      const retryDelay = Math.pow(2, transfer.retryCount) * 1000; // Exponential backoff
      
      if (timeSinceLastRetry >= retryDelay) {
        // Reset status to validated for retry
        await db
          .update(signedTransfers)
          .set({ status: "validated" })
          .where(eq(signedTransfers.id, transfer.id));

        await this.logTransferEvent(
          transfer.id,
          "retry_queued",
          `Queued for retry attempt ${transfer.retryCount + 1}`
        );
      }
    }
  }

  public async getQueueStats(): Promise<QueueStats> {
    try {
      const pendingCount = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.status, "validated"));

      const processingCount = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.status, "pending"));

      const failedCount = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.status, "failed"));

      const completedCount = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.status, "confirmed"));

      return {
        pending: pendingCount.length,
        processing: processingCount.length,
        failed: failedCount.length,
        completed: completedCount.length
      };
    } catch (error) {
      console.error("Error getting queue stats:", error);
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        completed: 0
      };
    }
  }

  public async getTransferStatus(transferId: number): Promise<any> {
    try {
      const [transfer] = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.id, transferId));

      if (!transfer) {
        return null;
      }

      const logs = await db
        .select()
        .from(transactionLogs)
        .where(eq(transactionLogs.signedTransferId, transferId))
        .orderBy(transactionLogs.timestamp);

      return {
        ...transfer,
        logs
      };
    } catch (error) {
      console.error("Error getting transfer status:", error);
      return null;
    }
  }

  private async logTransferEvent(
    transferId: number,
    status: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await db.insert(transactionLogs).values({
      signedTransferId: transferId,
      status,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  }

  public getCurrentExecutions(): number {
    return this.currentExecutions;
  }

  public getMaxConcurrentExecutions(): number {
    return this.maxConcurrentExecutions;
  }

  public setMaxConcurrentExecutions(max: number): void {
    this.maxConcurrentExecutions = Math.max(1, Math.min(10, max));
  }
}