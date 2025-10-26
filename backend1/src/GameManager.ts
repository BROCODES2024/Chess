import { WebSocket } from "ws";
import { INIT_GAME, MOVE } from "./messages.js";
import { Game } from "./Game.js";
import { PrismaClient } from "@prisma/client"; // Import PrismaClient

export class GameManager {
  private games: Game[];
  private pendingUser: WebSocket | null;
  private users: WebSocket[];
  private prisma: PrismaClient; // Add prisma client instance

  constructor() {
    this.games = [];
    this.pendingUser = null;
    this.users = [];
    this.prisma = new PrismaClient(); // Initialize prisma client
  }

  addUser(socket: WebSocket) {
    this.users.push(socket);
    this.addHandler(socket);
  }

  removeUser(socket: WebSocket) {
    this.users = this.users.filter((user) => user !== socket);
    // Stop the game here because the user left
  }

  // Make this handler async to await the database call
  private addHandler(socket: WebSocket) {
    socket.on("message", async (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === INIT_GAME) {
        if (this.pendingUser) {
          // Create a game record in the database
          const gameDb = await this.prisma.game.create({
            data: {
              player1Id: "white", // Placeholder IDs
              player2Id: "black",
              board: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Initial FEN
              moves: [],
            },
          });

          // Start a new game, passing the DB id and prisma client
          const game = new Game(
            this.pendingUser,
            socket,
            gameDb.id,
            this.prisma
          );
          this.games.push(game);
          this.pendingUser = null;
        } else {
          this.pendingUser = socket;
        }
      }

      if (message.type === MOVE) {
        const game = this.games.find(
          (game) => game.player1 === socket || game.player2 === socket
        );
        if (game) {
          game.makeMove(socket, message.payload.move);
        }
      }
    });
  }
}
