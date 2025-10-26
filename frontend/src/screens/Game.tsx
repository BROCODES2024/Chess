import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { Chess } from "chess.js";

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

interface MoveHistory {
  from: string;
  to: string;
  san?: string;
}

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);
  const [moves, setMoves] = useState<MoveHistory[]>([]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case INIT_GAME:
          // Reset the game when initialized
          const newChess = new Chess();
          setChess(newChess);
          setBoard(newChess.board());
          setStarted(true);
          setMoves([]);
          console.log("Game initialized");
          break;

        case MOVE:
          const move = message.payload;
          console.log("Processing move:", move);

          // Create a new chess instance to avoid stale state
          setChess((prevChess) => {
            const newChess = new Chess(prevChess.fen());
            try {
              const result = newChess.move(move);
              if (result) {
                setMoves((prevMoves) => [
                  ...prevMoves,
                  { ...move, san: result.san },
                ]);
                setBoard(newChess.board());
                console.log("Move applied successfully:", result.san);
              }
            } catch (e) {
              console.error("Failed to apply move:", e);
            }
            return newChess;
          });
          break;

        case GAME_OVER:
          console.log("Game over:", message.payload);
          alert(`Game Over! Winner: ${message.payload.winner}`);
          break;
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket]);

  if (!socket)
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Connecting...
      </div>
    );

  return (
    <div className="justify-center flex">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4 w-full flex justify-center">
            <ChessBoard
              chess={chess}
              setBoard={setBoard}
              socket={socket}
              board={board}
            />
          </div>
          <div className="col-span-2 bg-slate-900 w-full flex flex-col">
            <div className="pt-8 flex justify-center">
              {!started && (
                <Button
                  onClick={() => {
                    socket.send(
                      JSON.stringify({
                        type: INIT_GAME,
                      })
                    );
                  }}
                >
                  Play
                </Button>
              )}
            </div>

            {started && (
              <div className="mt-4 px-4">
                <h2 className="text-white text-xl font-bold mb-4">Moves</h2>
                <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {moves.length === 0 ? (
                    <p className="text-gray-400 text-sm">No moves yet</p>
                  ) : (
                    <div className="space-y-1">
                      {moves.map((move, index) => (
                        <div
                          key={index}
                          className="text-white text-sm flex items-center"
                        >
                          <span className="font-mono text-gray-400 w-8">
                            {Math.floor(index / 2) + 1}.
                          </span>
                          <span className="font-mono">
                            {move.san || `${move.from}-${move.to}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
