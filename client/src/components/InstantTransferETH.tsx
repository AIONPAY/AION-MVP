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
  lockFundsETH, 
  createSignedTransfer
} from "@/lib/aion";
import { LoadingModal } from "@/components/LoadingModal";
import { ethers } from "ethers";
import { getProvider } from "@/lib/web3";

const instantTransferETHSchema = z.object({
  recipientAddress: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
});

type InstantTransferETHForm = z.infer<typeof instantTransferETHSchema>;

export function InstantTransferETH() {
  const { account, isConnected, ethBalance } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");

  const form = useForm<InstantTransferETHForm>({
    resolver: zodResolver(instantTransferETHSchema),
    defaultValues: {
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

  const onSubmit = async (data: InstantTransferETHForm) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Check ETH balance
      setCurrentStep("Checking ETH balance...");
      const provider = getProvider();
      if (!provider) {
        throw new Error("No provider available");
      }

      const balance = await provider.getBalance(account);
      const amountWei = ethers.utils.parseEther(data.amount);
      
      // Need extra ETH for gas fees
      const gasEstimate = ethers.utils.parseEther("0.01"); // Rough estimate
      if (balance.lt(amountWei.add(gasEstimate))) {
        throw new Error("Insufficient ETH balance (including gas fees)");
      }

      // Step 2: Lock ETH
      setCurrentStep("Locking ETH...");
      const lockTx = await lockFundsETH(data.amount);
      await lockTx.wait();

      toast({
        title: "ETH Locked",
        description: `${data.amount} ETH locked successfully`,
      });

      // Step 3: Create signed message
      setCurrentStep("Creating signed transfer...");
      const signedMessage = await createSignedTransfer(
        account,
        data.recipientAddress,
        data.amount
      );

      // Step 4: Submit to relayer
      setCurrentStep("Submitting to relayer...");
      const relayerResponse = await submitToRelayer(signedMessage);

      toast({
        title: "ETH Transfer Initiated!",
        description: `Transfer submitted to relayer. Transfer ID: ${relayerResponse.transferId}`,
      });

      // Reset form
      form.reset();

    } catch (error: any) {
      console.error("Instant ETH transfer error:", error);
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
          <CardTitle className="text-white">Instant ETH Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel className="text-white">
                      Amount (ETH) - Available: {parseFloat(ethBalance).toFixed(4)} ETH
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
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
                {isProcessing ? "Processing..." : "Lock & Transfer ETH Instantly"}
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
        title="Processing Instant ETH Transfer"
        description={currentStep}
      />
    </>
  );
}