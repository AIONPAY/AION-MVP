import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, PenTool } from "lucide-react";
import { createSignedTransfer, createSignedERC20Transfer } from "@/lib/aion";
import { useWallet } from "@/hooks/useWallet";
import { useAION } from "@/hooks/useAION";
import { useToast } from "@/hooks/use-toast";
import { LoadingModal } from "./LoadingModal";

export function CreateTransfer() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transferType, setTransferType] = useState("ETH");
  const [tokenAddress, setTokenAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, account } = useWallet();
  const { gracePeriodActive } = useAION(account);
  const { toast } = useToast();

  const handleCreateTransfer = async () => {
    if (!account) return;

    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid recipient address and amount",
        variant: "destructive",
      });
      return;
    }

    if (transferType === "ERC20" && !tokenAddress) {
      toast({
        title: "Invalid Input",
        description: "Please enter a token address for ERC20 transfers",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let signedMessage;
      
      if (transferType === "ETH") {
        signedMessage = await createSignedTransfer(account, recipient, amount);
      } else {
        signedMessage = await createSignedERC20Transfer(tokenAddress, account, recipient, amount);
      }
      
      // Store in localStorage for easy access
      localStorage.setItem("latestSignedTransfer", JSON.stringify(signedMessage, null, 2));
      
      toast({
        title: "Transfer Created",
        description: `Signed ${transferType} transfer message has been created and saved`,
      });
      
      setRecipient("");
      setAmount("");
      if (transferType === "ERC20") setTokenAddress("");
    } catch (error: any) {
      toast({
        title: "Failed to Create Transfer",
        description: error.message || "Could not create signed transfer",
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
            <Send className="mr-2 text-primary" />
            Create Signed Transfer
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-400 mb-2">Transfer Type</Label>
              <Select value={transferType} onValueChange={setTransferType}>
                <SelectTrigger className="bg-surface border-surface-light text-white">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="ERC20">ERC20 Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transferType === "ERC20" && (
              <div>
                <Label className="text-sm text-gray-400 mb-2">Token Address</Label>
                <Input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="bg-surface border-surface-light text-white placeholder-gray-400"
                  placeholder="0x..."
                />
              </div>
            )}
            
            <div>
              <Label className="text-sm text-gray-400 mb-2">Recipient Address</Label>
              <Input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-surface border-surface-light text-white placeholder-gray-400"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <Label className="text-sm text-gray-400 mb-2">
                Amount ({transferType === "ETH" ? "ETH" : "Tokens"})
              </Label>
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
                <span className="absolute right-3 top-3 text-gray-400 text-sm">
                  {transferType === "ETH" ? "ETH" : "Tokens"}
                </span>
              </div>
            </div>
            
            <div className="bg-surface rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Signature expires in:</span>
                <span className="text-yellow-400">5 minutes</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Grace period active:</span>
                <span className={gracePeriodActive ? "text-green-400" : "text-red-400"}>
                  {gracePeriodActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
            
            <Button
              onClick={handleCreateTransfer}
              disabled={!isConnected || isLoading || !recipient || !amount}
              className="w-full bg-primary hover:bg-blue-600"
            >
              <PenTool className="mr-2 h-4 w-4" />
              {isLoading ? "Creating..." : "Create Signed Transfer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isLoading}
        title="Creating Signature"
        description="Please sign the message in MetaMask..."
      />
    </>
  );
}
