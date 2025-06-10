import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { connectWallet, getAccounts, getProvider } from "@/lib/web3";
import { useToast } from "./use-toast";

export interface WalletState {
  isConnected: boolean;
  account: string | null;
  ethBalance: string;
  isLoading: boolean;
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    ethBalance: "0",
    isLoading: false,
  });
  const { toast } = useToast();

  const updateBalance = useCallback(async (account: string) => {
    try {
      const provider = getProvider();
      if (provider) {
        const balance = await provider.getBalance(account);
        setWalletState(prev => ({
          ...prev,
          ethBalance: ethers.utils.formatEther(balance),
        }));
      }
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  }, []);

  const connect = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const accounts = await connectWallet();
      
      if (accounts.length > 0) {
        const account = accounts[0];
        
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          account,
          isLoading: false,
        }));
        
        await updateBalance(account);
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${account.slice(0, 6)}...${account.slice(-4)}`,
        });
      } else {
        setWalletState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error: any) {
      setWalletState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, updateBalance]);

  const checkConnection = useCallback(async () => {
    try {
      const accounts = await getAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0];
        
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          account,
        }));
        await updateBalance(account);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  }, [updateBalance]);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setWalletState({
        isConnected: false,
        account: null,
        ethBalance: "0",
        isLoading: false,
      });
      toast({
        title: "Wallet Disconnected",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
    } else {
      window.location.reload();
    }
  }, [toast]);

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkConnection, handleAccountsChanged, handleChainChanged]);

  return {
    ...walletState,
    connect,
    updateBalance: () => walletState.account ? updateBalance(walletState.account) : Promise.resolve(),
  };
};
