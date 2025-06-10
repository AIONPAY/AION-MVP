import { Button } from "@/components/ui/button";
import { Wallet, Check } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { isMetaMaskInstalled } from "@/lib/web3";

export function WalletConnection() {
  const { isConnected, connect, isLoading } = useWallet();

  if (!isMetaMaskInstalled()) {
    return (
      <Button
        onClick={() => window.open("https://metamask.io/download/", "_blank")}
        className="bg-primary hover:bg-blue-600"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Install MetaMask
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button disabled className="bg-green-500">
        <Check className="mr-2 h-4 w-4" />
        Connected
      </Button>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={isLoading}
      className="bg-primary hover:bg-blue-600"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {isLoading ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
