import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { lockFundsETH } from "@/lib/aion";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { LoadingModal } from "./LoadingModal";

export function LockFunds() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, updateBalance } = useWallet();
  const { toast } = useToast();

  const handleLockFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const tx = await lockFundsETH(amount);
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
      
      await tx.wait();
      
      toast({
        title: "Funds Locked Successfully",
        description: `${amount} ETH has been locked in the AION protocol`,
      });
      
      setAmount("");
      await updateBalance();
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to lock funds",
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
            <Lock className="mr-2 text-green-400" />
            Lock ETH Funds
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-400 mb-2">Amount (ETH)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-surface border-surface-light text-white placeholder-gray-400 pr-16"
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">ETH</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Gas Estimate:</span>
              <span>~0.002 ETH</span>
            </div>
            
            <Button
              onClick={handleLockFunds}
              disabled={!isConnected || isLoading || !amount}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              <Lock className="mr-2 h-4 w-4" />
              {isLoading ? "Locking..." : "Lock Funds"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isLoading}
        title="Locking Funds"
        description="Please confirm the transaction in MetaMask..."
      />
    </>
  );
}
