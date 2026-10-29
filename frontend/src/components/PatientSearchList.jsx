import React, { useState } from 'react';
import { Search, User, ChevronRight, ChevronLeft } from 'lucide-react';

export default function PatientSearchList({ 
  patients, 
  selectedPatient, 
  onSelectPatient,
  searchQuery,
  setSearchQuery 
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPatientsCount = 248;

  // Filter patients based on searchQuery
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return patient.name.toLowerCase().includes(q) || patient.id.toLowerCase().includes(q);
  });

  return (
    <div className="patients-panel">
      {/* Search Patients Section */}
      <div className="search-section">
        <h2 className="section-heading">Search Patients</h2>
        <div className="search-form-row">
          <div className="patient-input-wrapper">
            <Search className="input-icon" size={16} />
            <input
              type="text"
              placeholder="Search by patient ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-search-primary">Search</button>
        </div>
      </div>

      {/* Patient List Section */}
      <div className="patients-list-header">
        <h3 className="patients-list-title">Patients <span className="patients-count">({totalPatientsCount})</span></h3>
      </div>

      <div className="patients-items-scroll">
        {filteredPatients.map((patient) => {
          const isSelected = selectedPatient?.id === patient.id;
          return (
            <div
              key={patient.id}
              className={`patient-card-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectPatient(patient)}
            >
              <div className="patient-avatar-box">
                <User size={18} className="patient-avatar-icon" />
              </div>

              <div className="patient-meta">
                <span className="patient-name">{patient.name}</span>
                <span className="patient-id">{patient.id}</span>
              </div>

              <ChevronRight size={17} className="patient-chevron-icon" />
            </div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div className="no-patients-found">
            <p>No patients found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="patients-pagination-footer">
        <span className="pagination-info">1-8 of {totalPatientsCount} patients</span>
        <div className="pagination-controls">
          <button 
            className="page-nav-btn" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
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
          <span className="page-ellipsis">...</span>
          
          <button 
            className="page-nav-btn"
            onClick={() => setCurrentPage(p => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
