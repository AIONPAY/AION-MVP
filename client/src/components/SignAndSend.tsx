import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { 
  createSignedTransfer,
  createSignedERC20Transfer
} from "@/lib/aion";
import { LoadingModal } from "@/components/LoadingModal";
import { Send } from "lucide-react";

const signAndSendSchema = z.object({
  transferType: z.enum(["ETH", "ERC20"]),
  tokenAddress: z.string().optional(),
  recipientAddress: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
});

type SignAndSendForm = z.infer<typeof signAndSendSchema>;

export function SignAndSend() {
  const { account, isConnected } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");

  const form = useForm<SignAndSendForm>({
    resolver: zodResolver(signAndSendSchema),
    defaultValues: {
      transferType: "ETH",
      tokenAddress: "",
      recipientAddress: "",
      amount: "",
    },
  });

  const transferType = form.watch("transferType");

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

  const onSubmit = async (data: SignAndSendForm) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (data.transferType === "ERC20" && !data.tokenAddress) {
      toast({
        title: "Token Address Required",
        description: "Please enter a token address for ERC20 transfers",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create signed message (this prompts MetaMask signature)
      setCurrentStep("Creating signed transfer message...");
      let signedMessage;
      
      if (data.transferType === "ETH") {
        signedMessage = await createSignedTransfer(account, data.recipientAddress, data.amount);
      } else {
        signedMessage = await createSignedERC20Transfer(
          data.tokenAddress!,
          account, 
          data.recipientAddress, 
          data.amount
        );
      }

      // Step 2: Submit to relayer for instant execution
      setCurrentStep("Submitting to relayer for execution...");
      const relayerResponse = await submitToRelayer(signedMessage);

      toast({
        title: "Transfer Submitted!",
        description: `${data.transferType} transfer sent to relayer. Transfer ID: ${relayerResponse.transferId}`,
      });

      // Reset form
      form.reset();

    } catch (error: any) {
      console.error("Sign and send error:", error);
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
          <CardTitle className="text-white flex items-center">
            <Send className="mr-2" />
            Sign & Send to Relayer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="transferType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Transfer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-surface-light text-white">
                          <SelectValue placeholder="Select transfer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="ERC20">ERC20 Token</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transferType === "ERC20" && (
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
              )}

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
                      Amount ({transferType === "ETH" ? "ETH" : "Tokens"})
                    </FormLabel>
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
                {isProcessing ? "Processing..." : "Sign & Send to Relayer"}
              </Button>

              {!isConnected && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to sign and send transfers
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <LoadingModal
        isOpen={isProcessing}
        title="Signing & Sending Transfer"
        description={currentStep}
      />
    </>
  );
}