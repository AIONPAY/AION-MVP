import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getLockedBalance, getWithdrawalTimestamp, getAIONContractRead } from "@/lib/aion";
import { useToast } from "./use-toast";

export interface AIONState {
  lockedBalance: string;
  withdrawalTimestamp: number;
  hasActiveWithdrawal: boolean;
  canWithdraw: boolean;
  gracePeriodActive: boolean;
  isLoading: boolean;
}

export const useAION = (account: string | null) => {
  const [aionState, setAIONState] = useState<AIONState>({
    lockedBalance: "0",
    withdrawalTimestamp: 0,
    hasActiveWithdrawal: false,
    canWithdraw: false,
    gracePeriodActive: true,
    isLoading: false,
  });
  const { toast } = useToast();

  const updateAIONState = useCallback(async () => {
    if (!account) return;

    setAIONState(prev => ({ ...prev, isLoading: true }));

    try {
      const [lockedBalance, withdrawalTimestamp] = await Promise.all([
        getLockedBalance(account),
        getWithdrawalTimestamp(account),
      ]);

      const lockedBalanceFormatted = ethers.utils.formatEther(lockedBalance);
      const withdrawalTime = withdrawalTimestamp.toNumber();
      const hasActiveWithdrawal = withdrawalTime > 0;
      
      let canWithdraw = false;
      let gracePeriodActive = true;

      if (hasActiveWithdrawal) {
        const currentTime = Math.floor(Date.now() / 1000);
        canWithdraw = currentTime >= (withdrawalTime + 600); // 10 minutes
        gracePeriodActive = currentTime <= (withdrawalTime + 300); // 5 minutes
      }

      setAIONState({
        lockedBalance: lockedBalanceFormatted,
        withdrawalTimestamp: withdrawalTime,
        hasActiveWithdrawal,
        canWithdraw,
        gracePeriodActive,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("Error updating AION state:", error);
      
      // If it's a contract call exception, the contract isn't deployed
      if (error.code === 'CALL_EXCEPTION') {
        toast({
          title: "Contract Not Available",
          description: "AION contract not found on this network. Please check your network or deploy the contract.",
          variant: "destructive",
        });
      }
      
      setAIONState(prev => ({ ...prev, isLoading: false }));
    }
  }, [account, toast]);

  const setupEventListeners = useCallback(() => {
    if (!account) return;

    try {
      const contract = getAIONContractRead();

      // Listen for funds locked events
      const fundsLockedFilter = contract.filters.FundsLockedETH(account);
      contract.on(fundsLockedFilter, () => {
        toast({
          title: "Funds Locked",
          description: "ETH successfully locked in AION protocol",
        });
        updateAIONState();
      });

      // Listen for transfer events
      const transferFilter = contract.filters.FundsTransferred(account);
      contract.on(transferFilter, (from, to, amount) => {
        const amountETH = ethers.utils.formatEther(amount);
        toast({
          title: "Transfer Completed",
          description: `${amountETH} ETH transferred successfully`,
        });
        updateAIONState();
      });

      // Listen for withdrawal events
      const withdrawalInitiatedFilter = contract.filters.WithdrawalInitiated(account);
      contract.on(withdrawalInitiatedFilter, () => {
        toast({
          title: "Withdrawal Initiated",
          description: "Withdrawal request created. You can execute it in 10 minutes.",
        });
        updateAIONState();
      });

      const fundsWithdrawnFilter = contract.filters.FundsWithdrawn(account);
      contract.on(fundsWithdrawnFilter, (user, amount) => {
        const amountETH = ethers.utils.formatEther(amount);
        toast({
          title: "Withdrawal Completed",
          description: `${amountETH} ETH withdrawn successfully`,
        });
        updateAIONState();
      });

      const withdrawalCancelledFilter = contract.filters.WithdrawalCancelled(account);
      contract.on(withdrawalCancelledFilter, () => {
        toast({
          title: "Withdrawal Cancelled",
          description: "Withdrawal request has been cancelled",
        });
        updateAIONState();
      });

      return () => {
        contract.removeAllListeners();
      };
    } catch (error) {
      console.error("Error setting up event listeners:", error);
    }
  }, [account, toast, updateAIONState]);

  useEffect(() => {
    updateAIONState();
    const cleanup = setupEventListeners();
    
    return cleanup;
  }, [updateAIONState, setupEventListeners]);

  return {
    ...aionState,
    updateAIONState,
  };
};
