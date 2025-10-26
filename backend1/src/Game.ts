import { WebSocket } from "ws";
import { Chess, Move } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages.js";
import { PrismaClient } from "@prisma/client";

export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  public board: Chess;
  private startTime: Date;
  private moveCount = 0;
  private gameId: string;
  private prisma: PrismaClient;

  constructor(
    player1: WebSocket,
    player2: WebSocket,
    gameId: string,
    prisma: PrismaClient
  ) {
    this.player1 = player1;
    this.player2 = player2;
    this.gameId = gameId;
    this.prisma = prisma;
    this.board = new Chess();
    this.startTime = new Date();

    // Send INIT_GAME messages
    this.player1.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: { color: "white" },
      })
    );
    this.player2.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: { color: "black" },
      })
    );
  }

  async makeMove(socket: WebSocket, move: { from: string; to: string }) {
    // Validate whose turn it is
    if (this.moveCount % 2 === 0 && socket !== this.player1) {
      console.log("Not player 1's turn");
      return;
    }
    if (this.moveCount % 2 === 1 && socket !== this.player2) {
      console.log("Not player 2's turn");
      return;
    }

    try {
      this.board.move(move);
      console.log(
        `Move ${this.moveCount + 1} applied: ${move.from} to ${move.to}`
      );
    } catch (e) {
      console.log("Invalid move:", e);
      return;
    }

    // Save to DB after a successful move
    try {
      await this.prisma.game.update({
        where: { id: this.gameId },
        data: {
          moves: {
            push: JSON.stringify(move),
          },
          board: this.board.fen(),
        },
      });
    } catch (e) {
      console.error("Failed to save move to database:", e);
    }

    if (this.board.isGameOver()) {
      const winner = this.board.turn() === "w" ? "black" : "white";
      // Update game status and winner in DB
      try {
        await this.prisma.game.update({
          where: { id: this.gameId },
          data: {
            status: "COMPLETED",
            winner: winner,
          },
        });
      } catch (e) {
        console.error("Failed to update game status:", e);
      }

      this.player1.send(
        JSON.stringify({ type: GAME_OVER, payload: { winner } })
      );
      this.player2.send(
        JSON.stringify({ type: GAME_OVER, payload: { winner } })
      );
      return;
    }

    // CRITICAL FIX: Send the move to BOTH players to keep them in sync
    const moveMessage = JSON.stringify({ type: MOVE, payload: move });

    this.player1.send(moveMessage);
    this.player2.send(moveMessage);

    this.moveCount++;
    console.log(`Move count: ${this.moveCount}`);
  }
}
