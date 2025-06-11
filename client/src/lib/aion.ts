import { ethers } from "ethers";
import { getSigner, getProvider } from "./web3";

// Contract configuration - Sepolia deployment
export const AION_CONTRACT_ADDRESS = "0x146CB95D41aAD4674Ca3fA80DAA4EcBc848B4bC9";

// ERC20 Token ABI for interacting with tokens
export const ERC20_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "constant": true,
    "stateMutability": "view",
    "inputs": [{"type": "address", "name": "account"}],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "allowance",
    "constant": true,
    "stateMutability": "view", 
    "inputs": [
      {"type": "address", "name": "owner"},
      {"type": "address", "name": "spender"}
    ],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "approve",
    "constant": false,
    "inputs": [
      {"type": "address", "name": "spender"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [{"type": "bool"}]
  },
  {
    "type": "function",
    "name": "decimals",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "uint8"}]
  },
  {
    "type": "function", 
    "name": "symbol",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "string"}]
  },
  {
    "type": "function",
    "name": "name", 
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "string"}]
  }
];

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
  },
  // ERC20 Functions
  {
    "type": "function",
    "name": "lockFundsERC20",
    "constant": false,
    "payable": false,
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "lockAndWrapERC20",
    "constant": false,
    "payable": false,
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "unwrapAndUnlockERC20",
    "constant": false,
    "payable": false,
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "uint256", "name": "amount"}
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
  },
  {
    "type": "function",
    "name": "withdrawFundsERC20",
    "constant": false,
    "payable": false,
    "inputs": [{"type": "address", "name": "token"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "cancelWithdrawalERC20",
    "constant": false,
    "payable": false,
    "inputs": [{"type": "address", "name": "token"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "lockedFundsERC20",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "address", "name": "user"}
    ],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "withdrawTimestampsERC20",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {"type": "address", "name": "user"},
      {"type": "address", "name": "token"}
    ],
    "outputs": [{"type": "uint256"}]
  },
  {
    "type": "function",
    "name": "wrappedTokenFor",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{"type": "address", "name": "token"}],
    "outputs": [{"type": "address"}]
  },
  // Events for ERC20
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsLockedERC20",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "address", "name": "token", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WithdrawalInitiatedERC20",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "address", "name": "token", "indexed": true},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WithdrawalCancelledERC20",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "address", "name": "token", "indexed": true},
      {"type": "uint256", "name": "timestamp", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsTransferredERC20",
    "inputs": [
      {"type": "address", "name": "from", "indexed": true},
      {"type": "address", "name": "to", "indexed": true},
      {"type": "address", "name": "token", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FundsWithdrawnERC20",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "address", "name": "token", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WrappedTokenCreated",
    "inputs": [
      {"type": "address", "name": "underlyingToken", "indexed": true},
      {"type": "address", "name": "wrappedToken", "indexed": true}
    ]
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
  tokenAddress?: string; // Optional for ERC20 transfers
}

// Centralized high-entropy nonce generation function
const generateSecureNonce = (from: string): string => {
  // Use high-resolution timestamp with microsecond precision
  const highResTimestamp = performance.now() * 1000000;
  
  // Generate multiple sources of cryptographic randomness (832 bits total)
  const randomPart1 = ethers.utils.randomBytes(32); // 256 bits
  const randomPart2 = ethers.utils.randomBytes(32); // 256 bits
  const randomPart3 = ethers.utils.randomBytes(32); // 256 bits
  const extraRandom = ethers.utils.randomBytes(8);  // 64 bits
  
  // Convert timestamp to bytes with zero padding
  const timestampBytes = ethers.utils.hexZeroPad(
    ethers.utils.hexlify(Math.floor(highResTimestamp)), 
    32
  );
  
  // Convert address to bytes with zero padding
  const addressBytes = ethers.utils.hexZeroPad(from, 32);
  
  // Combine all entropy sources for maximum uniqueness
  const combinedEntropy = ethers.utils.concat([
    randomPart1,
    randomPart2,
    randomPart3,
    timestampBytes,
    addressBytes,
    extraRandom
  ]);
  
  // Hash the combined entropy to create final nonce
  return ethers.utils.keccak256(combinedEntropy);
};

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

  // Generate cryptographically secure nonce with high entropy
  const nonce = generateSecureNonce(from);
  
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

// ===== ERC20 TOKEN FUNCTIONS =====

export const getERC20Contract = (tokenAddress: string) => {
  const signer = getSigner();
  if (!signer) {
    throw new Error("No signer available");
  }
  return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
};

export const getERC20ContractRead = (tokenAddress: string) => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No provider available");
  }
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
};

export const getTokenInfo = async (tokenAddress: string) => {
  const contract = getERC20ContractRead(tokenAddress);
  
  try {
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ]);
    
    return { name, symbol, decimals };
  } catch (error) {
    console.error("Error getting token info:", error);
    throw error;
  }
};

export const getTokenBalance = async (tokenAddress: string, userAddress: string): Promise<ethers.BigNumber> => {
  const contract = getERC20ContractRead(tokenAddress);
  return await contract.balanceOf(userAddress);
};

export const getTokenAllowance = async (tokenAddress: string, owner: string, spender: string): Promise<ethers.BigNumber> => {
  const contract = getERC20ContractRead(tokenAddress);
  return await contract.allowance(owner, spender);
};

export const approveToken = async (tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> => {
  const contract = getERC20Contract(tokenAddress);
  const tokenInfo = await getTokenInfo(tokenAddress);
  const amountWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
  
  return await contract.approve(AION_CONTRACT_ADDRESS, amountWei);
};

export const lockFundsERC20 = async (tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  const tokenInfo = await getTokenInfo(tokenAddress);
  const amountWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
  
  return await contract.lockFundsERC20(tokenAddress, amountWei);
};

export const lockAndWrapERC20 = async (tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  const tokenInfo = await getTokenInfo(tokenAddress);
  const amountWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
  
  return await contract.lockAndWrapERC20(tokenAddress, amountWei);
};

export const unwrapAndUnlockERC20 = async (tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  const tokenInfo = await getTokenInfo(tokenAddress);
  const amountWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
  
  return await contract.unwrapAndUnlockERC20(tokenAddress, amountWei);
};

export const createSignedERC20Transfer = async (
  tokenAddress: string,
  from: string,
  to: string,
  amount: string
): Promise<SignedTransferMessage> => {
  const signer = getSigner();
  if (!signer) {
    throw new Error("No signer available");
  }

  // Generate cryptographically secure nonce with high entropy
  const nonce = generateSecureNonce(from);
  const deadline = Math.floor(Date.now() / 1000) + 300;
  
  const tokenInfo = await getTokenInfo(tokenAddress);
  const amountWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
  
  const messageHash = ethers.utils.solidityKeccak256(
    ["address", "address", "address", "uint256", "bytes32", "uint256", "address"],
    [tokenAddress, from, to, amountWei, nonce, deadline, AION_CONTRACT_ADDRESS]
  );
  
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  return {
    from,
    to,
    amount,
    nonce: ethers.utils.hexlify(nonce),
    deadline,
    signature,
    contractAddress: AION_CONTRACT_ADDRESS,
    tokenAddress
  };
};

export const executeSignedERC20Transfer = async (
  signedMessage: SignedTransferMessage
): Promise<ethers.ContractTransaction> => {
  if (!signedMessage.tokenAddress) {
    throw new Error("Token address is required for ERC20 transfers");
  }
  
  const contract = getAIONContract();
  const tokenInfo = await getTokenInfo(signedMessage.tokenAddress);
  const amountWei = ethers.utils.parseUnits(signedMessage.amount, tokenInfo.decimals);
  
  return await contract.executeERC20Transfer(
    signedMessage.tokenAddress,
    signedMessage.from,
    signedMessage.to,
    amountWei,
    signedMessage.nonce,
    signedMessage.deadline,
    signedMessage.signature
  );
};

export const withdrawFundsERC20 = async (tokenAddress: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  return await contract.withdrawFundsERC20(tokenAddress);
};

export const cancelWithdrawalERC20 = async (tokenAddress: string): Promise<ethers.ContractTransaction> => {
  const contract = getAIONContract();
  return await contract.cancelWithdrawalERC20(tokenAddress);
};

export const getLockedBalanceERC20 = async (tokenAddress: string, userAddress: string): Promise<ethers.BigNumber> => {
  const contract = getAIONContractRead();
  return await contract.lockedFundsERC20(tokenAddress, userAddress);
};

export const getWithdrawalTimestampERC20 = async (tokenAddress: string, userAddress: string): Promise<ethers.BigNumber> => {
  const contract = getAIONContractRead();
  return await contract.withdrawTimestampsERC20(userAddress, tokenAddress);
};

export const getWrappedTokenAddress = async (tokenAddress: string): Promise<string> => {
  const contract = getAIONContractRead();
  return await contract.wrappedTokenFor(tokenAddress);
};
