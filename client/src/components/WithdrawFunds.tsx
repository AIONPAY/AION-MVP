import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, Clock, HourglassIcon } from "lucide-react";
import { initiateWithdrawal, executeWithdrawal, cancelWithdrawal } from "@/lib/aion";
import { useWallet } from "@/hooks/useWallet";
import { useAION } from "@/hooks/useAION";
import { useToast } from "@/hooks/use-toast";
import { LoadingModal } from "./LoadingModal";

export function WithdrawFunds() {
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState("");
  const { isConnected, account, updateBalance } = useWallet();
  const { 
    lockedBalance, 
    hasActiveWithdrawal, 
    canWithdraw, 
    withdrawalTimestamp, 
    updateAIONState 
  } = useAION(account);
  const { toast } = useToast();

  useEffect(() => {
    if (hasActiveWithdrawal && !canWithdraw) {
      const updateCountdown = () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const withdrawalTime = withdrawalTimestamp;
        const remainingSeconds = (withdrawalTime + 600) - currentTime; // 10 minutes

        if (remainingSeconds <= 0) {
          setCountdown("0:00");
          updateAIONState();
          return;
        }

        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [hasActiveWithdrawal, canWithdraw, withdrawalTimestamp, updateAIONState]);

  const handleInitiateWithdrawal = async () => {
    setIsLoading(true);
    try {
      const tx = await initiateWithdrawal();
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
      
      await tx.wait();
      
      toast({
        title: "Withdrawal Initiated",
        description: "You can execute the withdrawal in 10 minutes",
      });
      
      await updateAIONState();
    } catch (error: any) {
      let errorMessage = error.message || "Failed to initiate withdrawal";
      
      if (error.message.includes("No ETH funds to withdraw")) {
        errorMessage = "No locked funds available to withdraw";
      } else if (error.message.includes("Active ETH withdrawal request")) {
        errorMessage = "You already have an active withdrawal request";
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteWithdrawal = async () => {
    setIsLoading(true);
    try {
      const tx = await executeWithdrawal();
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
      
      await tx.wait();
      
      toast({
        title: "Withdrawal Completed",
        description: "Funds have been withdrawn to your wallet",
      });
      
      await updateBalance();
      await updateAIONState();
    } catch (error: any) {
      let errorMessage = error.message || "Failed to execute withdrawal";
      
      if (error.message.includes("Withdrawal delay not met")) {
        errorMessage = "Withdrawal delay period has not been met yet";
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelWithdrawal = async () => {
    setIsLoading(true);
    try {
      const tx = await cancelWithdrawal();
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
      
      await tx.wait();
      
      toast({
        title: "Withdrawal Cancelled",
        description: "Withdrawal request has been cancelled",
      });
      
      await updateAIONState();
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to cancel withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-dark-light border-surface">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ArrowUp className="mr-2 text-yellow-400" />
            Withdraw Funds
          </h3>
          
          <div className="space-y-4">
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Available to Withdraw</div>
              <div className="text-xl font-bold">{parseFloat(lockedBalance).toFixed(3)} ETH</div>
            </div>
            
            {hasActiveWithdrawal && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Withdrawal Initiated</span>
                </div>
                <div className="text-sm text-gray-300">
                  {canWithdraw 
                    ? "Withdrawal is ready to be executed"
                    : `Withdrawal available in: ${countdown}`
                  }
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <Button
                onClick={handleInitiateWithdrawal}
                disabled={!isConnected || isLoading || hasActiveWithdrawal || parseFloat(lockedBalance) === 0}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
              >
                <HourglassIcon className="mr-2 h-4 w-4" />
                Initiate Withdrawal
              </Button>
              
              <Button
                onClick={handleExecuteWithdrawal}
                disabled={!isConnected || isLoading || !canWithdraw}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Execute Withdrawal
              </Button>
            </div>
            
            {hasActiveWithdrawal && (
              <Button
                onClick={handleCancelWithdrawal}
                disabled={isLoading}
                variant="outline"
                className="w-full bg-gray-600 hover:bg-gray-700 border-gray-500"
              >
                Cancel Withdrawal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isLoading}
        title="Processing Transaction"
        description="Please confirm the transaction in MetaMask..."
      />
    </>
  );
}
