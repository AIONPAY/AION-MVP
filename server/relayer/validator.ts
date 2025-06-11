import { ethers } from "ethers";
import { db } from "../db";
import { signedTransfers } from "@shared/schema";
import { eq, and, not } from "drizzle-orm";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  checks: {
    signatureValid: boolean;
    deadlineValid: boolean;
    nonceUnused: boolean;
    senderHasFunds: boolean;
    gracePeriodActive: boolean;
    amountValid: boolean;
  };
}

export interface SignedTransferMessage {
  from: string;
  to: string;
  amount: string;
  nonce: string;
  deadline: number;
  signature: string;
  contractAddress: string;
  tokenAddress?: string;
}

const AION_CONTRACT_ADDRESS = "0x146CB95D41aAD4674Ca3fA80DAA4EcBc848B4bC9";
const AION_ABI = [
  {
    "type": "function",
    "name": "lockedFundsETH",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{"type": "address"}],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "lockedFundsERC20",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{"type": "address"}, {"type": "address"}],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "withdrawTimestamps",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{"type": "address"}],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "usedNonces",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{"type": "bytes32"}],
    "outputs": [{"type": "bool"}]
  }
];

export class TransferValidator {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor(rpcUrl: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, this.provider);
  }

  async validateSignedTransfer(transfer: SignedTransferMessage, excludeTransferId?: number): Promise<ValidationResult> {
    const errors: string[] = [];
    const checks = {
      signatureValid: false,
      deadlineValid: false,
      nonceUnused: false,
      senderHasFunds: false,
      gracePeriodActive: false,
      amountValid: false,
    };

    try {
      // Validate amount format
      try {
        const amount = ethers.utils.parseEther(transfer.amount);
        checks.amountValid = amount.gt(0);
        if (!checks.amountValid) {
          errors.push("Amount must be greater than zero");
        }
      } catch (error) {
        errors.push("Invalid amount format");
      }

      // Validate deadline
      const currentTime = Math.floor(Date.now() / 1000);
      checks.deadlineValid = currentTime <= transfer.deadline;
      if (!checks.deadlineValid) {
        errors.push("Transfer deadline has expired");
      }

      // Validate signature
      try {
        const amountWei = ethers.utils.parseEther(transfer.amount);
        let messageHash: string;
        
        if (transfer.tokenAddress) {
          // ERC20 transfer signature - match frontend signature generation
          messageHash = ethers.utils.solidityKeccak256(
            ["address", "address", "address", "uint256", "bytes32", "uint256", "address"],
            [transfer.tokenAddress, transfer.from, transfer.to, amountWei, transfer.nonce, transfer.deadline, transfer.contractAddress]
          );
        } else {
          // ETH transfer signature
          messageHash = ethers.utils.solidityKeccak256(
            ["address", "address", "uint256", "bytes32", "uint256", "address"],
            [transfer.from, transfer.to, amountWei, transfer.nonce, transfer.deadline, transfer.contractAddress]
          );
        }
        
        const recoveredAddress = ethers.utils.verifyMessage(
          ethers.utils.arrayify(messageHash),
          transfer.signature
        );
        
        checks.signatureValid = recoveredAddress.toLowerCase() === transfer.from.toLowerCase();
        if (!checks.signatureValid) {
          errors.push("Invalid signature");
        }
      } catch (error: any) {
        errors.push("Signature verification failed");
      }

      // Check nonce usage in database
      console.log(`=== VALIDATOR: Checking nonce usage for: ${transfer.nonce} ===`);
      console.log(`Exclude transfer ID: ${excludeTransferId || 'none'}`);
      
      const existingTransfer = await db
        .select()
        .from(signedTransfers)
        .where(eq(signedTransfers.nonce, transfer.nonce));
      
      // Filter out current transfer if re-validating
      const relevantTransfers = excludeTransferId 
        ? existingTransfer.filter(t => t.id !== excludeTransferId)
        : existingTransfer;
      
      console.log(`Database nonce check: Found ${relevantTransfers.length} relevant transfers with this nonce (excluding ID ${excludeTransferId || 'none'})`);
      if (relevantTransfers.length > 0) {
        console.log(`Existing transfer details:`, relevantTransfers[0]);
      }
      
      checks.nonceUnused = relevantTransfers.length === 0;
      if (!checks.nonceUnused) {
        errors.push("Nonce already used");
      }

      // Check on-chain nonce usage
      try {
        console.log(`=== VALIDATOR: Checking on-chain nonce usage ===`);
        const nonceUsed = await this.contract.usedNonces(transfer.nonce);
        console.log(`On-chain nonce check result: ${nonceUsed ? 'USED' : 'UNUSED'}`);
        
        if (nonceUsed) {
          checks.nonceUnused = false;
          if (!errors.includes("Nonce already used")) {
            errors.push("Nonce already used on-chain");
          }
        }
      } catch (error: any) {
        console.log(`=== VALIDATOR: On-chain nonce check failed ===`);
        console.log(`Error: ${error.message}`);
        errors.push("Failed to check nonce status on-chain");
      }

      // Check sender balance
      try {
        const requiredAmount = ethers.utils.parseEther(transfer.amount);
        let senderBalance: ethers.BigNumber;
        
        if (transfer.tokenAddress) {
          // Check ERC20 token locked balance
          senderBalance = await this.contract.lockedFundsERC20(transfer.tokenAddress, transfer.from);
        } else {
          // Check ETH locked balance
          senderBalance = await this.contract.lockedFundsETH(transfer.from);
        }
        
        checks.senderHasFunds = senderBalance.gte(requiredAmount);
        if (!checks.senderHasFunds) {
          errors.push("Insufficient locked funds");
        }
      } catch (error) {
        errors.push("Failed to check sender balance");
      }

      // Check grace period status
      try {
        const withdrawalTimestamp = await this.contract.withdrawTimestamps(transfer.from);
        
        if (withdrawalTimestamp.gt(0)) {
          const withdrawalTime = withdrawalTimestamp.toNumber();
          const gracePeriodEnd = withdrawalTime + 300; // 5 minutes
          checks.gracePeriodActive = currentTime <= gracePeriodEnd;
          
          if (!checks.gracePeriodActive) {
            errors.push("Sender is in withdrawal lockout period");
          }
        } else {
          checks.gracePeriodActive = true; // No active withdrawal
        }
      } catch (error: any) {
        errors.push("Failed to check grace period status");
      }

    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }

    const isValid = Object.values(checks).every(Boolean) && errors.length === 0;

    return {
      isValid,
      errors,
      checks,
    };
  }

  async estimateGas(transfer: SignedTransferMessage): Promise<{
    gasLimit: ethers.BigNumber;
    gasPrice: ethers.BigNumber;
    estimatedCost: ethers.BigNumber;
  }> {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(110).div(100); // 10% buffer
      
      // Estimate gas for executeETHTransfer call
      const gasLimit = ethers.BigNumber.from("200000"); // Conservative estimate
      const estimatedCost = gasLimit.mul(adjustedGasPrice);

      return {
        gasLimit,
        gasPrice: adjustedGasPrice,
        estimatedCost,
      };
    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }
}