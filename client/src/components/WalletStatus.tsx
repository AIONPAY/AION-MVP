import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useAION } from "@/hooks/useAION";
import { formatAddress } from "@/lib/web3";
import { useQuery } from "@tanstack/react-query";
import { getLockedBalanceERC20, getTokenInfo } from "@/lib/aion";
import { ethers } from "ethers";

const USDT_ADDRESS = "0x96F19aB2d96Cc1B30FeB30F15E97D1B6919D63B2";

export function WalletStatus() {
  const { isConnected, account, ethBalance } = useWallet();
  const { lockedBalance } = useAION(account);

  // Query locked USDT balance
  const { data: lockedUSDTBalance = "0" } = useQuery({
    queryKey: ["locked-usdt-balance", account],
    queryFn: async () => {
      if (!account) return "0";
      try {
        const [tokenInfo, balance] = await Promise.all([
          getTokenInfo(USDT_ADDRESS),
          getLockedBalanceERC20(USDT_ADDRESS, account),
        ]);
        const decimals = Number(tokenInfo.decimals);
        return ethers.utils.formatUnits(balance, decimals);
      } catch (error) {
        console.error("Error fetching locked USDT balance:", error);
        return "0";
      }
    },
    enabled: !!account && isConnected,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
            <div className="font-mono text-sm">{formatAddress(account)}</div>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">ETH Balance</div>
            <div className="text-lg font-semibold">
              {parseFloat(ethBalance).toFixed(3)} ETH
            </div>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">WRPD ETH</div>
            <div className="text-lg font-semibold text-primary">
              {parseFloat(lockedBalance).toFixed(3)} ETH
            </div>
          </div>

          <div
            className="bg-surface rounded-lg p-4"
            data-testid="locked-usdt-balance"
          >
            <div className="text-sm text-gray-400 mb-1">WRPD USDT</div>
            <div className="text-lg font-semibold text-primary">
              {parseFloat(lockedUSDTBalance).toFixed(2)} USDT
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
