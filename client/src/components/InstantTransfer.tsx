import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { 
  approveToken, 
  lockFundsERC20, 
  createSignedERC20Transfer,
  getTokenInfo,
  getTokenBalance,
  getTokenAllowance,
  getLockedBalanceERC20,
  AION_CONTRACT_ADDRESS
} from "@/lib/aion";
import { LoadingModal } from "@/components/LoadingModal";
import { SuccessModal } from "@/components/SuccessModal";
import { ethers } from "ethers";

const instantTransferSchema = z.object({
  tokenAddress: z.string().min(1, "Token address is required"),
  recipientAddress: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
});

type InstantTransferForm = z.infer<typeof instantTransferSchema>;

export function InstantTransfer() {
  const { account, isConnected } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    txHash: string;
    confirmationTime: number;
    amount: string;
    token: string;
    recipient: string;
  } | null>(null);
  const [startTime, setStartTime] = useState(0);

  const form = useForm<InstantTransferForm>({
    resolver: zodResolver(instantTransferSchema),
    defaultValues: {
      tokenAddress: "",
      recipientAddress: "",
      amount: "",
    },
  });

  const submitToRelayer = async (signedMessage: any) => {
    const response = await fetch("/api/relayer/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signedMessage),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to submit to relayer");
    }

    return await response.json();
  };

  const onSubmit = async (data: InstantTransferForm) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStartTime(Date.now());

    try {
      // Step 1: Get token info and check balances
      setCurrentStep("Checking token information...");
      const tokenInfo = await getTokenInfo(data.tokenAddress);
      const balance = await getTokenBalance(data.tokenAddress, account);
      const lockedBalance = await getLockedBalanceERC20(data.tokenAddress, account);
      const amountWei = ethers.utils.parseUnits(data.amount, tokenInfo.decimals);

      console.log(`Token balance: ${ethers.utils.formatUnits(balance, tokenInfo.decimals)} ${tokenInfo.symbol}`);
      console.log(`Locked balance: ${ethers.utils.formatUnits(lockedBalance, tokenInfo.decimals)} ${tokenInfo.symbol}`);
      console.log(`Transfer amount: ${data.amount} ${tokenInfo.symbol}`);

      // Check if user has sufficient locked funds
      if (lockedBalance.gte(amountWei)) {
        console.log("Sufficient locked funds found, skipping lock step");
        toast({
          title: "Using Locked Funds",
          description: `Using existing locked ${tokenInfo.symbol} balance`,
        });
      } else {
        // Check wallet balance for locking additional funds
        const neededAmount = amountWei.sub(lockedBalance);
        if (balance.lt(neededAmount)) {
          throw new Error(`Insufficient token balance. Need ${ethers.utils.formatUnits(neededAmount, tokenInfo.decimals)} more ${tokenInfo.symbol}`);
        }

        // Step 2: Check and approve if needed
        setCurrentStep("Checking token allowance...");
        const allowance = await getTokenAllowance(data.tokenAddress, account, AION_CONTRACT_ADDRESS);
        
        if (allowance.lt(neededAmount)) {
          setCurrentStep("Approving token spending...");
          const approveTx = await approveToken(data.tokenAddress, ethers.utils.formatUnits(neededAmount, tokenInfo.decimals));
          await approveTx.wait();
          
          toast({
            title: "Approval Successful",
            description: "Token spending approved",
          });
        }

        // Step 3: Lock additional tokens
        setCurrentStep("Locking additional tokens...");
        const lockTx = await lockFundsERC20(data.tokenAddress, ethers.utils.formatUnits(neededAmount, tokenInfo.decimals));
        await lockTx.wait();

        toast({
          title: "Tokens Locked",
          description: `${ethers.utils.formatUnits(neededAmount, tokenInfo.decimals)} ${tokenInfo.symbol} locked successfully`,
        });
      }

      // Step 4: Create signed message
      setCurrentStep("Creating signed transfer...");
      const signedMessage = await createSignedERC20Transfer(
        data.tokenAddress,
        account,
        data.recipientAddress,
        data.amount
      );

      // Step 5: Submit to relayer
      setCurrentStep("Submitting to relayer...");
      const relayerResponse = await submitToRelayer(signedMessage);

      // Step 6: Show immediate success - signed message sent successfully!
      const submissionTime = Date.now() - startTime;
      console.log('Signed message submitted successfully! Showing success modal with timing:', submissionTime, 'ms');
      
      setSuccessData({
        txHash: `pending-${relayerResponse.transferId}`, // Temporary until real txHash
        confirmationTime: submissionTime,
        amount: data.amount,
        token: tokenInfo.symbol,
        recipient: data.recipientAddress
      });
      
      setIsProcessing(false);
      setCurrentStep("");
      setShowSuccess(true);
      form.reset();

    } catch (error: any) {
      console.error("Instant transfer error:", error);
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep("");
    }
  };

  return (
    <>
      <Card className="bg-card border-surface">
        <CardHeader>
          <CardTitle className="text-white">Instant ERC20 Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="tokenAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Token Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        className="bg-surface border-surface-light text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Recipient Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        className="bg-surface border-surface-light text-white"
                        {...field}
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
                    <FormLabel className="text-white">Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.0"
                        className="bg-surface border-surface-light text-white"
                        {...field}
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
                {isProcessing ? "Processing..." : "Lock & Transfer Instantly"}
              </Button>

              {!isConnected && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to use instant transfers
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isProcessing}
        title="Processing Instant Transfer"
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