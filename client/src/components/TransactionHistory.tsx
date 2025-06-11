import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { List, Lock, Send, Play, ArrowUp, ExternalLink } from "lucide-react";
import { formatAddress } from "@/lib/web3";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";

interface DatabaseTransaction {
  id: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  status: string;
  txHash: string | null;
  blockNumber: number | null;
  tokenAddress: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface Transaction {
  id: string;
  type: 'transfer';
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed' | 'validated' | 'permanently_failed';
  timestamp: string;
  txHash?: string;
  tokenAddress?: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'lock':
      return <Lock className="text-green-400 h-4 w-4" />;
    case 'transfer':
      return <Send className="text-primary h-4 w-4" />;
    case 'execute':
      return <Play className="text-secondary h-4 w-4" />;
    case 'withdrawal':
      return <ArrowUp className="text-yellow-400 h-4 w-4" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>;
    case 'pending':
    case 'validated':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    case 'failed':
    case 'permanently_failed':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export function TransactionHistory() {
  const { account } = useWallet();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', account],
    queryFn: async () => {
      if (!account) return { transactions: [] };
      const response = await fetch(`/api/transactions/${account}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!account,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const transactions: Transaction[] = (data?.transactions || []).map((tx: DatabaseTransaction) => ({
    id: tx.id.toString(),
    type: 'transfer' as const,
    from: tx.fromAddress,
    to: tx.toAddress,
    amount: parseFloat(tx.amount).toFixed(3),
    status: tx.status as Transaction['status'],
    timestamp: formatTimestamp(tx.createdAt),
    txHash: tx.txHash || undefined,
    tokenAddress: tx.tokenAddress || undefined,
  }));
  return (
    <Card className="mt-8 bg-dark-light border-surface overflow-hidden">
      <div className="p-6 border-b border-surface">
        <h3 className="text-lg font-semibold flex items-center">
          <List className="mr-2 text-primary" />
          Transaction History
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr className="text-sm text-gray-400">
              <th className="text-left px-6 py-3">Type</th>
              <th className="text-left px-6 py-3">From</th>
              <th className="text-left px-6 py-3">To</th>
              <th className="text-left px-6 py-3">Amount</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Time</th>
              <th className="text-left px-6 py-3">Tx Hash</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Loading transactions...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-red-400">
                  Failed to load transactions
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-surface">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-surface-light rounded-full flex items-center justify-center">
                      {getTypeIcon(tx.type)}
                    </div>
                    <span className="capitalize">{tx.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{formatAddress(tx.from)}</td>
                <td className="px-6 py-4 font-mono text-xs">{formatAddress(tx.to)}</td>
                <td className="px-6 py-4 font-semibold">
                  {tx.amount} {tx.tokenAddress ? 'USDT' : 'ETH'}
                </td>
                <td className="px-6 py-4">{getStatusBadge(tx.status)}</td>
                <td className="px-6 py-4 text-gray-400">{tx.timestamp}</td>
                <td className="px-6 py-4">
                  {tx.txHash ? (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-blue-400 font-mono text-xs flex items-center gap-1"
                    >
                      {formatAddress(tx.txHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      {tx.status === 'pending' ? 'Signature created' : '-'}
                    </span>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
