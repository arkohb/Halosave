import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ArrowLeftRight, Search, Filter, Download, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatMoney, formatDateTime } from '../../lib/utils.ts';

export const TransactionsTab: React.FC = () => {
  const { transactions, user, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);

  const currency = user?.currency || 'GHS';

  const filteredTx = transactions.filter(tx => {
    const searchVal = (searchTerm || '').toLowerCase();
    const matchesSearch = (tx.vaultName || '').toLowerCase().includes(searchVal) ||
                          (tx.reference || '').toLowerCase().includes(searchVal);
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Vault Name', 'Amount', 'Currency', 'Reference', 'Timestamp', 'Status'];
    const rows = filteredTx.map(t => [t.id, t.type, t.vaultName, t.amount, t.currency, t.reference, t.timestamp, t.status]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HaloSave_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ title: 'CSV Exported 📥', description: 'Transaction history downloaded successfully.', type: 'info' });
  };

  const handleSimulatePDF = (tx: any) => {
    setSelectedTxForReceipt(tx);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
            <ArrowLeftRight className="w-4 h-4" />
            <span>IMMUTABLE LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-halo-dark tracking-tight mt-1">
            Transaction Ledger & Receipts
          </h1>
          <p className="text-xs text-halo-text-tertiary max-w-lg">
            Auditable trail of all Paystack deposits, Databank MFund daily interest accruals, and matured payouts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-3 rounded-2xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs border border-halo-border-hover transition-colors flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-halo-gold" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-halo-card/60 p-4 rounded-2xl border border-halo-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-halo-text-tertiary absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by vault name or receipt ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-halo-cream border border-halo-border rounded-xl pl-11 pr-4 py-2.5 text-xs text-halo-dark focus:outline-none focus:border-halo-gold font-mono"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
          <Filter className="w-4 h-4 text-halo-text-tertiary shrink-0 hidden sm:block" />
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'deposit', label: 'Deposits' },
            { id: 'withdrawal', label: 'Withdrawals' },
            { id: 'interest_accrual', label: 'MFund Interest' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                filterType === f.id
                  ? 'bg-halo-gold/20 text-emerald-300 border border-halo-gold/40 font-bold'
                  : 'bg-halo-cream text-halo-text-tertiary border border-halo-border hover:text-halo-dark'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-halo-card rounded-3xl border border-halo-border shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-halo-cream/80 border-b border-halo-border text-halo-text-tertiary uppercase">
                <th className="py-4 pl-6">TIMESTAMP</th>
                <th className="py-4">TYPE</th>
                <th className="py-4">DESTINATION VAULT</th>
                <th className="py-4">GATEWAY</th>
                <th className="py-4">REFERENCE</th>
                <th className="py-4">AMOUNT</th>
                <th className="py-4 text-right pr-6">RECEIPT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTx.length > 0 ? (
                filteredTx.map((tx) => {
                  const isDep = tx.type === 'deposit' || tx.type === 'interest_accrual';
                  return (
                    <tr key={tx.id} className="hover:bg-halo-secondary/50 transition-colors">
                      <td className="py-4 pl-6 text-halo-text-tertiary whitespace-nowrap">{formatDateTime(tx.timestamp)}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.type === 'deposit'
                            ? 'bg-halo-gold/15 text-emerald-300 border border-halo-gold/30'
                            : tx.type === 'withdrawal'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {tx.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-halo-dark">{tx.vaultName}</td>
                      <td className="py-4 text-halo-text-tertiary">{tx.paymentMethod}</td>
                      <td className="py-4 text-halo-text-secondary font-bold tracking-wider">{tx.reference}</td>
                      <td className={`py-4 font-extrabold text-sm ${isDep ? 'text-halo-gold' : 'text-rose-400'}`}>
                        {isDep ? '+' : '-'}{formatMoney(tx.amount, currency)}
                      </td>
                      <td className="py-4 text-right pr-6">
                        {tx.type === 'deposit' ? (
                          <a
                            href={`/api/payments/receipt/${tx.id}/print?token=${localStorage.getItem('halosave_token') || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-halo-cream hover:bg-halo-secondary text-halo-gold border border-halo-border transition-colors inline-flex items-center gap-1"
                            title="Print Official Receipt"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px]">RECEIPT</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleSimulatePDF(tx)}
                            className="p-2 rounded-xl bg-halo-cream hover:bg-halo-secondary text-cyan-400 border border-halo-border transition-colors inline-flex items-center gap-1"
                            title="Generate Ledger Details"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px]">INFO</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-halo-text-muted">
                    No transactions matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated PDF Receipt Modal */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-halo-cream/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-halo-card border border-halo-border rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6 font-mono text-xs">
            
            <div className="flex justify-between items-center border-b border-halo-border pb-4">
              <div className="flex items-center gap-2 text-halo-gold font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>OFFICIAL HALOSAVE RECEIPT</span>
              </div>
              <button onClick={() => setSelectedTxForReceipt(null)} className="text-halo-text-tertiary hover:text-halo-dark">✕</button>
            </div>

            <div className="space-y-3 bg-halo-cream p-5 rounded-2xl border border-halo-border">
              <div className="flex justify-between text-halo-text-tertiary">
                <span>RECEIPT REF</span>
                <span className="text-halo-dark font-bold">{selectedTxForReceipt.reference}</span>
              </div>
              <div className="flex justify-between text-halo-text-tertiary">
                <span>TRANSACTION TYPE</span>
                <span className="text-halo-gold font-bold uppercase">{selectedTxForReceipt.type}</span>
              </div>
              <div className="flex justify-between text-halo-text-tertiary">
                <span>TARGET VAULT</span>
                <span className="text-halo-dark">{selectedTxForReceipt.vaultName}</span>
              </div>
              <div className="flex justify-between text-halo-text-tertiary">
                <span>PAYMENT METHOD</span>
                <span className="text-halo-dark">{selectedTxForReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-halo-text-tertiary border-t border-halo-border pt-2">
                <span>DATETIME</span>
                <span className="text-halo-dark">{formatDateTime(selectedTxForReceipt.timestamp)}</span>
              </div>
            </div>

            <div className="text-center py-2 bg-gradient-to-r from-halo-gold/10 to-teal-500/10 rounded-2xl border border-halo-gold/20">
              <span className="text-[10px] text-halo-text-tertiary block">TOTAL VERIFIED AMOUNT</span>
              <span className="text-2xl font-extrabold text-halo-dark">{formatMoney(selectedTxForReceipt.amount, currency)}</span>
            </div>

            <button
              onClick={() => {
                showToast({ title: 'Simulated PDF Downloaded', description: `Receipt ${selectedTxForReceipt.reference}.pdf saved.`, type: 'success' });
                setSelectedTxForReceipt(null);
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 text-halo-dark font-bold transition-all shadow-lg shadow-halo-gold/20"
            >
              Download PDF Document
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
