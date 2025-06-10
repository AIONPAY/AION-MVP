import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, History, Info } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAION } from "@/hooks/useAION";
import { AION_CONTRACT_ADDRESS } from "@/lib/aion";
import { formatAddress } from "@/lib/web3";

export function ProtocolStats() {
  const { account } = useWallet();
  const { lockedBalance } = useAION(account);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <Card className="bg-dark-light border-surface">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 text-primary" />
            Protocol Stats
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Locked</span>
              <span className="font-semibold">{parseFloat(lockedBalance).toFixed(3)} ETH</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Transfers</span>
              <span className="font-semibold">-</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Withdrawal Delay</span>
              <span className="font-semibold">10 minutes</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Grace Period</span>
              <span className="font-semibold">5 minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-dark-light border-surface">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History className="mr-2 text-green-400" />
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            <div className="text-center py-8 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Start by locking some ETH</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Info */}
      <Card className="bg-dark-light border-surface">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Info className="mr-2 text-gray-400" />
            Contract Info
          </h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Contract Address</div>
              <div className="font-mono text-xs bg-surface px-2 py-1 rounded">
                {formatAddress(AION_CONTRACT_ADDRESS)}
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 mb-1">Version</div>
              <div>AION v1.0</div>
            </div>
            
            <div>
              <div className="text-gray-400 mb-1">Network</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Local Testnet</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
