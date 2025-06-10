import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAION } from "@/hooks/useAION";
import { formatAddress } from "@/lib/web3";

export function WalletStatus() {
  const { isConnected, account, ethBalance } = useWallet();
  const { lockedBalance } = useAION(account);

  if (!isConnected || !account) {
    return null;
  }

  return (
    <Card className="mb-8 bg-dark-light border-surface">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Wallet className="mr-2 text-primary" />
            Wallet Connected
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
            <div className="font-mono text-sm">{formatAddress(account)}</div>
          </div>
          
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">ETH Balance</div>
            <div className="text-lg font-semibold">{parseFloat(ethBalance).toFixed(3)} ETH</div>
          </div>
          
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Locked in AION</div>
            <div className="text-lg font-semibold text-primary">{parseFloat(lockedBalance).toFixed(3)} ETH</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
