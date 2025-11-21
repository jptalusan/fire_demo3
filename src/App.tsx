import React, { useState, useCallback } from 'react';
import { MapSection } from './components/MapSection';
import { StatisticsTab } from './components/StatisticsTab';
import { SimulationTab } from './components/SimulationTab';
import { PlotsTab } from './components/PlotsTab';
import { Card, CardContent } from './components/ui/card';
import { Separator } from './components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Flame, Shield, MapIcon } from 'lucide-react';
import { ProcessedStation, Apparatus } from './utils/dataProcessing';
import controlPanelConfig from './config/controlPanelConfig.json';

// Interface for apparatus counts (matching MapSection)
interface ApparatusCounts {
  [key: string]: number;
}

export default function App() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [hasResults, setHasResults] = useState(false);
  const [selectedIncidentFile, setSelectedIncidentFile] = useState<string>('');
  const [selectedStationFile, setSelectedStationFile] = useState<string>('');
  const [selectedDispatchPolicy, setSelectedDispatchPolicy] = useState<string>(controlPanelConfig.dispatchPolicies.default);
  const [selectedServiceZoneFile, setSelectedServiceZoneFile] = useState<string>('');
  const [activeTab, setActiveTab] = useState('statistics');
  const [stations, setStations] = useState<ProcessedStation[]>([]);
  const [stationApparatus, setStationApparatus] = useState<Map<string, Apparatus[]>>(new Map());
  const [stationApparatusCounts, setStationApparatusCounts] = useState<Map<string, ApparatusCounts>>(new Map());
  const [originalApparatusCounts, setOriginalApparatusCounts] = useState<Map<string, ApparatusCounts>>(new Map());
  const [selectedStationData, setSelectedStationData] = useState<string>(controlPanelConfig.stationData.default);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  // New states for incident model and date range
  const [selectedIncidentModel, setSelectedIncidentModel] = useState<string>(controlPanelConfig.incidentModels.default);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    // Default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    // Default to today
    return new Date();
  });
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  
  const [historicalIncidentStats, setHistoricalIncidentStats] = useState<any>(null);
  const [historicalIncidentError, setHistoricalIncidentError] = useState<string | null>(null);
  
  // Memoize other callback functions to prevent infinite re-renders
  const handleHistoricalIncidentStatsChange = useCallback((stats: any) => {
    setHistoricalIncidentStats(stats);
  }, []);
  
  const handleHistoricalIncidentErrorChange = useCallback((error: string | null) => {
    setHistoricalIncidentError(error);
  }, []);

  const handleSimulationSuccess = (result: any) => {
    console.log('Simulation success, enabling tabs...', result);
    setSimulationResults(result);
    setHasResults(true);
  };

  const handleRunSimulation = async () => {
    console.log('Starting simulation...');
    setIsSimulating(true);
    setHasResults(false);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock simulation results
    const results = {
      coverageAnalysis: { /* mock data */ },
      responseTimeAnalysis: { /* mock data */ },
      optimizationRecommendations: { /* mock data */ }
    };
    
    console.log('Simulation complete, setting results...');
    setSimulationResults(results);
    setHasResults(true);
    setIsSimulating(false);
  };

  const handleApparatusChange = (stationId: string, apparatus: Apparatus[]) => {
    setStationApparatus(prev => new Map(prev).set(stationId, apparatus));
  };

  const handleClearSettings = () => {
    setIsSimulating(false);
    setSimulationResults(null);
    setHasResults(false);
    setSelectedIncidentFile('');
    setSelectedStationFile('');
    setSelectedDispatchPolicy('');
    setSelectedServiceZoneFile('');
    setSelectedStationData('');
    setSelectedIncidentModel('');
    // Reset dates to defaults (30 days ago to today)
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    setStartDate(defaultStartDate);
    setEndDate(new Date());
    setStations([]); // Clear stations when clearing settings
    setStationApparatus(new Map()); // Clear apparatus data
    setStationApparatusCounts(new Map()); // Clear apparatus counts
    setOriginalApparatusCounts(new Map()); // Clear original apparatus counts
    setIncidentsCount(0); // Reset incidents count
    setHistoricalIncidentStats(null); // Clear historical incident stats
    setHistoricalIncidentError(null); // Clear historical incident errors
    
    // Clear map layers
    if ((window as any).clearMapLayers) {
      (window as any).clearMapLayers();
    }
    
    // Reset active tab to statistics
    setActiveTab('statistics');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Header - Fixed */}
      <header style={{ 
        flexShrink: 0, 
        borderBottom: '1px solid #e5e7eb', 
        padding: '1rem 1.5rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Flame style={{ width: '28px', height: '28px', color: '#dc2626' }} />
          <Shield style={{ width: '28px', height: '28px', color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Fire Department Analytics Dashboard</h1>
        </div>
      </header>

      {/* Main Content Row */}
      <div style={{ 
        display: 'flex', 
        flex: '1 1 0%', 
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Sidebar Control Panel - MINIMAL TEST VERSION */}
        <aside style={{
          width: isControlPanelCollapsed ? '48px' : '320px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          transition: 'width 0.3s'
        }}>
          {/* Sidebar Header */}
          <div style={{ 
            padding: isControlPanelCollapsed ? '1rem 0.5rem' : '1.5rem 1rem', 
            borderBottom: isControlPanelCollapsed ? 'none' : '1px solid #e5e7eb',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)}
              style={{
                padding: '0.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isControlPanelCollapsed ? '→' : '←'}
            </button>
          </div>
          
          {/* Scrollable Content Area */}
          {!isControlPanelCollapsed && (
            <div style={{
              flex: '1 1 0%',
              overflowY: 'auto',
              padding: '1rem',
              minHeight: 0
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Control Panel</h3>
              
              {/* FILLER TEST CONTENT */}
              {Array.from({ length: 50 }, (_, i) => (
                <div key={i} style={{
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  backgroundColor: i % 2 === 0 ? '#f9fafb' : '#ffffff'
                }}>
                  Filler Block {i + 1} - This is test content to force scrolling in the sidebar panel
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Map Section */}
        <div style={{ 
          flex: '1 1 0%', 
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <MapSection 
            simulationResults={simulationResults} 
            selectedIncidentFile={selectedIncidentFile} 
            selectedStationFile={selectedStationFile} 
            selectedDispatchPolicy={selectedDispatchPolicy}
            selectedServiceZoneFile={selectedServiceZoneFile}
            selectedStationData={selectedStationData}
            stations={stations}
            onStationsChange={setStations}
            onApparatusChange={handleApparatusChange}
            stationApparatusCounts={stationApparatusCounts}
            setStationApparatusCounts={setStationApparatusCounts}
            originalApparatusCounts={originalApparatusCounts}
            setOriginalApparatusCounts={setOriginalApparatusCounts}
            selectedIncidentModel={selectedIncidentModel}
            startDate={startDate}
            endDate={endDate}
            onIncidentsCountChange={setIncidentsCount}
            onClearLayers={handleClearSettings}
          />
        </div>
      </div>

      {/* Footer */}
      <footer style={{ 
        flexShrink: 0, 
        borderTop: '1px solid #e5e7eb', 
        padding: '0.75rem 1.5rem',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        <div>
          <span>© 2025 Fire Department Analytics | Version 1.0</span>
        </div>
        <div>
          <span>Last updated: {new Date().toLocaleDateString()} | Status: {isSimulating ? 'Processing...' : hasResults ? 'Complete' : 'Ready'}</span>
        </div>
      </footer>
    </div>
  );
}