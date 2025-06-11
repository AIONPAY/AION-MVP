import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";
import { LoadingModal } from "./LoadingModal";
import { SuccessModal } from "./SuccessModal";
import { getTokenBalance, getTokenInfo, getLockedBalance } from "@/lib/aion";
import { getSigner, getFallbackProvider } from "@/lib/web3";

const USDT_ADDRESS = "0x96F19aB2d96Cc1B30FeB30F15E97D1B6919D63B2";
const AION_CONTRACT_ADDRESS = "0x055F807117aadeD931B52047F6558c8CDB3B9a70";

const usdtTransferSchema = z.object({
  to: z.string()
    .min(1, "Recipient address is required")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
});

type USDTTransferForm = z.infer<typeof usdtTransferSchema>;

interface SuccessData {
  txHash: string;
  confirmationTime: number;
  amount: string;
  token: string;
  recipient: string;
}

export function USDTInstantTransfer() {
  const { isConnected, account } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const form = useForm<USDTTransferForm>({
    resolver: zodResolver(usdtTransferSchema),
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const onSubmit = async (data: USDTTransferForm) => {
    if (!isConnected || !account) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      setCurrentStep("Checking USDT balance and locked funds...");
      
      // Get token info and balances
      const [tokenInfo, balance, lockedBalance] = await Promise.all([
        getTokenInfo(USDT_ADDRESS),
        getTokenBalance(USDT_ADDRESS, account),
        getLockedBalance(account)
      ]);

      console.log("Token info retrieved:", tokenInfo);
      console.log("Token balance retrieved:", balance);
      console.log("Locked balance retrieved:", lockedBalance);

      if (!tokenInfo || typeof tokenInfo !== 'object' || !('decimals' in tokenInfo)) {
        throw new Error("Failed to retrieve token information");
      }

      const decimals = Number(tokenInfo.decimals);
      const balanceFormatted = ethers.utils.formatUnits(balance.toString(), decimals);
      const lockedBalanceFormatted = ethers.utils.formatUnits(lockedBalance.toString(), decimals);

      console.log(`Token balance: ${balanceFormatted} USDT`);
      console.log(`Locked balance: ${lockedBalanceFormatted} USDT`);
      console.log(`Transfer amount: ${data.amount} USDT`);

      const transferAmountWei = ethers.utils.parseUnits(data.amount, decimals);
      const lockedBalanceWei = ethers.BigNumber.from(lockedBalance as string);

      // Check if we have sufficient locked funds
      if (lockedBalanceWei.gte(transferAmountWei)) {
        console.log("Sufficient locked funds found, skipping lock step");
      } else {
        const requiredLockAmount = transferAmountWei.sub(lockedBalanceWei);
        const balanceWei = ethers.BigNumber.from(balance as string);
        
        if (balanceWei.lt(requiredLockAmount)) {
          throw new Error(`Insufficient USDT balance. Need ${ethers.utils.formatUnits(requiredLockAmount, decimals)} more USDT`);
        }

        setCurrentStep("Locking additional USDT...");
        
        const signer = getSigner();
        if (!signer) throw new Error("Could not get wallet signer");

        // Lock additional funds
        const aionContract = new ethers.Contract(
          AION_CONTRACT_ADDRESS,
          [
            "function lockERC20(address token, uint256 amount) external",
          ],
          signer
        );

        const lockTx = await aionContract.lockERC20(USDT_ADDRESS, requiredLockAmount);
        await lockTx.wait();
      }

      setCurrentStep("Creating signed transfer message...");

      // Create the signed transfer message
      const signer = getSigner();
      if (!signer) throw new Error("Could not get wallet signer");

      const nonce = ethers.utils.randomBytes(32);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const domain = {
        name: "AION",
        version: "1",
        chainId: 11155111,
        verifyingContract: AION_CONTRACT_ADDRESS,
      };

      const types = {
        Transfer: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        from: account,
        to: data.to,
        token: USDT_ADDRESS,
        amount: transferAmountWei,
        nonce: ethers.utils.hexlify(nonce),
        deadline: deadline,
      };

      const signature = await signer._signTypedData(domain, types, message);

      const signedTransfer = {
        from: account,
        to: data.to,
        amount: transferAmountWei.toString(),
        nonce: ethers.utils.hexlify(nonce),
        deadline: deadline,
        signature: signature,
        contractAddress: AION_CONTRACT_ADDRESS,
        tokenAddress: USDT_ADDRESS,
      };

      setCurrentStep("Submitting to relayer...");

      // Submit to relayer
      const response = await fetch("/api/relayer/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signedTransfer),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit transfer");
      }

      const result = await response.json();
      const endTime = Date.now();
      const confirmationTime = endTime - startTime;

      console.log("Signed message ready! Showing success modal with timing:", confirmationTime, "ms");

      setSuccessData({
        txHash: result.transferId?.toString() || "pending",
        confirmationTime,
        amount: data.amount,
        token: "USDT",
        recipient: data.to,
      });

      setShowSuccess(true);
      form.reset();

      toast({
        title: "Transfer Submitted Successfully",
        description: `Your USDT transfer has been submitted to the relayer and will be executed shortly.`,
      });

    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep("");
    }
  };

  return (
    <>
      <Card className="bg-dark-light border-surface">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 text-primary" />
            USDT Instant Transfer
          </CardTitle>
          <CardDescription>
            Send USDT instantly using your locked balance. No gas fees required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Recipient Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        {...field}
                        className="bg-surface border-surface-light text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Amount (USDT)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.0"
                        {...field}
                        className="bg-surface border-surface-light text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={!isConnected || isProcessing}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {isProcessing ? "Processing..." : "Transfer USDT Now"}
              </Button>

              {!isConnected && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to use USDT instant transfers
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isProcessing}
        title="Processing USDT Transfer"
        description={currentStep}
      />

      {successData && (
        <SuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          txHash={successData.txHash}
          confirmationTime={successData.confirmationTime}
          amount={successData.amount}
          token={successData.token}
          recipient={successData.recipient}
        />
      )}
    </>
  );
}