# MidnightBet

A multiplayer zero-knowledge number guessing game on the Midnight blockchain. The host commits to a private target; players stake in-contract tokens, guess in rounds, and the host declares the winner with a ZK proof.

This is not a sportsbook.

## Prerequisites

- Node.js 22+
- [Compact compiler](https://docs.midnight.network/getting-started/installation#install-compact) (contract is already compiled in `contract/managed/`)
- A Midnight-compatible browser wallet:
  - **[1AM Wallet](https://1am.xyz/) (Recommended):** Native remote ZK proving (ProofStation) and DUST sponsorship — **no Docker required!**
  - **[Lace Wallet](https://www.lace.io/):** Official IOG wallet extension.
- Midnight **Preview** network tokens:
  - tNIGHT from the Midnight Preview faucet, then register/generate tDUST in your wallet.

## Compile the contract

The contract is already compiled under `contract/managed/guessing-game/`. If you modify `contract/src/guessing-game.compact`, recompile:

```bash
npm run compile
# expands to: compact compile contract/src/guessing-game.compact contract/managed/guessing-game
```

Copy proving keys into the frontend (`keys/` and `zkir/`):

```bash
npm run copy-zk
```

## ZK Prover (No Docker Needed with 1AM Wallet)

- **With 1AM Wallet:** 1AM includes built-in remote ZK proving (**ProofStation**). You do **not** need to run any local containers.
- **Optional Local Prover (Docker):** If you are using Lace and need a local prover:
  ```bash
  npm run proof-server
  # runs proof-server on http://localhost:6300
  ```

## Run the DApp (Preview Network)

```bash
# Start the frontend dev server
npm run frontend
# or: npm run dev --prefix frontend
# Opens http://localhost:3000
```

Connect your wallet (**1AM** or **Lace**), create a game (this deploys the contract directly to Midnight Preview from your browser), share `/?game=<address>`, and play.

## Scripts that do not deploy

| Command | What it does |
| --- | --- |
| `npm run prepare-deploy` | Writes gitignored `deployment.json` with a local target commitment. **Does not** submit a transaction. |
| `npm run --prefix dapp cli -- hash` | Prints a `persistentCommit` matching Compact. |

## Game flow

1. Host sets players, range, stake. The target is committed with Compact `persistentCommit`.
2. Invite URL encodes the contract address.
3. Each player calls `faucet` (test balances) then `joinGame`.
4. One guess per round; the round advances when all active players have guessed.
5. Host `declareWinner` when a stored guess matches the private target.
6. `giveUp` / host `cancelGame` → `Cancelled` → `claimRefund`.

## Privacy

| What | On-chain? |
| --- | --- |
| Range, stake, player count | Public |
| Target number | Private until a winner is declared |
| Target commitment | Public |
| Guesses | Public (round tracking) |

## Layout

- `contract/` — Compact circuits
- `dapp/` — midnight-js providers, witnesses, `callTx` helpers
- `frontend/` — React UI (Lace + live ledger)
