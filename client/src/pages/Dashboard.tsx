import { WalletConnection } from "@/components/WalletConnection";
import { WalletStatus } from "@/components/WalletStatus";
// import { LockFunds } from "@/components/LockFunds"; // ETH functionality removed
import { LockFundsERC20 } from "@/components/LockFundsERC20";
// import { CreateTransfer } from "@/components/CreateTransfer"; // ETH functionality removed
// import { ExecuteTransfer } from "@/components/ExecuteTransfer"; // ETH functionality removed
import { WithdrawFunds } from "@/components/WithdrawFunds";
import { InstantTransfer } from "@/components/InstantTransfer";
import { USDTInstantTransfer } from "@/components/USDTInstantTransfer";
// import { InstantTransferETH } from "@/components/InstantTransferETH"; // ETH functionality removed
// import { SignAndSend } from "@/components/SignAndSend"; // ETH functionality removed
import { TransactionHistory } from "@/components/TransactionHistory";
import { ProtocolStats } from "@/components/ProtocolStats";
import { NetworkStatus } from "@/components/NetworkStatus";
import { NotificationSystem } from "@/components/NotificationSystem";
import { useWallet } from "@/contexts/WalletContext";
import { isMetaMaskInstalled } from "@/lib/web3";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Atom, Coins } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { isConnected } = useWallet();
  
  console.log("Dashboard - isConnected:", isConnected);

  if (!isMetaMaskInstalled()) {
    return (
      <div className="min-h-screen bg-dark text-gray-100">
        <header className="bg-dark-light border-b border-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                    <Atom className="text-white h-4 w-4" />
                  </div>
                  <span className="text-xl font-bold text-white">AION Protocol</span>
                </div>
                <span className="text-xs bg-surface px-2 py-1 rounded-full text-gray-300">v1.0</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto bg-dark-light border-surface">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">MetaMask Required</h1>
              <p className="text-gray-400 mb-4">
                Please install MetaMask to use the AION Protocol
              </p>
              <button
                onClick={() => window.open("https://metamask.io/download/", "_blank")}
                className="bg-primary hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Install MetaMask
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-gray-100">
      <header className="bg-dark-light border-b border-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Atom className="text-white h-4 w-4" />
                </div>
                <span className="text-xl font-bold text-white">AION Protocol</span>
              </div>
              <span className="text-xs bg-surface px-2 py-1 rounded-full text-gray-300">v1.0</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/cointoss">
                <Button
                  variant="outline"
                  className="bg-primary/10 border-primary hover:bg-primary/20 text-white"
                  data-testid="button-cointoss-nav"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Coin Toss
                </Button>
              </Link>
              
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <span className="text-gray-400">Network:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Sepolia</span>
                </div>
              </div>
              
              <WalletConnection />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isConnected ? (
          <>
            <NetworkStatus />
            <WalletStatus />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* ETH functionality removed - ERC20 only */}
                <LockFundsERC20 />
                <USDTInstantTransfer />
                <InstantTransfer />
                <WithdrawFunds />
              </div>
              
              <ProtocolStats />
            </div>

            <TransactionHistory />
          </>
        ) : (
          <Card className="max-w-md mx-auto bg-dark-light border-surface">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Atom className="text-white h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Welcome to AION Protocol</h1>
              <p className="text-gray-400 mb-4">
                Connect your wallet to start using the decentralized payment infrastructure
              </p>
              <WalletConnection />
            </CardContent>
          </Card>
        )}
      </main>

      <NotificationSystem />
    </div>
  );
}
