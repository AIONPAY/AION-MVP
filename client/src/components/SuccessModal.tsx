import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  confirmationTime: number;
  amount: string;
  token: string;
  recipient: string;
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  txHash, 
  confirmationTime, 
  amount, 
  token, 
  recipient 
}: SuccessModalProps) {
  const { toast } = useToast();

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
    toast({
      title: "Copied!",
      description: "Transaction hash copied to clipboard",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-dark-light border-surface">
        <div className="flex flex-col items-center space-y-6 py-8">
          {/* Big Success Checkmark */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
            {/* Animated ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-green-500 rounded-full animate-ping opacity-20"></div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Transfer Signed & Submitted!
            </h2>
            <p className="text-green-400 font-semibold">
              Completed in {confirmationTime}ms
            </p>
            <p className="text-gray-400 text-sm">
              Relayer is executing on blockchain
            </p>
          </div>

          {/* Transfer Details */}
          <div className="w-full space-y-3 bg-surface/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount:</span>
              <span className="text-white font-semibold">{amount} {token}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">To:</span>
              <span className="text-white font-mono">{formatAddress(recipient)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">Sepolia Testnet</span>
            </div>
          </div>

          {/* Transaction Status */}
          <div className="w-full space-y-2">
            <label className="text-sm text-gray-400">Transfer Status:</label>
            <div className="flex items-center space-x-2 bg-surface rounded-lg p-3">
              <span className="text-sm text-white flex-1">
                {txHash.startsWith('pending-') ? 
                  'Signed message submitted to relayer queue' : 
                  `Transaction Hash: ${txHash}`
                }
              </span>
              {!txHash.startsWith('pending-') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTxHash}
                  className="h-8 w-8 p-0 hover:bg-surface-light"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 w-full">
            {!txHash.startsWith('pending-') && (
              <Button
                variant="outline"
                onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                className="flex-1 border-surface hover:bg-surface"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Etherscan
              </Button>
            )}
            <Button
              onClick={onClose}
              className={`${txHash.startsWith('pending-') ? 'w-full' : 'flex-1'} bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90`}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}