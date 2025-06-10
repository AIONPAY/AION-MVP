import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { getProvider } from "@/lib/web3";
import { AION_CONTRACT_ADDRESS } from "@/lib/aion";

export function NetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState<{
    name: string;
    chainId: number;
    isTestnet: boolean;
    contractDeployed: boolean;
  } | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const provider = getProvider();
        if (!provider) return;

        const network = await provider.getNetwork();
        const code = await provider.getCode(AION_CONTRACT_ADDRESS);
        
        setNetworkInfo({
          name: network.name === "unknown" ? "Local Network" : network.name,
          chainId: network.chainId,
          isTestnet: network.chainId !== 1,
          contractDeployed: code !== "0x"
        });
      } catch (error) {
        console.error("Error checking network:", error);
      }
    };

    checkNetwork();
  }, []);

  if (!networkInfo) return null;

  return (
    <Card className="mb-6 bg-dark-light border-surface">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${networkInfo.contractDeployed ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">Network Status</span>
            </div>
            
            <div className="text-sm text-gray-400">
              {networkInfo.name} (Chain ID: {networkInfo.chainId})
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {networkInfo.contractDeployed ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Contract Ready
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Contract Not Found
              </Badge>
            )}
          </div>
        </div>
        
        {!networkInfo.contractDeployed && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="text-sm text-yellow-400 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              AION Contract Not Deployed
            </div>
            <div className="text-xs text-gray-300">
              The AION Protocol smart contract is not deployed at address{" "}
              <code className="bg-surface px-1 py-0.5 rounded text-xs">
                {AION_CONTRACT_ADDRESS}
              </code>{" "}
              on this network. You can still explore the interface, but contract interactions won't work.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}