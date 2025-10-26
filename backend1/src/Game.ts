import { WebSocket } from "ws";
import { Chess, Move } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages.js";
import { PrismaClient } from "@prisma/client"; // Import PrismaClient

export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  public board: Chess;
  private startTime: Date;
  private moveCount = 0;
  private gameId: string; // Add gameId property
  private prisma: PrismaClient; // Add prisma client instance

  constructor(
    player1: WebSocket,
    player2: WebSocket,
    gameId: string, // Accept gameId
    prisma: PrismaClient // Accept prisma client
  ) {
    this.player1 = player1;
    this.player2 = player2;
    this.gameId = gameId; // Store gameId
    this.prisma = prisma; // Store prisma client
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

  // Make this method async to update the DB
  async makeMove(socket: WebSocket, move: { from: string; to: string }) {
    // Validate whose turn it is
    if (this.moveCount % 2 === 0 && socket !== this.player1) return;
    if (this.moveCount % 2 === 1 && socket !== this.player2) return;

    try {
      this.board.move(move);
    } catch (e) {
      console.log(e);
      return;
    }

    // Save to DB after a successful move
    await this.prisma.game.update({
      where: { id: this.gameId },
      data: {
        moves: {
          push: JSON.stringify(move), // Push the move object as a string
        },
        board: this.board.fen(), // Update the board FEN string
      },
    });

    if (this.board.isGameOver()) {
      const winner = this.board.turn() === "w" ? "black" : "white";
      // Update game status and winner in DB
      await this.prisma.game.update({
        where: { id: this.gameId },
        data: {
          status: "COMPLETED",
          winner: winner,
        },
      });

      this.player1.send(
        JSON.stringify({ type: GAME_OVER, payload: { winner } })
      );
      this.player2.send(
        JSON.stringify({ type: GAME_OVER, payload: { winner } })
      );
      return;
    }

    // Send the move to the other player
    if (this.moveCount % 2 === 0) {
      this.player2.send(JSON.stringify({ type: MOVE, payload: move }));
    } else {
      this.player1.send(JSON.stringify({ type: MOVE, payload: move }));
    }
    this.moveCount++;
  }
}
