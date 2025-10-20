import React, { useState } from 'react';
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
  const [selectedDispatchPolicy, setSelectedDispatchPolicy] = useState<string>('nearest');
  const [selectedServiceZoneFile, setSelectedServiceZoneFile] = useState<string>('');
  const [activeTab, setActiveTab] = useState('statistics');
  const [stations, setStations] = useState<ProcessedStation[]>([]);
  const [stationApparatus, setStationApparatus] = useState<Map<string, Apparatus[]>>(new Map());
  const [stationApparatusCounts, setStationApparatusCounts] = useState<Map<string, ApparatusCounts>>(new Map());
  const [originalApparatusCounts, setOriginalApparatusCounts] = useState<Map<string, ApparatusCounts>>(new Map());
  const [selectedStationData, setSelectedStationData] = useState<string>('');
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  // New states for incident model and date range
  const [selectedIncidentModel, setSelectedIncidentModel] = useState<string>('historical_incidents');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [incidentsCount, setIncidentsCount] = useState<number>(0);

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
    setSelectedDispatchPolicy('nearest');
    setSelectedServiceZoneFile('');
    setSelectedStationData('');
    setStations([]); // Clear stations when clearing settings
    setStationApparatus(new Map()); // Clear apparatus data
  };

  return (
  <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Title and Icons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-7 w-7 text-red-600" />
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl">Fire Department Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Visualization and optimization tool for fire station coverage and incident response
                </p>
              </div>
            </div>
            
            {/* Right side - Features */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapIcon className="h-4 w-4" />
                <span>Interactive mapping and analysis</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Real-time incident processing</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Coverage optimization</span>
            </div>
          </div>
        </div>
      </header>

  {/* Main Content */}
  <div className="flex-1 flex min-h-0">
        {/* Control Panel - Collapsible */}
        <div className="flex-shrink-0">
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
            onStationsChange={setStations} // Pass the setter function
            selectedIncidentModel={selectedIncidentModel}
            onIncidentModelChange={setSelectedIncidentModel}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            isCollapsed={isControlPanelCollapsed}
            onToggleCollapse={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)}
          />
        </div>

  {/* Main Content Area - Split Layout */}
  <div className="flex-1 flex min-h-0">
          {/* Left Side - Map (always visible) */}
          <div className="flex-1 flex flex-col">
            <Card className="h-full border-0 rounded-none flex-1">
              <CardContent className="p-0 h-full flex-1 overflow-hidden">
                <MapSection 
                  simulationResults={simulationResults} 
                  selectedIncidentFile={selectedIncidentFile} 
                  selectedStationFile={selectedStationFile} 
                  selectedDispatchPolicy={selectedDispatchPolicy} // Pass dispatch policy
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
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Analysis Tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
              <TabsList className="flex w-full justify-between bg-muted p-1 h-10">
                <TabsTrigger 
                  value="statistics" 
                  disabled={!hasResults} 
                  className={`data-[state=active]:bg-background relative ${!hasResults ? "opacity-50 cursor-not-allowed" : ""}`}
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

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Statistics Tab */}
                <TabsContent value="statistics" className="h-full">
                  <StatisticsTab 
                    simulationResults={simulationResults} 
                    stations={stations} 
                    incidentsCount={incidentsCount}
                    stationApparatusCounts={stationApparatusCounts}
                  />
                </TabsContent>

                {/* Simulation Results Tab */}
                <TabsContent value="simulation" className="h-full">
                  <SimulationTab hasResults={hasResults} simulationResults={simulationResults} />
                </TabsContent>

                {/* Plots Tab */}
                <TabsContent value="plots" className="h-full">
                  <PlotsTab simulationResults={simulationResults} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3">
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