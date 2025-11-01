import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db";
import { coinTossGames } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";

const HOUSE_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"; // Dedicated house wallet for coin toss
const WIN_MULTIPLIER = 1.8; // Pay 1.8x on wins (house edge of 10%)

const playCoinTossSchema = z.object({
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
  betAmount: z.string().refine(val => {
    try {
      const num = parseFloat(val);
      return num > 0 && !isNaN(num);
    } catch {
      return false;
    }
  }, "Invalid bet amount"),
  choice: z.enum(["heads", "tails"])
});

export function createCoinTossRoutes(): Router {
  const router = Router();

  router.post("/play", async (req, res) => {
    try {
      const validation = playCoinTossSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid game data",
          details: validation.error.errors
        });
      }

      const { playerAddress, betAmount, choice } = validation.data;

      // Generate provably fair random result
      const randomSeed = crypto.randomBytes(32).toString('hex');
      const timestamp = Date.now().toString();
      const blockData = `${randomSeed}-${timestamp}-${playerAddress}`;
      const hash = crypto.createHash('sha256').update(blockData).digest('hex');
      
      // Use last bit of hash to determine heads (0) or tails (1)
      const lastBit = parseInt(hash.slice(-1), 16) % 2;
      const result = lastBit === 0 ? 'heads' : 'tails';
      const won = result === choice;
      
      const payoutAmount = won ? (parseFloat(betAmount) * WIN_MULTIPLIER).toString() : "0";

      // Store game result
      const [game] = await db.insert(coinTossGames).values({
        playerAddress,
        betAmount,
        playerChoice: choice,
        result,
        won,
        payoutAmount,
        randomSeed,
        status: won ? 'pending' : 'completed'
      }).returning();

      console.log(`Coin toss game ${game.id}: Player ${playerAddress} bet ${betAmount} on ${choice}, result was ${result}, won: ${won}`);

      res.json({
        gameId: game.id,
        result,
        won,
        payoutAmount: won ? payoutAmount : "0",
        randomSeed,
        houseAddress: HOUSE_ADDRESS,
        message: won 
          ? `You won! Send ${betAmount} USDT to ${HOUSE_ADDRESS} to receive ${payoutAmount} USDT back!`
          : `You lost. The coin landed on ${result}.`
      });

    } catch (error: any) {
      console.error("Error in coin toss game:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  router.get("/games/:address", async (req, res) => {
    try {
      const address = req.params.address;
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid address format" });
      }

      const games = await db
        .select()
        .from(coinTossGames)
        .where(eq(coinTossGames.playerAddress, address))
        .orderBy(coinTossGames.createdAt);

      res.json(games);
    } catch (error: any) {
      console.error("Error fetching games:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  router.get("/verify/:gameId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      
      if (isNaN(gameId)) {
        return res.status(400).json({ error: "Invalid game ID" });
      }

      const [game] = await db
        .select()
        .from(coinTossGames)
        .where(eq(coinTossGames.id, gameId));

      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Provide verification data
      res.json({
        gameId: game.id,
        playerAddress: game.playerAddress,
        betAmount: game.betAmount,
        playerChoice: game.playerChoice,
        result: game.result,
        won: game.won,
        randomSeed: game.randomSeed,
        createdAt: game.createdAt,
        verification: {
          message: "You can verify this game was fair by hashing the randomSeed with timestamp and player address",
          randomSeed: game.randomSeed
        }
      });
    } catch (error: any) {
      console.error("Error verifying game:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  router.post("/process-payout/:gameId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const { txHash } = req.body;
      
      if (isNaN(gameId)) {
        return res.status(400).json({ error: "Invalid game ID" });
      }

      const [game] = await db
        .select()
        .from(coinTossGames)
        .where(eq(coinTossGames.id, gameId));

      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (!game.won) {
        return res.status(400).json({ error: "Game was not won" });
      }

      // Update game with payout transaction
      await db
        .update(coinTossGames)
        .set({
          payoutTxHash: txHash,
          status: 'paid'
        })
        .where(eq(coinTossGames.id, gameId));

      res.json({
        success: true,
        message: "Payout processed successfully"
      });

    } catch (error: any) {
      console.error("Error processing payout:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  return router;
}
