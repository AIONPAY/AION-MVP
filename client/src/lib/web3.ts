import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return null;
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
