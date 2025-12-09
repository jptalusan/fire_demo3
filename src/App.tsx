import React, { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { ControlPanel } from './components/ControlPanel';
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
  const [selectedGridSize, setSelectedGridSize] = useState<string>('1_mile');
  const [selectedNewStations, setSelectedNewStations] = useState<number>(1);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  // New states for incident model and date range
  const [selectedIncidentModel, setSelectedIncidentModel] = useState<string>(controlPanelConfig.incidentModels.default);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('ems_fire');
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
  const [incidents, setIncidents] = useState<any[]>([]);
  
  const [historicalIncidentStats, setHistoricalIncidentStats] = useState<any>(null);
  const [historicalIncidentError, setHistoricalIncidentError] = useState<string | null>(null);
  
  // Counterfactual Mode states
  const [isCounterfactualMode, setIsCounterfactualMode] = useState<boolean>(false);
  const [baselineResults, setBaselineResults] = useState<any>(null);
  const [baselineStations, setBaselineStations] = useState<ProcessedStation[]>([]);
  const [baselineApparatusCounts, setBaselineApparatusCounts] = useState<Map<string, ApparatusCounts>>(new Map());
  
  // Memoize other callback functions to prevent infinite re-renders
  const handleHistoricalIncidentStatsChange = useCallback((stats: any) => {
    setHistoricalIncidentStats(stats);
  }, []);
  
  const handleHistoricalIncidentErrorChange = useCallback((error: string | null) => {
    setHistoricalIncidentError(error);
  }, []);

  // Invalidate map size when sidebars are toggled
  useEffect(() => {
    if (mapInstance) {
      // Use setTimeout to ensure layout has completed before invalidating
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 350); // Slightly longer than the 300ms transition
    }
  }, [isControlPanelCollapsed, isRightSidebarCollapsed, mapInstance]);

  // Clear incidents when incident model changes to force manual loading
  useEffect(() => {
    setIncidents([]);
    setIncidentsCount(0);
  }, [selectedIncidentModel]);

  // Reset to default setup when switching modes and load baseline for counterfactual
  useEffect(() => {
    console.log('Counterfactual mode changed to:', isCounterfactualMode);
    
    // Reset configuration based on mode
    if (isCounterfactualMode) {
      // In counterfactual mode: baseline is always default, new config starts empty
      setSelectedStationData(''); // Empty to show "Select configuration" placeholder
      
      // Load default stations as baseline - parse CSV directly
      const loadBaselineStations = async () => {
        try {
          // Load the CSV file directly
          const response = await fetch('/data/stations.csv');
          if (response.ok) {
            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',');
            
            const stations = [];
            const apparatusCounts = new Map();
            
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',');
              const station: any = {
                id: values[0],
                name: values[1],
                displayName: values[1],
                lat: parseFloat(values[2]),
                lon: parseFloat(values[3])
              };
              
              // Extract apparatus counts
              const apparatus: any = {};
              const apparatusHeaders = ['Engine_ID', 'Truck', 'Rescue', 'Hazard', 'Squad', 'FAST', 'Medic', 'Brush', 'Boat', 'UTV', 'REACH', 'Chief'];
              apparatusHeaders.forEach((key, idx) => {
                const headerIdx = headers.findIndex(h => h.trim() === key);
                if (headerIdx !== -1 && values[headerIdx]) {
                  const count = parseInt(values[headerIdx]) || 0;
                  if (count > 0) {
                    apparatus[key] = count;
                  }
                }
              });
              
              stations.push(station);
              apparatusCounts.set(station.id, apparatus);
            }
            
            console.log('Loaded baseline stations:', stations.length);
            console.log('First baseline station:', stations[0]);
            setBaselineStations(stations);
            setBaselineApparatusCounts(apparatusCounts);
          }
        } catch (error) {
          console.error('Error loading baseline stations:', error);
        }
      };
      loadBaselineStations();
    } else {
      // In standard mode: reset to default
      setSelectedStationData(controlPanelConfig.stationData.default);
    }
    
    setSelectedIncidentModel(controlPanelConfig.incidentModels.default);
    setSelectedDispatchPolicy(controlPanelConfig.dispatchPolicies.default);
    setSelectedServiceZoneFile('');
    setStations([]);
    setStationApparatus(new Map());
    setStationApparatusCounts(new Map());
    setOriginalApparatusCounts(new Map());
    setSimulationResults(null);
    setHasResults(false);
    
    // Clear baseline results (performance metrics)
    setBaselineResults(null);
    
    console.log('Reset to default setup');
  }, [isCounterfactualMode]);

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

  // Handle station changes - baseline is loaded separately for counterfactual mode
  const handleStationsChange = useCallback((newStations: ProcessedStation[]) => {
    setStations(newStations);
  }, []);

    const handleClearSettings = useCallback(() => {
    setSelectedIncidentFile('');
    setSelectedStationFile('');
    setSelectedDispatchPolicy(controlPanelConfig.dispatchPolicies.default);
    setSelectedServiceZoneFile('');
    setSelectedStationData(controlPanelConfig.stationData.default);
    setSelectedIncidentModel(controlPanelConfig.incidentModels.default);
    setStartDate(() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    });
    setEndDate(new Date());
    setStations([]);
    setStationApparatus(new Map());
    setStationApparatusCounts(new Map());
    setOriginalApparatusCounts(new Map());
    setSimulationResults(null);
    setIncidentsCount(0); // Reset incidents count
    setIncidents([]); // Clear incidents
    setHistoricalIncidentStats(null); // Clear historical incident stats
    setHistoricalIncidentError(null); // Clear historical incident error
    // Clear counterfactual mode states
    setIsCounterfactualMode(false);
    setBaselineResults(null);
  }, []);

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
        padding: '0.75rem 1.5rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left side - Title and Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame style={{ width: '28px', height: '28px', color: '#dc2626' }} />
              <Shield style={{ width: '28px', height: '28px', color: '#2563eb' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>RESPOND</h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Visualization and optimization tool for fire station coverage and incident response
              </p>
            </div>
          </div>
          
          {/* Right side - Features */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapIcon style={{ width: '16px', height: '16px' }} />
              <span>Interactive mapping and analysis</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span>Real-time incident processing</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Coverage optimization</span>
          </div>
        </div>
      </header>

      {/* Main Content Row */}
      <div style={{ 
        display: 'flex', 
        flex: '1 1 0%', 
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Sidebar Control Panel */}
        <aside style={{
          width: isControlPanelCollapsed ? '48px' : 'min(400px, 20vw)',
          maxWidth: isControlPanelCollapsed ? '48px' : '90vw',
          minWidth: isControlPanelCollapsed ? '48px' : '280px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          transition: 'width 0.3s, max-width 0.3s',
          flexShrink: 0
        }}>
          {/* Collapsed State - Show expand button */}
          {isControlPanelCollapsed && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '1rem 0.5rem'
            }}>
              <button
                onClick={() => setIsControlPanelCollapsed(false)}
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
                →
              </button>
            </div>
          )}
          
          {/* Scrollable Content Area */}
          {!isControlPanelCollapsed && (
            <ControlPanel 
              onRunSimulation={handleRunSimulation}
              selectedIncidentFile={selectedIncidentFile}
              onIncidentFileChange={setSelectedIncidentFile}
              onClearSettings={handleClearSettings}
              onSimulationSuccess={handleSimulationSuccess}
              selectedStationFile={selectedStationFile}
              onStationFileChange={setSelectedStationFile}
              selectedDispatchPolicy={selectedDispatchPolicy}
              onDispatchPolicyChange={setSelectedDispatchPolicy}
              selectedServiceZoneFile={selectedServiceZoneFile}
              onServiceZoneFileChange={setSelectedServiceZoneFile}
              stations={stations}
              stationApparatus={stationApparatus}
              stationApparatusCounts={stationApparatusCounts}
              originalApparatusCounts={originalApparatusCounts}
              selectedStationData={selectedStationData}
              onStationDataChange={setSelectedStationData}
              selectedGridSize={selectedGridSize}
              onGridSizeChange={setSelectedGridSize}
              selectedNewStations={selectedNewStations}
              onNewStationsChange={setSelectedNewStations}
              onStationsChange={handleStationsChange}
              selectedIncidentModel={selectedIncidentModel}
              onIncidentModelChange={setSelectedIncidentModel}
              selectedIncidentType={selectedIncidentType}
              onIncidentTypeChange={setSelectedIncidentType}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              isCollapsed={isControlPanelCollapsed}
              onToggleCollapse={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)}
              incidentsCount={incidentsCount}
              onHistoricalIncidentStatsChange={handleHistoricalIncidentStatsChange}
              onHistoricalIncidentErrorChange={handleHistoricalIncidentErrorChange}
              onIncidentsChange={setIncidents}
              isCounterfactualMode={isCounterfactualMode}
              onCounterfactualModeChange={setIsCounterfactualMode}
              baselineResults={baselineResults}
              onBaselineResultsChange={setBaselineResults}
            />
          )}
        </aside>

        {/* Map Section */}
        <div style={{ 
          flex: isRightSidebarCollapsed ? '1 1 0%' : '1 1 50%',
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0,
          transition: 'flex 0.3s'
        }}>
          <div style={{ width: '100%', height: '100%' }}>
            <MapSection 
              simulationResults={simulationResults} 
              selectedIncidentFile={selectedIncidentFile} 
              selectedStationFile={selectedStationFile} 
              selectedDispatchPolicy={selectedDispatchPolicy}
              selectedServiceZoneFile={selectedServiceZoneFile}
              selectedStationData={selectedStationData}
              selectedGridSize={selectedGridSize}
              selectedNewStations={selectedNewStations}
              stations={stations}
              onStationsChange={handleStationsChange}
              onApparatusChange={handleApparatusChange}
              stationApparatusCounts={stationApparatusCounts}
              setStationApparatusCounts={setStationApparatusCounts}
              originalApparatusCounts={originalApparatusCounts}
              setOriginalApparatusCounts={setOriginalApparatusCounts}
              selectedIncidentModel={selectedIncidentModel}
              startDate={startDate}
              endDate={endDate}
              incidents={incidents}
              onIncidentsCountChange={setIncidentsCount}
              onClearLayers={handleClearSettings}
              onMapInstanceChange={setMapInstance}
              isCounterfactualMode={isCounterfactualMode}
            />
          </div>
        </div>

        {/* Right Sidebar - Analysis Tabs */}
        <aside style={{
          width: isRightSidebarCollapsed ? '48px' : 'min(800px, 40vw)',
          maxWidth: isRightSidebarCollapsed ? '48px' : '90vw',
          minWidth: isRightSidebarCollapsed ? '48px' : '320px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          transition: 'width 0.3s, max-width 0.3s',
          minHeight: 0
        }}>
          {/* Collapsed State - Show expand button */}
          {isRightSidebarCollapsed && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '1rem 0.5rem'
            }}>
              <button
                onClick={() => setIsRightSidebarCollapsed(false)}
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
                ←
              </button>
            </div>
          )}
          
          {/* Tabs Content */}
          {!isRightSidebarCollapsed && (
            <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Tabs Header with Collapse Button - Fixed */}
                <div style={{ 
                  flexShrink: 0, 
                  padding: '0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <TabsList className="flex-1 flex justify-between bg-muted p-1 h-10">
                    <TabsTrigger 
                      value="statistics" 
                      className="data-[state=active]:bg-background relative"
                    >
                      <span className={activeTab === 'statistics' ? 'bg-white text-gray-800 px-4 py-1 rounded-full' : ''}>
                        Statistics
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="simulation" 
                      disabled={!hasResults} 
                      className={`data-[state=active]:bg-background relative ${!hasResults ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className={activeTab === 'simulation' ? 'bg-white text-gray-800 px-4 py-1 rounded-full' : ''}>
                        Simulation Results
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="plots" 
                      disabled={!hasResults} 
                      className={`data-[state=active]:bg-background relative ${!hasResults ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className={activeTab === 'plots' ? 'bg-white text-gray-800 px-4 py-1 rounded-full' : ''}>
                        Plots
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  <button
                    onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>←</span>
                  </button>
                </div>

                {/* Tabs Content - Scrollable */}
                <div style={{ flex: '1 1 0%', overflowY: 'auto', minHeight: 0 }}>
                  {/* Statistics Tab */}
                  <TabsContent value="statistics" className="m-0 p-4 h-auto">
                    <StatisticsTab 
                      simulationResults={simulationResults} 
                      stations={stations} 
                      incidentsCount={incidentsCount}
                      stationApparatusCounts={stationApparatusCounts}
                      historicalIncidentStats={historicalIncidentStats}
                      historicalIncidentError={historicalIncidentError}
                      isCounterfactualMode={isCounterfactualMode}
                      baselineResults={baselineResults}
                      baselineStations={baselineStations}
                      baselineApparatusCounts={baselineApparatusCounts}
                    />
                  </TabsContent>

                  {/* Simulation Results Tab */}
                  <TabsContent value="simulation" className="m-0 p-4 h-auto">
                    <SimulationTab 
                      hasResults={hasResults} 
                      simulationResults={simulationResults} 
                      incidentsCount={incidentsCount}
                      isCounterfactualMode={isCounterfactualMode}
                      baselineResults={baselineResults}
                    />
                  </TabsContent>

                  {/* Plots Tab */}
                  <TabsContent value="plots" className="m-0 p-4 h-auto">
                    <PlotsTab 
                      simulationResults={simulationResults} 
                      historicalIncidentStats={historicalIncidentStats} 
                      incidents={incidents}
                      isCounterfactualMode={isCounterfactualMode}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>© 2025 Fire Department Analytics</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Version 1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Last updated: {new Date().toLocaleDateString()}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className={`flex items-center gap-1 ${isSimulating ? 'text-yellow-600' : hasResults ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-yellow-600 animate-pulse' : hasResults ? 'bg-green-600' : 'bg-gray-400'}`}></div>
              {isSimulating ? 'Processing...' : hasResults ? 'Analysis Complete' : 'Ready'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}