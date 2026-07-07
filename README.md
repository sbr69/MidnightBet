# MidnightBet 🌙

A multiplayer ZK number guessing game on the Midnight blockchain.

## Project Structure

```
MidnightBet/
├── contract/          # Compact smart contract (ZK circuits)
│   ├── src/           # guessing-game.compact source
│   ├── managed/       # Compiled ZK circuits, keys, TS bindings (generated)
│   └── test/          # Vitest test suite
├── dapp/              # DApp integration layer (TypeScript)
│   └── src/
│       ├── game-api.ts    # Witnesses, helpers, state mapping
│       ├── providers.ts   # Midnight SDK provider configuration
│       └── deploy.ts      # Deployment script
└── frontend/          # React + Tailwind frontend
    └── src/
        └── components/    # Home, CreateGame, GameArena
```

---

## Prerequisites

### 1. Compact Compiler
The contract is compiled with the Midnight `compact` CLI. If you need to recompile:
```bash
# In WSL:
~/.local/bin/compact compile contract/src/guessing-game.compact contract/managed/guessing-game
```

### 2. Docker Services (Required for local development)

You need three Docker services running before the DApp can interact with the blockchain:

```yaml
# docker-compose.yml (place in project root)
version: '3.8'
services:
  midnight-node:
    image: midnightnetwork/proof-server:latest
    ports:
      - "9944:9944"
    environment:
      - NETWORK_ID=undeployed

  proof-server:
    image: midnightnetwork/proof-server:latest
    ports:
      - "6300:6300"
    volumes:
      - ./contract/managed:/keys:ro
    environment:
      - KEYS_DIR=/keys

  indexer:
    image: midnightnetwork/indexer:latest
    ports:
      - "8088:8088"
    environment:
      - NODE_URI=http://midnight-node:9944
```

**Start services:**
```bash
docker-compose up -d
```

**Verify services are healthy:**
```bash
curl http://localhost:6300/health       # proof-server
curl http://localhost:8088/api/v1/health # indexer
```

### 3. Lace Wallet
- Install the [Lace Wallet](https://www.lace.io/) browser extension
- Enable the Midnight DApp connector in Lace settings
- Fund your wallet with tDUST from the [Midnight faucet](https://faucet.midnight.network/)

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Deploying the Contract

```bash
cd dapp
npm install
npm run deploy
# Generates deployment.json with contract address + private state
```

---

## Game Flow

1. **Create Game** → Creator sets players, range, stake → ZK contract deployed with private target hash
2. **Share Invite Link** → URL encodes the contract address
3. **Players Join** → Each pays stake → once all joined, game starts
4. **Round-Based Guessing** → All players guess once per round → next round starts when everyone guesses
5. **Win** → Creator's `declareWinner` verifies a player's guess matches the private target via ZK proof
6. **Refund** → If all give up, or lobby incomplete → full stake refund

---

## Privacy Model

| What | On-Chain? |
|------|-----------|
| Game parameters (range, stake, players) | ✅ Public |
| Target number | ❌ Private (ZK witness) |
| Target hash (commitment) | ✅ Public |
| Player public keys | ✅ Public (disclosed on join) |
| Individual guesses (the number) | ✅ Public (disclosed on submit — by design for round tracking) |
| Winner | ✅ Public |
