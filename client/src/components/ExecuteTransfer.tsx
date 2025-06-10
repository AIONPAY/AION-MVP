import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";
import { executeSignedTransfer, validateSignedMessage, type SignedTransferMessage } from "@/lib/aion";
import { useWallet } from "@/hooks/useWallet";
import { useAION } from "@/hooks/useAION";
import { useToast } from "@/hooks/use-toast";
import { formatAddress, parseEther } from "@/lib/web3";
import { LoadingModal } from "./LoadingModal";
import { ethers } from "ethers";

export function ExecuteTransfer() {
  const [signedMessage, setSignedMessage] = useState("");
  const [parsedMessage, setParsedMessage] = useState<SignedTransferMessage | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, updateBalance } = useWallet();
  const { lockedBalance, updateAIONState } = useAION(parsedMessage?.from || null);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved signed transfer if available
    const saved = localStorage.getItem("latestSignedTransfer");
    if (saved) {
      setSignedMessage(saved);
    }
  }, []);

  useEffect(() => {
    if (signedMessage) {
      try {
        const parsed = JSON.parse(signedMessage) as SignedTransferMessage;
        setParsedMessage(parsed);
        
        // Validate the message
        if (parsed.from) {
          const senderBalance = parseEther(lockedBalance);
          validateSignedMessage(parsed, senderBalance).then(setValidationResult);
        }
      } catch (error) {
        setParsedMessage(null);
        setValidationResult(null);
      }
    } else {
      setParsedMessage(null);
      setValidationResult(null);
    }
  }, [signedMessage, lockedBalance]);

  const handleExecuteTransfer = async () => {
    if (!parsedMessage) return;

    setIsLoading(true);
    try {
      const tx = await executeSignedTransfer(parsedMessage);
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
      
      await tx.wait();
      
      toast({
        title: "Transfer Executed",
        description: `${parsedMessage.amount} ETH transferred successfully`,
      });
      
      setSignedMessage("");
      localStorage.removeItem("latestSignedTransfer");
      await updateBalance();
      await updateAIONState();
    } catch (error: any) {
      let errorMessage = error.message || "Failed to execute transfer";
      
      if (error.message.includes("SIGNATURE_EXPIRED")) {
        errorMessage = "Transfer signature has expired";
      } else if (error.message.includes("Nonce already used")) {
        errorMessage = "This transfer has already been executed";
      } else if (error.message.includes("Invalid sender signature")) {
        errorMessage = "Invalid signature";
      } else if (error.message.includes("SENDER_WITHDRAWAL_LOCKOUT")) {
        errorMessage = "Sender is in withdrawal lockout period";
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

  const getStatusColor = () => {
    if (!validationResult) return "text-gray-400";
    return validationResult.isValid ? "text-green-400" : "text-red-400";
  };

  const getStatusText = () => {
    if (!validationResult) return "Invalid JSON";
    return validationResult.isValid ? "Valid" : "Invalid";
  };

  return (
    <>
      <Card className="bg-dark-light border-surface">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Play className="mr-2 text-secondary" />
            Execute Transfer
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-400 mb-2">Signed Message</Label>
              <Textarea
                value={signedMessage}
                onChange={(e) => setSignedMessage(e.target.value)}
                className="bg-surface border-surface-light text-white placeholder-gray-400 h-32 resize-none font-mono text-xs"
                placeholder="Paste signed transfer message here..."
              />
            </div>
            
            {parsedMessage && (
              <div className="bg-surface rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">From:</span>
                  <span className="font-mono">{formatAddress(parsedMessage.from)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To:</span>
                  <span className="font-mono">{formatAddress(parsedMessage.to)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold">{parsedMessage.amount} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className={getStatusColor()}>{getStatusText()}</span>
                </div>
                {validationResult && !validationResult.isValid && (
                  <div className="text-xs text-red-400 mt-2">
                    Issues: {Object.entries(validationResult.checks)
                      .filter(([_, valid]) => !valid)
                      .map(([key]) => key)
                      .join(", ")}
                  </div>
                )}
              </div>
            )}
            
            <Button
              onClick={handleExecuteTransfer}
              disabled={!isConnected || isLoading || !parsedMessage || (validationResult && !validationResult.isValid)}
              className="w-full bg-secondary hover:bg-purple-600"
            >
              <Play className="mr-2 h-4 w-4" />
              {isLoading ? "Executing..." : "Execute Transfer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isLoading}
        title="Executing Transfer"
        description="Please confirm the transaction in MetaMask..."
      />
    </>
  );
}
