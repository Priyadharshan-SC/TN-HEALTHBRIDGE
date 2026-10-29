import React from 'react';
import { X, ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowRight, Copy, Check } from 'lucide-react';

export default function TransactionModal({ transaction, patient, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const handleCopyHash = () => {
    if (transaction.details?.hash) {
      navigator.clipboard.writeText(transaction.details.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return (
          <span className="modal-status-badge status-success">
            <CheckCircle2 size={14} /> Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="modal-status-badge status-pending">
            <Clock size={14} /> In Flight
          </span>
        );
      case 'Failed':
        return (
          <span className="modal-status-badge status-failed">
            <AlertTriangle size={14} /> Failed Delivery
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-row">
              <h2>Transaction Details</h2>
              <span className="modal-txn-code">{transaction.txnId}</span>
              {getStatusBadge(transaction.status)}
            </div>
            <p className="modal-subtitle">
              Secure health data exchange record between connected health nodes
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Exchange Route Banner */}
          <div className="route-banner">
            <div className="route-node">
              <span className="route-label">Origin Facility</span>
              <strong className="route-value">{transaction.source}</strong>
            </div>
            <div className="route-arrow-box">
              <ArrowRight size={20} />
            </div>
            <div className="route-node">
              <span className="route-label">Destination Facility</span>
              <strong className="route-value">{transaction.destination}</strong>
            </div>
          </div>

          {/* Details Grid */}
          <div className="modal-grid">
            <div className="modal-info-item">
              <span className="modal-label">Patient</span>
              <strong className="modal-val">{patient.name} ({patient.id})</strong>
            </div>
            <div className="modal-info-item">
              <span className="modal-label">Data Type</span>
              <strong className="modal-val">{transaction.dataType}</strong>
            </div>
            <div className="modal-info-item">
              <span className="modal-label">Date & Time</span>
              <strong className="modal-val">{transaction.dateTime.replace('\n', ' ')}</strong>
            </div>
            <div className="modal-info-item">
              <span className="modal-label">Interoperability Standard</span>
              <strong className="modal-val">{transaction.details?.hl7Version || 'HL7 FHIR R4'}</strong>
            </div>
            <div className="modal-info-item">
              <span className="modal-label">Transport Protocol</span>
              <strong className="modal-val">{transaction.details?.protocol || 'REST API / TLS 1.3'}</strong>
            </div>
            <div className="modal-info-item">
              <span className="modal-label">Execution Latency</span>
              <strong className="modal-val">{transaction.details?.duration || '230ms'}</strong>
            </div>
          </div>

          {/* Cryptographic Verification */}
          <div className="crypto-audit-box">
            <div className="crypto-header">
              <div className="crypto-title">
                <ShieldCheck size={16} className="crypto-icon" />
                <span>TN Interoperability Cryptographic Signature</span>
              </div>
              <button className="btn-copy-hash" onClick={handleCopyHash}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Hash</>}
              </button>
            </div>
            <code className="crypto-hash-code">
              {transaction.details?.hash || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
            </code>
          </div>

          {/* Summary / Clinical Note */}
          <div className="clinical-summary-box">
            <span className="modal-label">Payload Summary</span>
            <p className="clinical-summary-text">
              {transaction.details?.summary || 'Standard health data exchange envelope with clinical observations and signed results.'}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>Close</button>
          <button className="btn-modal-primary" onClick={() => alert(`Downloading HL7/FHIR Payload for ${transaction.txnId}`)}>
            Export FHIR Bundle (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
