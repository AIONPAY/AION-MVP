import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { CoinTossGame } from "@shared/schema";

export default function CoinToss() {
  const { account, isConnected } = useWallet();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState("0.01");
  const [selectedChoice, setSelectedChoice] = useState<"heads" | "tails">("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<{
    result: "heads" | "tails";
    won: boolean;
    payoutAmount: string;
    gameId: number;
    houseAddress: string;
  } | null>(null);

  const { data: gamesData } = useQuery<{ games?: CoinTossGame[] }>({
    queryKey: ["/api/cointoss/games", account],
    enabled: !!account,
    refetchInterval: 5000
  });

  const games = gamesData?.games || (Array.isArray(gamesData) ? gamesData : []);

  const playMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cointoss/play`, {
        playerAddress: account,
        betAmount,
        choice: selectedChoice
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      setIsFlipping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cointoss/games", account] });
      
      if (data.won) {
        toast({
          title: "You Won!",
          description: data.message,
          variant: "default"
        });
      } else {
        toast({
          title: "You Lost",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      setIsFlipping(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePlay = () => {
    if (!isConnected || !account) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to play",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive"
      });
      return;
    }

    setIsFlipping(true);
    setLastResult(null);
    
    // Simulate coin flip animation delay
    setTimeout(() => {
      playMutation.mutate();
    }, 1500);
  };

  const stats = games.reduce(
    (acc, game) => {
      acc.totalGames++;
      if (game.won) {
        acc.wins++;
        acc.totalWinnings = (parseFloat(acc.totalWinnings) + parseFloat(game.payoutAmount || "0")).toFixed(4);
      } else {
        acc.losses++;
      }
      return acc;
    },
    { totalGames: 0, wins: 0, losses: 0, totalWinnings: "0" }
  );

  return (
    <div className="min-h-screen bg-[rgb(12,12,12)] dark:bg-[rgb(12,12,12)] text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[rgb(255,73,51)] to-orange-500 bg-clip-text text-transparent">
            AION Coin Toss
          </h1>
          <p className="text-gray-400">
            Bet USDT on a coin flip • Win 1.8x your bet • Provably fair
          </p>
        </div>

        {!isConnected && (
          <Alert className="bg-[rgb(20,20,20)] border-[rgb(255,73,51)] dark:bg-[rgb(20,20,20)] dark:border-[rgb(255,73,51)]">
            <AlertDescription className="text-white dark:text-white">
              Connect your wallet to start playing the coin toss game
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-[rgb(20,20,20)] border-gray-800 dark:bg-[rgb(20,20,20)] dark:border-gray-800" data-testid="card-cointoss-game">
            <CardHeader>
              <CardTitle className="text-white dark:text-white">Play Coin Toss</CardTitle>
              <CardDescription className="text-gray-400 dark:text-gray-400">
                Choose heads or tails and place your bet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white dark:text-white">Bet Amount (USDT)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="bg-[rgb(15,15,15)] border-gray-700 text-white dark:bg-[rgb(15,15,15)] dark:border-gray-700 dark:text-white"
                  placeholder="Enter bet amount"
                  disabled={!isConnected}
                  data-testid="input-bet-amount"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white dark:text-white">Your Choice</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setSelectedChoice("heads")}
                    variant={selectedChoice === "heads" ? "default" : "outline"}
                    className={`h-24 text-lg ${
                      selectedChoice === "heads"
                        ? "bg-[rgb(255,73,51)] hover:bg-[rgb(255,73,51)]/90 dark:bg-[rgb(255,73,51)] dark:hover:bg-[rgb(255,73,51)]/90"
                        : "bg-[rgb(25,25,25)] border-gray-700 text-white hover:bg-[rgb(35,35,35)] dark:bg-[rgb(25,25,25)] dark:border-gray-700 dark:text-white dark:hover:bg-[rgb(35,35,35)]"
                    }`}
                    disabled={!isConnected || isFlipping}
                    data-testid="button-choose-heads"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Coins className="w-8 h-8" />
                      <span>Heads</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => setSelectedChoice("tails")}
                    variant={selectedChoice === "tails" ? "default" : "outline"}
                    className={`h-24 text-lg ${
                      selectedChoice === "tails"
                        ? "bg-[rgb(255,73,51)] hover:bg-[rgb(255,73,51)]/90 dark:bg-[rgb(255,73,51)] dark:hover:bg-[rgb(255,73,51)]/90"
                        : "bg-[rgb(25,25,25)] border-gray-700 text-white hover:bg-[rgb(35,35,35)] dark:bg-[rgb(25,25,25)] dark:border-gray-700 dark:text-white dark:hover:bg-[rgb(35,35,35)]"
                    }`}
                    disabled={!isConnected || isFlipping}
                    data-testid="button-choose-tails"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Coins className="w-8 h-8" />
                      <span>Tails</span>
                    </div>
                  </Button>
                </div>
              </div>

              <Button
                onClick={handlePlay}
                disabled={!isConnected || isFlipping || playMutation.isPending}
                className="w-full h-14 text-lg bg-[rgb(255,73,51)] hover:bg-[rgb(255,73,51)]/90 dark:bg-[rgb(255,73,51)] dark:hover:bg-[rgb(255,73,51)]/90"
                data-testid="button-flip-coin"
              >
                {isFlipping ? (
                  <span className="flex items-center gap-2">
                    <Coins className="w-5 h-5 animate-spin" />
                    Flipping...
                  </span>
                ) : (
                  "Flip Coin"
                )}
              </Button>

              {lastResult && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    lastResult.won
                      ? "bg-green-900/20 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                      : "bg-red-900/20 border-red-500 dark:bg-red-900/20 dark:border-red-500"
                  }`}
                  data-testid={lastResult.won ? "result-won" : "result-lost"}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-white dark:text-white">
                      Result: {lastResult.result.toUpperCase()}
                    </span>
                    {lastResult.won ? (
                      <TrendingUp className="w-6 h-6 text-green-500 dark:text-green-500" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-500 dark:text-red-500" />
                    )}
                  </div>
                  {lastResult.won && (
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-300 dark:text-gray-300">
                        You would win: <span className="font-semibold text-green-400 dark:text-green-400">{lastResult.payoutAmount} USDT</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[rgb(20,20,20)] border-gray-800 dark:bg-[rgb(20,20,20)] dark:border-gray-800" data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-white dark:text-white">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-[rgb(15,15,15)] dark:bg-[rgb(15,15,15)] rounded">
                    <div className="text-2xl font-bold text-white dark:text-white">{stats.totalGames}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">Total Games</div>
                  </div>
                  <div className="text-center p-3 bg-[rgb(15,15,15)] dark:bg-[rgb(15,15,15)] rounded">
                    <div className="text-2xl font-bold text-green-500 dark:text-green-500">{stats.wins}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">Wins</div>
                  </div>
                  <div className="text-center p-3 bg-[rgb(15,15,15)] dark:bg-[rgb(15,15,15)] rounded">
                    <div className="text-2xl font-bold text-red-500 dark:text-red-500">{stats.losses}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">Losses</div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-[rgb(255,73,51)]/20 to-orange-500/20 dark:from-[rgb(255,73,51)]/20 dark:to-orange-500/20 rounded-lg border border-[rgb(255,73,51)] dark:border-[rgb(255,73,51)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 dark:text-gray-300">Total Winnings</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-[rgb(255,73,51)] dark:text-[rgb(255,73,51)]" />
                      <span className="text-xl font-bold text-white dark:text-white">{stats.totalWinnings}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-400">USDT</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[rgb(20,20,20)] border-gray-800 dark:bg-[rgb(20,20,20)] dark:border-gray-800" data-testid="card-recent-games">
              <CardHeader>
                <CardTitle className="text-white dark:text-white">Recent Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {games.length === 0 ? (
                    <p className="text-gray-400 dark:text-gray-400 text-sm text-center py-4">
                      No games played yet
                    </p>
                  ) : (
                    games.slice(0, 10).map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 bg-[rgb(15,15,15)] dark:bg-[rgb(15,15,15)] rounded"
                        data-testid={`game-${game.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={game.won ? "default" : "destructive"}
                            className={
                              game.won
                                ? "bg-green-500 dark:bg-green-500"
                                : "bg-red-500 dark:bg-red-500"
                            }
                          >
                            {game.won ? "Won" : "Lost"}
                          </Badge>
                          <div className="text-sm">
                            <div className="text-white dark:text-white font-medium">
                              {game.playerChoice} → {game.result}
                            </div>
                            <div className="text-gray-400 dark:text-gray-400 text-xs">
                              Bet: {game.betAmount} USDT
                            </div>
                          </div>
                        </div>
                        {game.won && (
                          <div className="text-sm font-semibold text-green-400 dark:text-green-400">
                            +{game.payoutAmount} USDT
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-[rgb(20,20,20)] border-gray-800 dark:bg-[rgb(20,20,20)] dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-white dark:text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300 dark:text-gray-300">
            <div className="flex gap-3">
              <span className="text-[rgb(255,73,51)] dark:text-[rgb(255,73,51)] font-bold">1.</span>
              <p>Choose heads or tails and enter your bet amount in USDT</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[rgb(255,73,51)] dark:text-[rgb(255,73,51)] font-bold">2.</span>
              <p>Click "Flip Coin" to generate a provably fair random result</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[rgb(255,73,51)] dark:text-[rgb(255,73,51)] font-bold">3.</span>
              <p>See the result instantly and track your win/loss record</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[rgb(255,73,51)] dark:text-[rgb(255,73,51)] font-bold">4.</span>
              <p>If you win, you would receive 1.8x your bet amount!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
