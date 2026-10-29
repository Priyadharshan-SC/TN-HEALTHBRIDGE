import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Download
} from 'lucide-react';
import PatientDetailsDrawer from './PatientDetailsDrawer';
const mockPatientsExtended = [];

export default function PatientRecordsView({ onViewTransaction }) {
  const [patients] = useState(mockPatientsExtended);
  const [selectedPatient, setSelectedPatient] = useState(mockPatientsExtended[0]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('All Organizations');
  const [dateRange] = useState('Oct 20, 2024 – Oct 27, 2024');
  const [recordType, setRecordType] = useState('All Types');
  const [transferStatus, setTransferStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedOrg('All Organizations');
    setRecordType('All Types');
    setTransferStatus('All Status');
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
  };

  // Filter logic
  const filteredPatients = patients.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.organizations.some(org => org.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (selectedOrg !== 'All Organizations' && !p.organizations.some(org => org.includes(selectedOrg))) {
      return false;
    }
    return true;
  });

  return (
    <div className="page-wrapper patient-records-page">
      {/* Header Banner */}
      <div className="page-header-banner">
        <h1 className="page-main-heading">Patient Records</h1>
        <p className="page-subheading">
          Search and view patient information and their associated data transfer transactions
        </p>
      </div>

      {/* Top Filter Card */}
      <div className="patient-filters-card">
        <div className="filters-row-1">
          {/* Search Patient */}
          <div className="filter-item flex-patient-search">
            <label className="filter-label">Search Patient</label>
            <div className="filter-input-wrap">
              <Search size={15} className="filter-icon" />
              <input
                type="text"
                placeholder="Search by Patient ID, Name, Transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Organization */}
          <div className="filter-item flex-org">
            <label className="filter-label">Organization</label>
            <div className="filter-select-wrap">
              <select 
                value={selectedOrg} 
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="All Organizations">All Organizations</option>
                <option value="City Hospital">City Hospital</option>
                <option value="Central Lab">Central Lab</option>
                <option value="Metro Hospital">Metro Hospital</option>
                <option value="Sunrise Hospital">Sunrise Hospital</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Date Range */}
          <div className="filter-item flex-date">
            <label className="filter-label">Date Range</label>
            <div className="filter-input-wrap">
              <Calendar size={15} className="filter-icon" />
              <input
                type="text"
                value={dateRange}
                readOnly
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="filter-item flex-btn">
            <button className="btn-search-blue">Search</button>
          </div>
        </div>

        <div className="filters-row-2">
          {/* Record Type */}
          <div className="filter-item flex-select">
            <label className="filter-label">Record Type</label>
            <div className="filter-select-wrap">
              <select 
                value={recordType} 
                onChange={(e) => setRecordType(e.target.value)}
              >
                <option value="All Types">All Types</option>
                <option value="Observation">Observation</option>
                <option value="Diagnostic Report">Diagnostic Report</option>
                <option value="Medication">Medication</option>
                <option value="Allergy Intolerance">Allergy Intolerance</option>
                <option value="Procedure">Procedure</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Transfer Status */}
          <div className="filter-item flex-select">
            <label className="filter-label">Transfer Status</label>
            <div className="filter-select-wrap">
              <select 
                value={transferStatus} 
                onChange={(e) => setTransferStatus(e.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="filter-item flex-clear-btn">
            <button className="btn-clear-filters" onClick={handleClearFilters}>
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid: Patients Directory Table + Patient Details Drawer */}
      <div className={`patient-layout-grid ${isDetailsOpen ? 'has-drawer' : 'full-table'}`}>
        {/* Left Column: Patients Table Card */}
        <div className="patients-table-card">
          <div className="patients-table-header">
            <h2 className="patients-table-title">
              Patients <span className="patients-count">(1,248)</span>
            </h2>
            <button 
              className="btn-export-outline"
              onClick={() => alert('Exporting patient registry as CSV...')}
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="patients-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>Patient ID</th>
                  <th style={{ width: '15%' }}>Patient Name</th>
                  <th style={{ width: '15%' }}>Date of Birth</th>
                  <th style={{ width: '27%' }}>Organizations</th>
                  <th style={{ width: '14%' }}>Total Transactions</th>
                  <th style={{ width: '14%' }}>Last Activity</th>
                  <th style={{ width: '2%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const isSelected = selectedPatient?.id === patient.id && isDetailsOpen;
                  return (
                    <tr
                      key={patient.id}
                      className={`patient-row ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <td>
                        <button 
                          className="patient-id-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPatient(patient);
                          }}
                        >
                          {patient.id}
                        </button>
                      </td>
                      <td className="col-patient-name">{patient.name}</td>
                      <td className="col-dob">{patient.dob}</td>
                      <td className="col-orgs">{patient.organizations.join(', ')}</td>
                      <td className="col-txns">{patient.totalTransactions}</td>
                      <td className="col-last-act">{patient.lastActivity}</td>
                      <td className="col-chevron">
                        <ChevronRight size={16} className="table-chevron-icon" />
                      </td>
                    </tr>
                  );
                })}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan="7" className="table-empty-row">
                      No patients match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="patients-pagination-footer">
            <span className="pagination-info">Showing 1-10 of 1,248 patients</span>

            <div className="pagination-pages-group">
              <button 
                className="page-nav-btn" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <button 
                className={`page-num-btn ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
              <button 
                className={`page-num-btn ${currentPage === 2 ? 'active' : ''}`}
                onClick={() => setCurrentPage(2)}
              >
                2
              </button>
              <button 
                className={`page-num-btn ${currentPage === 3 ? 'active' : ''}`}
                onClick={() => setCurrentPage(3)}
              >
                3
              </button>
              <button 
                className={`page-num-btn ${currentPage === 4 ? 'active' : ''}`}
                onClick={() => setCurrentPage(4)}
              >
                4
              </button>
              <button 
                className={`page-num-btn ${currentPage === 5 ? 'active' : ''}`}
                onClick={() => setCurrentPage(5)}
              >
                5
              </button>
              <span className="page-ellipsis">...</span>
              <button 
                className="page-num-btn"
                onClick={() => setCurrentPage(125)}
              >
                125
              </button>

              <button 
                className="page-nav-btn"
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="page-size-selector">
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
              <ChevronDown size={14} className="select-arrow" />
            </div>
          </div>
        </div>

        {/* Right Column: Patient Details Drawer */}
        {isDetailsOpen && selectedPatient && (
          <PatientDetailsDrawer
            patient={selectedPatient}
            onClose={() => setIsDetailsOpen(false)}
            onViewTransaction={onViewTransaction}
          />
        )}
      </div>
    </div>
  );
}
