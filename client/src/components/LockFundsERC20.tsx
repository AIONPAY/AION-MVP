import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { 
  getTokenInfo, 
  getTokenBalance, 
  getTokenAllowance, 
  approveToken, 
  lockFundsERC20, 
  lockAndWrapERC20,
  getLockedBalanceERC20,
  AION_CONTRACT_ADDRESS
} from "@/lib/aion";
import { ethers } from "ethers";

// Common ERC20 tokens on Sepolia for demo
const COMMON_TOKENS = [
  {
    address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    symbol: "LINK",
    name: "Chainlink Token"
  },
  {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    symbol: "UNI", 
    name: "Uniswap"
  }
];

export function LockFundsERC20() {
  const { isConnected, account } = useWallet();
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState("");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState("");
  const [lockedBalance, setLockedBalance] = useState("");
  const [allowance, setAllowance] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);

  const handleTokenSelect = async (tokenAddress: string) => {
    if (!account || !tokenAddress) return;
    
    setSelectedToken(tokenAddress);
    setIsLoading(true);
    
    try {
      const [info, balance, locked, allowanceAmount] = await Promise.all([
        getTokenInfo(tokenAddress),
        getTokenBalance(tokenAddress, account),
        getLockedBalanceERC20(tokenAddress, account),
        getTokenAllowance(tokenAddress, account, AION_CONTRACT_ADDRESS)
      ]);
      
      setTokenInfo(info);
      setTokenBalance(ethers.utils.formatUnits(balance, info.decimals));
      setLockedBalance(ethers.utils.formatUnits(locked, info.decimals));
      setAllowance(ethers.utils.formatUnits(allowanceAmount, info.decimals));
      
    } catch (error) {
      console.error("Error loading token info:", error);
      toast({
        title: "Error",
        description: "Failed to load token information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomTokenLoad = async () => {
    if (!customTokenAddress || !ethers.utils.isAddress(customTokenAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid token address",
        variant: "destructive"
      });
      return;
    }
    
    await handleTokenSelect(customTokenAddress);
  };

  const checkApproval = (amountToLock: string) => {
    if (!tokenInfo || !allowance) return false;
    
    const requiredAmount = parseFloat(amountToLock);
    const currentAllowance = parseFloat(allowance);
    
    return currentAllowance >= requiredAmount;
  };

  const handleApprove = async () => {
    if (!selectedToken || !amount) return;
    
    setIsLoading(true);
    try {
      const tx = await approveToken(selectedToken, amount);
      
      toast({
        title: "Approval Submitted",
        description: "Transaction submitted to blockchain"
      });
      
      await tx.wait();
      
      toast({
        title: "Approval Confirmed",
        description: "Token spending approved successfully"
      });
      
      // Refresh allowance
      await handleTokenSelect(selectedToken);
      
    } catch (error: any) {
      console.error("Error approving token:", error);
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockFunds = async (wrapTokens: boolean = false) => {
    if (!selectedToken || !amount || !account) return;
    
    const amountFloat = parseFloat(amount);
    if (amountFloat <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    if (amountFloat > parseFloat(tokenBalance)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough tokens",
        variant: "destructive"
      });
      return;
    }
    
    if (!checkApproval(amount)) {
      setNeedsApproval(true);
      toast({
        title: "Approval Required",
        description: "Please approve token spending first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const tx = wrapTokens 
        ? await lockAndWrapERC20(selectedToken, amount)
        : await lockFundsERC20(selectedToken, amount);
      
      toast({
        title: `${wrapTokens ? 'Lock & Wrap' : 'Lock'} Submitted`,
        description: "Transaction submitted to blockchain"
      });
      
      await tx.wait();
      
      toast({
        title: `${wrapTokens ? 'Lock & Wrap' : 'Lock'} Confirmed`, 
        description: `Successfully locked ${amount} ${tokenInfo?.symbol}`
      });
      
      // Reset form and refresh balances
      setAmount("");
      await handleTokenSelect(selectedToken);
      
    } catch (error: any) {
      console.error("Error locking funds:", error);
      toast({
        title: "Lock Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="bg-dark-light border-surface">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Coins className="mr-2 text-primary" />
          Lock ERC20 Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Selection */}
        <div className="space-y-4">
          <Label className="text-white">Select Token</Label>
          <Tabs defaultValue="common" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="common">Common Tokens</TabsTrigger>
              <TabsTrigger value="custom">Custom Token</TabsTrigger>
            </TabsList>
            
            <TabsContent value="common" className="space-y-2">
              <Select onValueChange={handleTokenSelect} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a token" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TOKENS.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol} - {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Token contract address"
                  value={customTokenAddress}
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleCustomTokenLoad} disabled={isLoading}>
                  Load
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Token Information */}
        {tokenInfo && (
          <div className="p-4 bg-surface rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{tokenInfo.name} ({tokenInfo.symbol})</span>
              <Badge variant="secondary">{tokenInfo.decimals} decimals</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Wallet Balance:</span>
                <span className="text-white ml-2">{tokenBalance} {tokenInfo.symbol}</span>
              </div>
              <div>
                <span className="text-gray-400">Locked Balance:</span>
                <span className="text-white ml-2">{lockedBalance} {tokenInfo.symbol}</span>
              </div>
            </div>
          </div>
        )}

        {/* Amount Input */}
        {selectedToken && (
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Amount to Lock</Label>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setNeedsApproval(!checkApproval(e.target.value));
                }}
                disabled={isLoading}
              />
              <Button
                variant="outline"
                onClick={() => setAmount(tokenBalance)}
                disabled={isLoading || !tokenBalance}
              >
                Max
              </Button>
            </div>
          </div>
        )}

        {/* Approval Status */}
        {amount && selectedToken && (
          <div className="flex items-center space-x-2">
            {checkApproval(amount) ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500 text-sm">Spending approved</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-500 text-sm">Approval required</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedToken && amount && (
          <div className="space-y-2">
            {needsApproval && (
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve {tokenInfo?.symbol} Spending
              </Button>
            )}
            
            {!needsApproval && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleLockFunds(false)}
                  disabled={isLoading}
                  className="bg-primary hover:bg-blue-600"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Lock Tokens
                </Button>
                
                <Button
                  onClick={() => handleLockFunds(true)}
                  disabled={isLoading}
                  className="bg-secondary hover:bg-purple-600"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Lock & Wrap
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}