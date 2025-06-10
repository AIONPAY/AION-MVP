import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { connectWallet, getAccounts, getProvider } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";

export interface WalletState {
  isConnected: boolean;
  account: string | null;
  ethBalance: string;
  isLoading: boolean;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  updateBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    ethBalance: "0",
    isLoading: false,
  });
  const { toast } = useToast();

  console.log("WalletProvider - current state:", walletState);

  const updateBalance = useCallback(async (account?: string) => {
    try {
      const accountToUse = account || walletState.account;
      if (!accountToUse) return;
      
      const provider = getProvider();
      if (provider) {
        const balance = await provider.getBalance(accountToUse);
        setWalletState(prev => ({
          ...prev,
          ethBalance: ethers.utils.formatEther(balance),
        }));
      }
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  }, [walletState.account]);

  const connect = useCallback(async () => {
    console.log("WalletProvider - Connect button clicked");
    setWalletState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const accounts = await connectWallet();
      console.log("WalletProvider - Connect result:", accounts);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        console.log("WalletProvider - Setting connected state:", account);
        
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
        console.log("WalletProvider - No accounts returned");
        setWalletState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error: any) {
      console.error("WalletProvider - Connection error:", error);
      setWalletState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, updateBalance]);

  const checkConnection = useCallback(async () => {
    console.log("WalletProvider - Checking wallet connection...");
    try {
      const accounts = await getAccounts();
      console.log("WalletProvider - Found accounts:", accounts);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        console.log("WalletProvider - Setting connected state for account:", account);
        
        setWalletState(prev => {
          if (!prev.isConnected || prev.account !== account) {
            return {
              ...prev,
              isConnected: true,
              account,
            };
          }
          return prev;
        });
        await updateBalance(account);
      } else {
        console.log("WalletProvider - No accounts found");
        setWalletState(prev => {
          if (prev.isConnected) {
            return {
              ...prev,
              isConnected: false,
              account: null,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("WalletProvider - Error checking connection:", error);
    }
  }, [updateBalance]);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    console.log("WalletProvider - Accounts changed:", accounts);
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
      checkConnection();
    }
  }, [toast, checkConnection]);

  const handleChainChanged = useCallback(() => {
    console.log("WalletProvider - Chain changed, reloading...");
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
  }, [handleAccountsChanged, handleChainChanged]);

  const contextValue: WalletContextType = {
    ...walletState,
    connect,
    updateBalance: () => updateBalance(),
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}