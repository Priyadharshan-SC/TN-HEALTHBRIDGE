import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OverviewView from '../../components/OverviewView';
import TransactionModal from '../../components/TransactionModal';

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [selectedTxn, setSelectedTxn] = useState(null);

  const handleNavigate = (section) => {
    const map = {
      'overview': '/admin/overview',
      'transfers': '/admin/transfers',
      'patient-identity': '/admin/patients',
      'organizations': '/admin/organizations',
      'org-access': '/admin/users',
      'audit-logs': '/admin/audit-logs',
      'system-status': '/admin/settings',
      'consents': '/admin/consents',
    };
    navigate(map[section] || `/admin/${section}`);
  };

  return (
    <div>
      <OverviewView
        onNavigate={handleNavigate}
        onViewTransaction={(txn) => setSelectedTxn(txn)}
      />
      {selectedTxn && (
        <TransactionModal
          isOpen={!!selectedTxn}
          onClose={() => setSelectedTxn(null)}
          transaction={selectedTxn}
        />
      )}
    </div>
  );
}

