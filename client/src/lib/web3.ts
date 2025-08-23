import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Fallback RPC for read operations when MetaMask is slow
const FALLBACK_RPC_URL = "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";

export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return null;
};

export const getFallbackProvider = (): ethers.providers.JsonRpcProvider => {
  return new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
};

export const getSigner = (): ethers.Signer | null => {
  const provider = getProvider();
  if (provider) {
    return provider.getSigner();
  }
  return null;
};

export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
};

export const getCurrentChainId = async (): Promise<number | null> => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
};

export const isSepoliaNetwork = async (): Promise<boolean> => {
  const chainId = await getCurrentChainId();
  return chainId === 11155111; // Sepolia chain ID
};

export const connectWallet = async (): Promise<string[]> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts;
  } catch (error: any) {
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
};

export const getAccounts = async (): Promise<string[]> => {
  if (!isMetaMaskInstalled()) {
    return [];
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });
    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

export const formatEther = (value: ethers.BigNumberish): string => {
  return ethers.utils.formatEther(value);
};

export const parseEther = (value: string): ethers.BigNumber => {
  return ethers.utils.parseEther(value);
};

// Sepolia network configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
};

export const switchToSepolia = async (): Promise<boolean> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to Sepolia
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
    return true;
  } catch (switchError: any) {
    // If the network doesn't exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_CONFIG],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Sepolia network:', addError);
        return false;
      }
    } else {
      console.error('Failed to switch to Sepolia:', switchError);
      return false;
    }
  }
};
