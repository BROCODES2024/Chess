# ♟️ Chess Online

**Chess Online** is a real-time, multiplayer chess application built with a modern tech stack. It leverages **WebSocket technology** for instant move synchronization and a persistent backend to ensure game state is never lost. The project features a clean React frontend and a robust Node.js backend.

---

## ✨ Features

- **Real-Time Multiplayer:** Play chess against another person in real-time with instant move updates.
- **Player Matchmaking:** The server automatically pairs a waiting player with the next one who joins.
- **Move Validation:** The backend validates each move according to the rules of chess.
- **Persistent Game State:** Games are saved in a database, allowing for recovery after a server disconnect or crash.
- **Clean UI:** A simple and intuitive chessboard interface built with React.

---

## 🛠️ Tech Stack

### Backend

- Runtime: **Node.js**
- Language: **TypeScript**
- Real-Time Communication: **WebSocket (`ws` library)**
- Database ORM: **Prisma**
- Database: **PostgreSQL** (as per Prisma schema)

### Frontend

- Framework: **React**
- Language: **TypeScript**
- Build Tool: **Vite**
- Styling: **Tailwind CSS**

---

## 🏛️ Architecture

The application's architecture is designed to evolve from a simple, stateful model to a highly scalable, resilient system.

### Current Architecture (Initial Design)

As detailed in `docs/current/Initial.png`, the initial design is a simple client-server model. Two players connect directly to a single Node.js WebSocket server. The server holds all active game data, including player information and the list of moves, in its memory.

- **Pros:** Simple to implement and very fast for active games.
- **Cons:** This is a **stateful** design. If the server crashes, all game progress is lost because the data is not persisted.

<!-- end list -->

```
+----------+      <-- WebSocket -->      +--------------------------+
|          |      (Game Events)        |                          |
| Player 1 |                           |  Server (Node.js + ws)   |
| (React)  |                           |                          |
+----------+      <-----------------     +-----------+--------------+
                                                      |
+----------+                                          | (Game Logic & State)
|          |                                          ↓
| Player 2 |                           +----------------------------+
| (React)  |                           |      In-Memory State       |
+----------+                           | (games, moves, players)    |
      ^                                |                            |
      |--------- WebSocket -----------+----------------------------+

```

### Future Architecture (Scalable & Resilient)

Based on the recovery and scaling mechanisms outlined in the `docs/future/` diagrams, the future architecture is designed for scalability and persistence. It introduces a database, a caching layer, and a Pub/Sub model to support a fleet of stateless servers.

```
+----------+ 1. Connects via Load Balancer
|          |------------------------------------->+-----------------+
| Players  |                                      |  Load Balancer  |
|          |<-------------------------------------+-----------------+
+----------+                                              | 2. Assigns connection
                                                          v
                                     +----------+----------+----------+
                                     | Server 1 | Server 2 | Server N |
                                     +----------+----------+----------+
                                           ^         |          ^
                            (Pub/Sub)      |         | 3. Publish Move
                           +---------------+         +--------------->+-----------------+
                           |                                          |   Pub/Sub System|
                     +-----------------+                              |   (e.g., Redis) |
4. Broadcasts Move   | Active Game State |<--------------------------+-----------------+
   to Subscribers -> | (Redis Cache)     |    (Moves, Player Info)           |
                     +-----------------+                                    | 5. Persist Move
                           ^                                                v
                           | (Read/Write for Recovery)              +-----------------+
                           |                                        |   PostgreSQL DB |
                           +----------------------------------------|  (Game History) |
                                                                    +-----------------+
```

**Key Components & Their Roles:**

1.  **Load Balancer:** Distributes incoming WebSocket connections across multiple backend servers.
2.  **Stateless Servers:** A fleet of Node.js servers that manage client connections but do not store long-term game state themselves.
3.  **Pub/Sub System (e.g., Redis):** When a player on Server 1 makes a move, the server publishes that move to a game-specific channel (e.g., `game-123`).
4.  **Active Game State (Cache):** The Pub/Sub system (or a dedicated Redis cache) also holds the current state of active games (board position, whose turn it is). This is the hybrid model from `Recovery mechanism.png`—it keeps hot data in memory for speed.
5.  **Database (PostgreSQL):** A separate database stores the full history of all moves for every game. This is used for persistence, recovery, and post-game analysis. When a game needs to be loaded into the cache (e.g., after a server crash), it's read from this database.

---

## 📈 Scalability and Tradeoffs

### Scalability Benefits

- **Horizontal Scaling:** The stateless server design allows us to add more servers as the number of concurrent players grows.
- **High Availability:** If one server goes down, the load balancer redirects players to healthy ones. Games can be recovered from the database/cache.
- **Performance:** Using an in-memory cache (Redis) for active games ensures low-latency moves, while the database provides robust, long-term storage without slowing down gameplay.
- **Data Persistence:** No game data is ever lost due to a server crash.

### Tradeoffs

- **Increased Complexity:** This distributed system is significantly more complex to set up, manage, and debug than the initial single-server model.
- **Infrastructure Cost:** Requires running a load balancer, multiple servers, a Redis instance, and a PostgreSQL database, leading to higher costs.
- **Latency:** While minimal, there is a slight network latency overhead for communication between the servers, Redis, and PostgreSQL.

---

## 🚧 Challenges and Learnings

- **State Management:** The biggest challenge is managing game state. The initial in-memory approach is simple but fragile. The future architecture solves this by separating **hot state** (active games in a fast cache) from **cold state** (completed games and move history in a persistent DB).
- **Real-Time Sync:** Ensuring that both players see the exact same game state at all times, even with potential network delays, requires a robust event-driven system (which WebSockets and Pub/Sub provide).
- **Move Validation:** Implementing the complex rules of chess on the backend is crucial for preventing cheating and ensuring fair play.
- **Learnings:** This project highlights the classic architectural evolution of a real-time application: start simple and stateful, identify the single points of failure (memory), introduce persistence (DB), and finally, design for scale by making servers stateless and using a central messaging/caching layer.

---

## 🛣️ Future Work

1.  **Implement Full Scalable Architecture:** Transition from the current model to the future architecture using a load balancer, Redis, and multiple server instances.
2.  **User Authentication:** Add user accounts, profiles, and ratings (e.g., ELO system).
3.  **Enhanced Game Features:**
    - Spectator mode.
    - Game history and replays.
    - Different time controls (Blitz, Rapid, Classical).
    - In-game chat.
    - Offer/accept draw functionality.
4.  **Improved Matchmaking:** Implement skill-based matchmaking based on user ratings.
5.  **Deployment & DevOps:**
    - Containerize the application using Docker.
    - Set up a CI/CD pipeline for automated testing and deployment.
    - Deploy the architecture on a cloud platform using an orchestration tool like Kubernetes.

---

## 🚀 Getting Started

### ✅ Prerequisites

- Install [Node.js](https://nodejs.org/) (comes with npm).
- A running PostgreSQL database instance.

### 📥 Installation & Setup

Clone the repository:

```bash
git clone https://github.com/BROCODES2024/Chess.git
cd Chess
```

#### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend1
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your database connection string in a `.env` file (you may need to create one).
4.  Run Prisma migrations to set up the database schema:
    ```bash
    npx prisma migrate dev
    ```

#### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

---

### ▶️ Running the Application

You need **two terminals** open.

**Start the Backend Server**

```bash
cd backend1
npm start
```

_Runs WebSocket server, typically on `ws://localhost:8080`_

**Start the Frontend Application**

```bash
cd frontend
npm run dev
```

_Runs frontend on `http://localhost:5173`_

Open two browser tabs to `http://localhost:5173` to start a game between two players.
