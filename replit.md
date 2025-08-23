# AION Protocol - Decentralized Payment Infrastructure

## Overview

AION Protocol is a decentralized payment infrastructure that enables secure off-chain payments with on-chain settlement. The system allows users to lock ETH and ERC20 tokens in a smart contract, create cryptographically signed transfer messages off-chain, and execute these transfers through a relayer backend for instant settlement. The protocol includes built-in security mechanisms like withdrawal delays and grace periods to prevent malicious activity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **State Management**: React Context API for wallet state, TanStack Query for server state
- **Web3 Integration**: Ethers.js v5 for blockchain interactions and MetaMask connectivity
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js web server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server for live transaction updates
- **Transaction Processing**: Queue-based system with retry logic and exponential backoff
- **Session Management**: Express sessions with PostgreSQL store

### Smart Contract Integration
- **Protocol**: EIP-712 structured data signatures for user-friendly signing
- **Contract Functions**: Lock funds (ETH/ERC20), execute transfers, initiate/cancel withdrawals
- **Security Features**: 10-minute withdrawal delay, 5-minute grace period for cancellations
- **Token Support**: Native ETH and ERC20 tokens with wrapped token functionality

### Relayer System Design
- **Transaction Executor**: Automated execution of signed transfer messages
- **Validation Engine**: Comprehensive pre-flight checks for signature validity, fund availability
- **Queue Management**: In-memory processing with configurable concurrency limits
- **State Machine**: Multi-state transaction lifecycle (received → validated → pending → confirmed)
- **Error Handling**: Smart retry logic distinguishing temporary vs permanent failures

### Data Storage Schema
- **Users Table**: Basic user authentication and account management
- **Signed Transfers Table**: Complete transaction lifecycle tracking with metadata
- **Transaction Logs Table**: Immutable audit trail of all state changes
- **Transactions Table**: General transaction history for different operation types

## External Dependencies

### Blockchain Infrastructure
- **Ethereum Network**: Sepolia testnet for development, mainnet for production
- **JSON-RPC Provider**: Infura as primary provider with fallback support
- **Smart Contract**: AION protocol contract deployed on Ethereum

### Database Services
- **PostgreSQL**: Primary database using Neon serverless for cloud deployment
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Modern icon library with consistent design
- **Class Variance Authority**: Type-safe variant styling system

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast bundling for production server builds
- **TSX**: TypeScript execution for development server

### Web3 Libraries
- **Ethers.js**: Ethereum library for wallet connections and contract interactions
- **MetaMask Integration**: Browser wallet connectivity and transaction signing
- **EIP-712**: Structured data signing for improved user experience

### Real-time Features
- **WebSocket (ws)**: Native WebSocket implementation for real-time updates
- **TanStack Query**: Client-side caching and synchronization of server state