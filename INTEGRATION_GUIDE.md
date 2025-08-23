# 🔧 AION Protocol Integration Guide

**Version**: 2.0  
**Contract Address**: `0x2efDbDd746b383068D6A71b91fA1431EFD6917b3`  
**Last Updated**: January 2025

This guide provides the **complete integration interface** for the AION Protocol smart contract with EIP-712 structured signatures.

> **🔥 NEW: EIP-712 Signatures** - AION now uses structured data signatures that show users **exactly what they're signing** in MetaMask instead of cryptic hex strings. This dramatically improves user experience and security.

## 📋 Contract Information

### Contract Address
```javascript
const AION_CONTRACT_ADDRESS = "0x2efDbDd746b383068D6A71b91fA1431EFD6917b3";
```

### Key Features
- ✅ **EIP-712 Structured Signatures** - Clear, readable transaction details
- ✅ **Gasless Transfers** - Users only pay for locking funds, not transfers
- ✅ **Instant Settlement** - Sub-second transfer execution via relayers
- ✅ **Withdrawal Protection** - 10-minute delay with 5-minute grace period
- ✅ **Multi-token Support** - ETH and ERC20 tokens

---

## ⚡ Quick Start with EIP-712

### Why EIP-712?
AION uses **EIP-712 structured data signatures** for better UX:
- Users see **clear transaction details** in MetaMask
- **Better security** - harder to phish users
- **Professional appearance** - looks like legitimate financial transactions
- **Domain separation** - signatures tied to specific contract

### Essential EIP-712 Components

```javascript
// Domain identifies your contract uniquely
const domain = {
    name: "AION",
    version: "1",
    chainId: 1, // or current network
    verifyingContract: "0x2efDbDd746b383068D6A71b91fA1431EFD6917b3"
};

// ETH Transfer Types
const ethTypes = {
    ETHTransfer: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "deadline", type: "uint256" }
    ]
};

// ERC20 Transfer Types
const erc20Types = {
    ERC20Transfer: [
        { name: "token", type: "address" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "deadline", type: "uint256" }
    ]
};
```

---

## 🔍 Core Functions

### 1. Lock ETH Funds

```javascript
// Lock ETH for transfers
async function lockETH(amount) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.lockFundsETH({
        value: ethers.utils.parseEther(amount)
    });
    return await tx.wait();
}
```

### 2. Create Signed ETH Transfer (EIP-712)

```javascript
async function createSignedETHTransfer(from, to, amount, signer) {
    // Generate secure nonce
    const nonce = ethers.utils.randomBytes(32);
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const amountWei = ethers.utils.parseEther(amount);
    
    // Get network info
    const network = await signer.provider.getNetwork();
    
    const domain = {
        name: "AION",
        version: "1",
        chainId: network.chainId,
        verifyingContract: AION_CONTRACT_ADDRESS
    };
    
    const types = {
        ETHTransfer: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "deadline", type: "uint256" }
        ]
    };
    
    const message = {
        from: from,
        to: to,
        amount: amountWei,
        nonce: nonce,
        deadline: deadline
    };
    
    // Sign with EIP-712
    const signature = await signer._signTypedData(domain, types, message);
    
    return {
        from, to, amount,
        nonce: ethers.utils.hexlify(nonce),
        deadline, signature,
        contractAddress: AION_CONTRACT_ADDRESS
    };
}
```

### 3. Execute Signed Transfer

```javascript
async function executeTransfer(signedMessage) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    
    const tx = await contract.executeETHTransfer(
        signedMessage.from,
        signedMessage.to,
        ethers.utils.parseEther(signedMessage.amount),
        signedMessage.nonce,
        signedMessage.deadline,
        signedMessage.signature
    );
    
    return await tx.wait();
}
```

---

## 🪙 ERC20 Token Operations

### 1. Lock ERC20 Tokens

```javascript
async function lockERC20(tokenAddress, amount, decimals) {
    // First approve the AION contract
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    
    const approveTx = await tokenContract.approve(AION_CONTRACT_ADDRESS, amountWei);
    await approveTx.wait();
    
    // Then lock the tokens
    const aionContract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const lockTx = await aionContract.lockFundsERC20(tokenAddress, amountWei);
    return await lockTx.wait();
}
```

### 2. Create Signed ERC20 Transfer (EIP-712)

```javascript
async function createSignedERC20Transfer(tokenAddress, from, to, amount, decimals, signer) {
    const nonce = ethers.utils.randomBytes(32);
    const deadline = Math.floor(Date.now() / 1000) + 300;
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    
    const network = await signer.provider.getNetwork();
    
    const domain = {
        name: "AION",
        version: "1",
        chainId: network.chainId,
        verifyingContract: AION_CONTRACT_ADDRESS
    };
    
    const types = {
        ERC20Transfer: [
            { name: "token", type: "address" },
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "deadline", type: "uint256" }
        ]
    };
    
    const message = {
        token: tokenAddress,
        from: from,
        to: to,
        amount: amountWei,
        nonce: nonce,
        deadline: deadline
    };
    
    const signature = await signer._signTypedData(domain, types, message);
    
    return {
        token: tokenAddress,
        from, to, amount,
        nonce: ethers.utils.hexlify(nonce),
        deadline, signature,
        contractAddress: AION_CONTRACT_ADDRESS
    };
}
```

---

## 📊 State Queries

### Check Balances

```javascript
// Check ETH locked balance
async function getLockedETH(userAddress) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, provider);
    const balance = await contract.lockedFundsETH(userAddress);
    return ethers.utils.formatEther(balance);
}

// Check ERC20 locked balance
async function getLockedERC20(tokenAddress, userAddress, decimals) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, provider);
    const balance = await contract.lockedFundsERC20(tokenAddress, userAddress);
    return ethers.utils.formatUnits(balance, decimals);
}
```

### Check Withdrawal Status

```javascript
async function getWithdrawalStatus(userAddress) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, provider);
    const timestamp = await contract.withdrawTimestamps(userAddress);
    
    if (timestamp.eq(0)) {
        return { hasActiveWithdrawal: false };
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const withdrawalTime = timestamp.toNumber();
    const canWithdraw = currentTime >= (withdrawalTime + 600); // 10 minutes
    const inGracePeriod = currentTime <= (withdrawalTime + 300); // 5 minutes
    
    return {
        hasActiveWithdrawal: true,
        canWithdraw,
        inGracePeriod,
        withdrawalTime
    };
}
```

---

## 🔄 Withdrawal Process

### ETH Withdrawal

```javascript
// Step 1: Initiate withdrawal
async function initiateETHWithdrawal() {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.initiateWithdrawal();
    return await tx.wait();
}

// Step 2: Execute withdrawal (after 10 minutes)
async function executeETHWithdrawal() {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.withdrawFundsETH();
    return await tx.wait();
}

// Cancel withdrawal
async function cancelETHWithdrawal() {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.cancelWithdrawal();
    return await tx.wait();
}
```

### ERC20 Withdrawal

```javascript
// Step 1: Initiate ERC20 withdrawal
async function initiateERC20Withdrawal(tokenAddress) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.initiateWithdrawalERC20(tokenAddress);
    return await tx.wait();
}

// Step 2: Execute ERC20 withdrawal (after 10 minutes)
async function executeERC20Withdrawal(tokenAddress) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
    const tx = await contract.withdrawFundsERC20(tokenAddress);
    return await tx.wait();
}
```

---

## 🛡️ Security Considerations

### Grace Period Protection
- Users have a **5-minute grace period** after initiating withdrawal
- During grace period, users can still make transfers
- After grace period, transfers are blocked until withdrawal is completed or cancelled

### Nonce Security
- Always use cryptographically secure random nonces
- Nonces prevent replay attacks
- Each signature uses a unique nonce that can only be used once

### Signature Validation
```javascript
async function validateSignature(signedMessage) {
    const contract = new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, provider);
    
    // Check deadline
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > signedMessage.deadline) {
        return { valid: false, reason: "Signature expired" };
    }
    
    // Check nonce usage
    const nonceUsed = await contract.usedNonces(signedMessage.nonce);
    if (nonceUsed) {
        return { valid: false, reason: "Nonce already used" };
    }
    
    // Check balance
    const balance = await contract.lockedFundsETH(signedMessage.from);
    const requiredAmount = ethers.utils.parseEther(signedMessage.amount);
    if (balance.lt(requiredAmount)) {
        return { valid: false, reason: "Insufficient balance" };
    }
    
    return { valid: true };
}
```

---

## ⚠️ Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"AION: SIGNATURE_EXPIRED"` | Deadline passed | Create new signature |
| `"Nonce already used"` | Replay/duplicate | Generate new nonce |
| `"Invalid sender signature"` | Wrong signature | Verify signature creation |
| `"AION: SENDER_WITHDRAWAL_LOCKOUT"` | Grace period expired | Wait or cancel withdrawal |
| `"Insufficient locked funds"` | Not enough balance | Lock more funds |

### Error Handling Pattern

```javascript
async function safeContractCall(contractFunction, ...args) {
    try {
        const tx = await contractFunction(...args);
        return await tx.wait();
    } catch (error) {
        if (error.reason) {
            throw new Error(`AION Error: ${error.reason}`);
        } else if (error.message.includes("user rejected")) {
            throw new Error("Transaction cancelled by user");
        } else {
            throw new Error("Transaction failed");
        }
    }
}
```

---

## 🚀 Integration Examples

### Complete Payment Flow

```javascript
class AIONPayment {
    constructor(contractAddress, signer) {
        this.contract = new ethers.Contract(contractAddress, AION_ABI, signer);
        this.signer = signer;
    }
    
    async payETH(to, amount) {
        // 1. Lock funds if needed
        const lockedBalance = await this.contract.lockedFundsETH(this.signer.address);
        const requiredAmount = ethers.utils.parseEther(amount);
        
        if (lockedBalance.lt(requiredAmount)) {
            const shortfall = requiredAmount.sub(lockedBalance);
            await this.contract.lockFundsETH({ value: shortfall });
        }
        
        // 2. Create signed transfer
        const signedMessage = await createSignedETHTransfer(
            this.signer.address, to, amount, this.signer
        );
        
        // 3. Execute transfer (or submit to relayer)
        return await this.executeTransfer(signedMessage);
    }
    
    async executeTransfer(signedMessage) {
        const tx = await this.contract.executeETHTransfer(
            signedMessage.from,
            signedMessage.to,
            ethers.utils.parseEther(signedMessage.amount),
            signedMessage.nonce,
            signedMessage.deadline,
            signedMessage.signature
        );
        return await tx.wait();
    }
}
```

---

## 📱 Frontend Integration

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function useAION(userAddress) {
    const [lockedBalance, setLockedBalance] = useState('0');
    const [withdrawalStatus, setWithdrawalStatus] = useState(null);
    
    useEffect(() => {
        if (!userAddress) return;
        
        async function updateStatus() {
            const balance = await getLockedETH(userAddress);
            const status = await getWithdrawalStatus(userAddress);
            
            setLockedBalance(balance);
            setWithdrawalStatus(status);
        }
        
        updateStatus();
        const interval = setInterval(updateStatus, 10000); // Update every 10s
        
        return () => clearInterval(interval);
    }, [userAddress]);
    
    return { lockedBalance, withdrawalStatus };
}
```

---

## 🔗 Additional Resources

- **Contract Address**: `0x2efDbDd746b383068D6A71b91fA1431EFD6917b3`
- **Network**: Ethereum Mainnet / Sepolia Testnet
- **EIP-712 Standard**: [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- **Support**: Check transaction logs and contract events for debugging

---

## 📚 Quick Reference

### Function Signatures
```solidity
// Core functions
function lockFundsETH() external payable
function executeETHTransfer(address from, address to, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature) external
function initiateWithdrawal() external
function withdrawFundsETH() external

// ERC20 functions  
function lockFundsERC20(address token, uint256 amount) external
function executeERC20Transfer(address token, address from, address to, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature) external

// View functions
function lockedFundsETH(address user) external view returns (uint256)
function lockedFundsERC20(address token, address user) external view returns (uint256)
function withdrawTimestamps(address user) external view returns (uint256)
function usedNonces(bytes32 nonce) external view returns (bool)
```

### Constants
```solidity
uint256 public constant WITHDRAWAL_DELAY = 10 minutes;
// Grace period: 5 minutes
```

---

*This integration guide covers the complete AION Protocol interface. For additional support or questions, refer to the contract events and transaction logs for detailed debugging information.*