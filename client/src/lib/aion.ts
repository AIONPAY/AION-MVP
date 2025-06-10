import { ethers } from "ethers";
import { getSigner, getProvider } from "./web3";

// Contract configuration from attached assets
export const AION_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const AION_ABI = [
  {
    "type": "constructor",
    "payable": false,
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [{"type": "uint256", "name": "length"}]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [{"type": "bytes32", "name": "s"}]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsLockedETH",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsTransferred",
    "inputs": [
      {"type": "address", "name": "from", "indexed": true},
      {"type": "address", "name": "to", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WithdrawalInitiated",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsWithdrawn",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WithdrawalCancelled",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "function",
    "name": "WITHDRAWAL_DELAY",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "lockFundsETH",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [],
    "outputs": []
  },
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
    "name": "initiateWithdrawal",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawFundsETH",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "cancelWithdrawal",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
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

export interface SignedTransferMessage {
  from: string;
  to: string;
  amount: string;
  nonce: string;
  deadline: number;
  signature: string;
  contractAddress: string;
}

export const getAIONContract = () => {
  const signer = getSigner();
  if (!signer) {
    throw new Error("No signer available");
  }
  return new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, signer);
};

export const getAIONContractRead = () => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No provider available");
  }
  return new ethers.Contract(AION_CONTRACT_ADDRESS, AION_ABI, provider);
};

export const lockFundsETH = async (amount: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  const amountWei = ethers.utils.parseEther(amount);
  
  return await contract.lockFundsETH({
    value: amountWei
  });
};

export const createSignedTransfer = async (
  from: string,
  to: string,
  amount: string
): Promise<SignedTransferMessage> => {
  const signer = getSigner();
  if (!signer) {
    throw new Error("No signer available");
  }

  // Generate unique nonce
  const nonce = ethers.utils.randomBytes(32);
  
  // Set deadline (5 minutes from now)
  const deadline = Math.floor(Date.now() / 1000) + 300;
  
  // Convert amount to wei
  const amountWei = ethers.utils.parseEther(amount);
  
  // Create message hash according to AION specification
  const messageHash = ethers.utils.solidityKeccak256(
    ["address", "address", "uint256", "bytes32", "uint256", "address"],
    [from, to, amountWei, nonce, deadline, AION_CONTRACT_ADDRESS]
  );
  
  // Sign the message
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  return {
    from,
    to,
    amount,
    nonce: ethers.utils.hexlify(nonce),
    deadline,
    signature,
    contractAddress: AION_CONTRACT_ADDRESS
  };
};

export const executeSignedTransfer = async (
  signedMessage: SignedTransferMessage
): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  const amountWei = ethers.utils.parseEther(signedMessage.amount);
  
  return await contract.executeETHTransfer(
    signedMessage.from,
    signedMessage.to,
    amountWei,
    signedMessage.nonce,
    signedMessage.deadline,
    signedMessage.signature
  );
};

export const initiateWithdrawal = async (): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  return await contract.initiateWithdrawal();
};

export const executeWithdrawal = async (): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  return await contract.withdrawFundsETH();
};

export const cancelWithdrawal = async (): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  return await contract.cancelWithdrawal();
};

export const getLockedBalance = async (address: string): Promise<ethers.BigNumber> => {
  const contract = getAIONContractRead();
  return await contract.lockedFundsETH(address);
};

export const getWithdrawalTimestamp = async (address: string): Promise<ethers.BigNumber> => {
  const contract = getAIONContractRead();
  return await contract.withdrawTimestamps(address);
};

export const isNonceUsed = async (nonce: string): Promise<boolean> => {
  const contract = getAIONContractRead();
  return await contract.usedNonces(nonce);
};

export const isInGracePeriod = async (senderAddress: string): Promise<boolean> => {
  const withdrawalTimestamp = await getWithdrawalTimestamp(senderAddress);
  
  if (withdrawalTimestamp.eq(0)) {
    return true; // No active withdrawal
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const withdrawalTime = withdrawalTimestamp.toNumber();
  const gracePeriodEnd = withdrawalTime + 300; // 5 minutes
  
  return currentTime <= gracePeriodEnd;
};

export const validateSignedMessage = async (
  signedMessage: SignedTransferMessage,
  senderBalance: ethers.BigNumber
): Promise<{
  isValid: boolean;
  checks: {
    deadlineValid: boolean;
    nonceUnused: boolean;
    senderHasFunds: boolean;
    inGracePeriod: boolean;
    signatureValid: boolean;
  };
}> => {
  const checks = {
    deadlineValid: false,
    nonceUnused: false,
    senderHasFunds: false,
    inGracePeriod: false,
    signatureValid: true, // Assume valid for pre-flight
  };
  
  // Check deadline
  const currentTime = Math.floor(Date.now() / 1000);
  checks.deadlineValid = currentTime <= signedMessage.deadline;
  
  // Check nonce
  checks.nonceUnused = !(await isNonceUsed(signedMessage.nonce));
  
  // Check sender balance
  const requiredAmount = ethers.utils.parseEther(signedMessage.amount);
  checks.senderHasFunds = senderBalance.gte(requiredAmount);
  
  // Check grace period
  checks.inGracePeriod = await isInGracePeriod(signedMessage.from);
  
  return {
    isValid: Object.values(checks).every(Boolean),
    checks
  };
};
