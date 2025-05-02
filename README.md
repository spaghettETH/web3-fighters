# Web3 Fighters - Quadratic Voting Platform

A decentralized voting platform where users can participate in 1v1 debates using quadratic voting principles.

## Features

- **Wallet Authentication**: Connect your wallet and sign a message to verify ownership
- **Anti-Sybil Protection**: Wallet locking mechanism to prevent multiple accounts
- **Quadratic Voting**: Users have 99 credits to spend across multiple debates
- **Master Dashboard**: Special access for master addresses to manage debate statuses
- **Debate Management**: Three states for debates: PENDING, VOTE, and CLOSED

## Technical Stack

- React + TypeScript
- Vite
- Wagmi + RainbowKit for wallet integration
- LocalStorage for wallet locking and credit tracking

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a project on [WalletConnect Cloud](https://cloud.walletconnect.com/) and get your Project ID
4. Replace `YOUR_PROJECT_ID` in `App.tsx` with your Project ID
5. Run the development server:
   ```bash
   npm run dev
   ```

## Wallet Locking System

The platform implements an anti-sybil mechanism that:

- Locks the first wallet used to connect
- Tracks credits used per wallet
- Prevents wallet switching after credits are spent
- Stores wallet state in localStorage

### Wallet States

- **Connected**: User can sign message and access the platform
- **Locked**: User has used credits and cannot switch wallets
- **Unlocked**: User hasn't used credits and can switch wallets

## Voting System

- Each user starts with 99 credits
- Credits are spent quadratically (e.g., 1 vote = 1 credit, 2 votes = 4 credits)
- Votes can only be cast when debates are in VOTE state
- Master addresses can change debate states

## Debate States

1. **PENDING**: Debate is not yet open for voting
2. **VOTE**: Debate is open for voting
3. **CLOSED**: Debate is closed and results are final

## Master Dashboard

Special addresses can:
- Change debate states
- Monitor voting progress
- View total votes per debate

## Project Structure

```
web3-fighters
├─ src/
│  ├─ components/
│  │  ├─ WalletConnect.tsx
│  │  ├─ QuadraticVoting.tsx
│  │  └─ MasterDashboard.tsx
│  ├─ hooks/
│  │  └─ useWalletLock.ts
│  ├─ types/
│  │  └─ index.ts
│  └─ App.tsx
├─ public/
└─ package.json
```

## Security Features

- Wallet signature verification
- Anti-sybil protection through wallet locking
- Credit tracking per wallet
- Master address verification

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT


```
web3-fighters
├─ README.md
├─ eslint.config.js
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
│  ├─ assets
│  │  ├─ ArabFrame.png
│  │  └─ BlockFighters.png
│  └─ vite.svg
├─ src
│  ├─ App.css
│  ├─ App.tsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ MasterDashboard.tsx
│  │  ├─ MatchCreator.css
│  │  ├─ MatchCreator.tsx
│  │  ├─ QuadraticVoting.css
│  │  ├─ QuadraticVoting.tsx
│  │  ├─ WalletConnect.tsx
│  │  └─ WelcomeScreen.tsx
│  ├─ hooks
│  │  └─ useWalletLock.ts
│  ├─ index.css
│  ├─ main.tsx
│  ├─ types
│  │  └─ index.ts
│  └─ vite-env.d.ts
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts

```