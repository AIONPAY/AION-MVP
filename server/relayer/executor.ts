import { ethers } from "ethers";
import { db } from "../db";
import { signedTransfers, transactionLogs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { TransferValidator, SignedTransferMessage } from "./validator";
// WebSocketManager type definition
interface WebSocketManager {
  broadcast(type: string, data: any, topic?: string): void;
  sendToTransferSubscribers(transferId: number, type: string, data: any): void;
}

const AION_CONTRACT_ADDRESS = "0x2efDbDd746b383068D6A71b91fA1431EFD6917b3";
const AION_ABI = [
  {
    "type": "function",
    "name": "executeETHTransfer",
    "constant": false,
    "payable": false,
    "inputs": [
      {"type": "address", "name": "from"},
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "amount"},
      {"type": "bytes32", "name": "nonce"},
      {"type": "uint256", "name": "deadline"},
      {"type": "bytes", "name": "signature"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "executeERC20Transfer",
    "constant": false,
    "payable": false,
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "address", "name": "from"},
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "amount"},
      {"type": "bytes32", "name": "nonce"},
      {"type": "uint256", "name": "deadline"},
      {"type": "bytes", "name": "signature"}
    ],
    "outputs": []
  }
];

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export class TransactionExecutor {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private validator: TransferValidator;
  private wsManager: WebSocketManager;
  private processingQueue: Map<number, boolean> = new Map();

  constructor(
    rpcUrl: string, 
    privateKey: string,
    wsManager: WebSocketManager
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, this.wallet);
    this.validator = new TransferValidator(rpcUrl);
    this.wsManager = wsManager;
  }

  async executeSignedTransfer(transferId: number): Promise<ExecutionResult> {
    // Prevent duplicate processing
    if (this.processingQueue.has(transferId)) {
      return { success: false, error: "Transfer already being processed" };
    }

    this.processingQueue.set(transferId, true);

    try {
      // Get transfer from database
      const [transfer] = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.id, transferId));

      if (!transfer) {
        return { success: false, error: "Transfer not found" };
      }

      if (transfer.status !== "validated") {
        return { success: false, error: `Transfer status is ${transfer.status}, expected validated` };
      }

      // Re-validate before execution
      const transferMessage: SignedTransferMessage = {
        from: transfer.fromAddress,
        to: transfer.toAddress,
        amount: transfer.amount,
        nonce: transfer.nonce,
        deadline: transfer.deadline,
        signature: transfer.signature,
        contractAddress: transfer.contractAddress,
        tokenAddress: transfer.tokenAddress || undefined,
      };

      const validation = await this.validator.validateSignedTransfer(transferMessage, transferId);
      if (!validation.isValid) {
        const errors = validation.errors.join("; ");
        
        // Check if this transfer was already executed successfully
        // This can happen due to race conditions or retries
        if (errors.includes("Nonce already used") && transfer.txHash && transfer.blockNumber) {
          console.log(`=== EXECUTOR: Transfer ${transferId} already executed successfully ===`);
          console.log(`TX Hash: ${transfer.txHash}, Block: ${transfer.blockNumber}`);
          
          // Update status to confirmed if it's not already
          if (transfer.status !== "confirmed") {
            await this.updateTransferStatus(transferId, "confirmed");
          }
          
          return { 
            success: true, 
            txHash: transfer.txHash, 
            blockNumber: transfer.blockNumber 
          };
        }
        
        // Check for non-retryable errors
        const nonRetryableErrors = ["Nonce already used", "Transfer deadline has expired"];
        const isNonRetryable = nonRetryableErrors.some(error => errors.includes(error));
        
        if (isNonRetryable) {
          // Mark as permanently failed - don't retry
          await this.updateTransferStatus(transferId, "permanently_failed", errors);
        } else {
          await this.updateTransferStatus(transferId, "failed", errors);
        }
        
        return { success: false, error: errors };
      }

      // Update status to pending
      await this.updateTransferStatus(transferId, "pending");
      this.wsManager.broadcast("payment_pending", { transferId, txHash: null });

      // Execute transaction based on transfer type
      const amountWei = ethers.utils.parseEther(transfer.amount);
      let tx: ethers.ContractTransaction;
      
      console.log(`=== EXECUTOR: Starting blockchain transaction for transfer ${transferId} ===`);
      console.log(`Transfer type: ${transfer.tokenAddress ? 'ERC20' : 'ETH'}`);
      console.log(`From: ${transfer.fromAddress}`);
      console.log(`To: ${transfer.toAddress}`);
      console.log(`Amount: ${transfer.amount} (${amountWei.toString()} wei)`);
      console.log(`Nonce: ${transfer.nonce}`);
      console.log(`Deadline: ${transfer.deadline}`);
      console.log(`Token: ${transfer.tokenAddress || 'ETH'}`);
      
      try {
        if (transfer.tokenAddress) {
          // Execute ERC20 transfer
          console.log(`=== EXECUTOR: Calling executeERC20Transfer on contract ===`);
          tx = await this.contract.executeERC20Transfer(
            transfer.tokenAddress,
            transfer.fromAddress,
            transfer.toAddress,
            amountWei,
            transfer.nonce,
            transfer.deadline,
            transfer.signature
          );
        } else {
          // Execute ETH transfer
          console.log(`=== EXECUTOR: Calling executeETHTransfer on contract ===`);
          tx = await this.contract.executeETHTransfer(
            transfer.fromAddress,
            transfer.toAddress,
            amountWei,
            transfer.nonce,
            transfer.deadline,
            transfer.signature
          );
        }
        
        console.log(`=== EXECUTOR: Transaction submitted successfully ===`);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log(`Gas limit: ${tx.gasLimit?.toString()}`);
        console.log(`Gas price: ${tx.gasPrice?.toString()}`);
      } catch (error: any) {
        console.log(`=== EXECUTOR: Transaction submission failed ===`);
        console.log(`Error: ${error.message}`);
        console.log(`Error code: ${error.code}`);
        console.log(`Error data: ${error.data}`);
        throw error;
      }

      // Update with transaction hash
      await db
        .update(signedTransfers)
        .set({ 
          txHash: tx.hash,
          submittedAt: new Date()
        })
        .where(eq(signedTransfers.id, transferId));

      this.wsManager.broadcast("payment_submitted", { 
        transferId, 
        txHash: tx.hash 
      });

      // Wait for confirmation
      console.log(`=== EXECUTOR: Waiting for transaction confirmation ===`);
      console.log(`Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      console.log(`=== EXECUTOR: Transaction receipt received ===`);
      console.log(`Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Block number: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`Effective gas price: ${receipt.effectiveGasPrice?.toString()}`);

      if (receipt.status === 1) {
        // Success
        console.log(`=== EXECUTOR: Transaction confirmed successfully ===`);
        
        await db
          .update(signedTransfers)
          .set({
            status: "confirmed",
            blockNumber: receipt.blockNumber,
            confirmedAt: new Date()
          })
          .where(eq(signedTransfers.id, transferId));

        await this.logTransferEvent(transferId, "confirmed", "Transaction confirmed", {
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });

        this.wsManager.broadcast("payment_confirmed", {
          transferId,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        });

        // Also send to specific transfer subscribers
        this.wsManager.sendToTransferSubscribers(transferId, "payment_confirmed", {
          transferId,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        });

        console.log(`=== EXECUTOR: Transfer ${transferId} completed successfully ===`);
        console.log(`Final status: CONFIRMED`);
        console.log(`Transaction hash: ${receipt.transactionHash}`);

        return {
          success: true,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        // Transaction failed
        await this.updateTransferStatus(transferId, "failed", "Transaction reverted");
        this.wsManager.broadcast("payment_failed", { 
          transferId, 
          error: "Transaction reverted" 
        });

        return { success: false, error: "Transaction reverted" };
      }

    } catch (error: any) {
      console.error(`Execution error for transfer ${transferId}:`, error);
      
      // Determine if this is a retryable error
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable) {
        // Increment retry count
        const [currentTransfer] = await db
          .select()
          .from(signedTransfers)
          .where(eq(signedTransfers.id, transferId));

        const newRetryCount = (currentTransfer?.retryCount || 0) + 1;
        const maxRetries = 3;

        if (newRetryCount <= maxRetries) {
          await db
            .update(signedTransfers)
            .set({
              retryCount: newRetryCount,
              errorMessage: error.message
            })
            .where(eq(signedTransfers.id, transferId));

          await this.logTransferEvent(transferId, "retry", `Retry ${newRetryCount}/${maxRetries}`, {
            error: error.message
          });

          // Schedule retry with exponential backoff
          const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s
          setTimeout(() => {
            this.executeSignedTransfer(transferId);
          }, delay);

          return { success: false, error: `Retrying in ${delay}ms (attempt ${newRetryCount}/${maxRetries})` };
        }
      }

      // Permanent failure
      await this.updateTransferStatus(transferId, "failed", error.message);
      this.wsManager.broadcast("payment_failed", { 
        transferId, 
        error: error.message 
      });

      return { success: false, error: error.message };

    } finally {
      this.processingQueue.delete(transferId);
    }
  }

  private async updateTransferStatus(
    transferId: number, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
    
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (status === "validated") {
      updates.validatedAt = new Date();
    } else if (status === "pending") {
      updates.submittedAt = new Date();
    } else if (status === "confirmed") {
      updates.confirmedAt = new Date();
    }

    await db
      .update(signedTransfers)
      .set(updates)
      .where(eq(signedTransfers.id, transferId));

    await this.logTransferEvent(transferId, status, errorMessage || `Status updated to ${status}`);
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

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      "network error",
      "timeout",
      "connection refused",
      "nonce too low",
      "replacement transaction underpriced",
      "insufficient funds for gas"
    ];

    const errorMessage = error.message?.toLowerCase() || "";
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  async getExecutorBalance(): Promise<string> {
    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  async getGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, "gwei");
  }
}