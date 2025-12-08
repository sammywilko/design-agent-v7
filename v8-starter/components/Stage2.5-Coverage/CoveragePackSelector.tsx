// components/Stage2.5-Coverage/CoveragePackSelector.tsx
// UI for selecting coverage packs

import React from 'react';
import { COVERAGE_PACKS, CoveragePack } from '../../constants/coveragePacks';

interface CoveragePackSelectorProps {
  entityType: 'character' | 'product' | 'location';
  onSelectPack: (packId: string) => void;
  selectedPackId?: string;
}

export const CoveragePackSelector: React.FC<CoveragePackSelectorProps> = ({
  entityType,
  onSelectPack,
  selectedPackId
}) => {

  // Filter packs based on entity type
  const availablePacks = Object.values(COVERAGE_PACKS).filter(pack => {
    if (entityType === 'character') {
      return ['turnaround', 'contactSheet', 'dialogue', 'action'].includes(pack.id);
    } else if (entityType === 'product') {
      return ['turnaround', 'contactSheet', 'productHero'].includes(pack.id);
    } else if (entityType === 'location') {
      return ['contactSheet', 'location'].includes(pack.id);
    }
    return true;
  });

  return (
    <div className="coverage-pack-selector">
      <div className="selector-header">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Select Coverage Pack
        </h3>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Choose how many angles to generate for your {entityType}
        </p>
      </div>

      <div className="pack-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        {availablePacks.map(pack => (
          <PackCard
            key={pack.id}
            pack={pack}
            isSelected={selectedPackId === pack.id}
            onClick={() => onSelectPack(pack.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface PackCardProps {
  pack: CoveragePack;
  isSelected: boolean;
  onClick: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, isSelected, onClick }) => {
  return (
    <div
      className={`pack-card ${isSelected ? 'selected' : ''} ${pack.recommended ? 'recommended' : ''}`}
      onClick={onClick}
      style={{
        position: 'relative',
        border: `2px solid ${isSelected ? '#3b82f6' : pack.recommended ? '#10b981' : '#e5e7eb'}`,
        borderRadius: '12px',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: isSelected ? '#eff6ff' : 'white'
      }}
    >
      {pack.recommended && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '12px',
          background: '#10b981',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          Recommended
        </div>
      )}

      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: '#3b82f6',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          Selected
        </div>
      )}

      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {pack.name}
      </h4>
      <p style={{
        color: '#666',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        minHeight: '2.5rem'
      }}>
        {pack.description}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1rem',
        padding: '0.75rem 0',
        borderTop: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          <span style={{ fontWeight: 500 }}>{pack.shots}</span> shots
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          <span>{pack.estimatedTime}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          <span>{pack.estimatedCost}</span>
        </div>
      </div>

      <button
        style={{
          width: '100%',
          padding: '0.75rem',
          border: 'none',
          borderRadius: '8px',
          background: isSelected ? '#10b981' : '#3b82f6',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {isSelected ? 'Selected' : 'Select Pack'}
      </button>
    </div>
  );
};

export default CoveragePackSelector;
