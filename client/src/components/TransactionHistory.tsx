import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { List, Lock, Send, Play, ArrowUp, ExternalLink } from "lucide-react";
import { formatAddress } from "@/lib/web3";

interface Transaction {
  id: string;
  type: 'lock' | 'transfer' | 'execute' | 'withdrawal';
  from: string;
  to?: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  txHash?: string;
}

// Mock data - in real app this would come from API or events
const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "lock",
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    to: "Contract",
    amount: "2.500",
    status: "confirmed",
    timestamp: "2h ago",
    txHash: "0xabc123...def789"
  },
  {
    id: "2",
    type: "transfer",
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amount: "1.000",
    status: "pending",
    timestamp: "5h ago"
  },
  {
    id: "3",
    type: "execute",
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    amount: "0.750",
    status: "confirmed",
    timestamp: "1d ago",
    txHash: "0xdef456...abc123"
  }
];

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
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
    default:
      return null;
  }
};

export function TransactionHistory() {
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
            {mockTransactions.map((tx) => (
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
                <td className="px-6 py-4 font-mono text-xs">
                  {tx.to === "Contract" ? "Contract" : (tx.to ? formatAddress(tx.to) : "-")}
                </td>
                <td className="px-6 py-4 font-semibold">{tx.amount} ETH</td>
                <td className="px-6 py-4">{getStatusBadge(tx.status)}</td>
                <td className="px-6 py-4 text-gray-400">{tx.timestamp}</td>
                <td className="px-6 py-4">
                  {tx.txHash ? (
                    <a 
                      href={`#`} 
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
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
