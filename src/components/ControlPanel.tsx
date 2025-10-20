import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Play, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProcessedStation, Apparatus } from '../utils/dataProcessing';
import controlPanelConfig from '../config/controlPanelConfig.json';

interface ControlPanelProps {
  onRunSimulation: () => void;
  selectedIncidentFile: string;
  onIncidentFileChange: (file: string) => void;
  onClearSettings: () => void;
  onSimulationSuccess?: (result: any) => void;
  selectedStationFile: string;
  onStationFileChange: (file: string) => void;
  stations: ProcessedStation[];
  stationApparatus: Map<string, Apparatus[]>;
  selectedStationData?: string;
  onStationDataChange?: (data: string) => void;
  onStationsChange: (stations: ProcessedStation[]) => void;
  selectedDispatchPolicy?: string;
  onDispatchPolicyChange?: (policy: string) => void;
  selectedServiceZoneFile?: string;
  onServiceZoneFileChange?: (file: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ControlPanel({
  onRunSimulation,
  selectedIncidentFile,
  onIncidentFileChange,
  onClearSettings,
  onSimulationSuccess,
  selectedStationFile,
  onStationFileChange,
  stations,
  stationApparatus,
  selectedStationData,
  onStationDataChange,
  onStationsChange, // Add this line
  selectedDispatchPolicy = 'nearest',
  onDispatchPolicyChange,
  selectedServiceZoneFile = '',
  onServiceZoneFileChange,
  isCollapsed = false,
  onToggleCollapse,
}: ControlPanelProps) {
  const [fireStationsFile, setFireStationsFile] = useState<File | null>(null);
  const [incidentsFile, setIncidentsFile] = useState<File | null>(null);
  const [responseTime, setResponseTime] = useState('5');
  const [maxDistance, setMaxDistance] = useState('10');
  const [incidentFiles, setIncidentFiles] = useState<string[]>([]);
  const [stationFiles, setStationFiles] = useState<string[]>([]);
  const [serviceZoneFiles, setServiceZoneFiles] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // New model selection states - using defaults from config
  const [selectedIncidentModel, setSelectedIncidentModel] = useState(controlPanelConfig.incidentModels.default);
  const [selectedTravelTimeModel, setSelectedTravelTimeModel] = useState(controlPanelConfig.travelTimeModels.default);
  const [selectedServiceTimeModel, setSelectedServiceTimeModel] = useState(controlPanelConfig.serviceTimeModels.default);

  // Utility function to handle API responses consistently
  const handleApiResponse = (data: any, key: string) => {
    console.log('Raw response data:', data); // Log the entire response object
    const result = data[key]; // Extract the specified key from the response
    console.log(`Extracted ${key}:`, result); // Debugging log
    return result;
  };

  useEffect(() => {
    const fetchIncidentFiles = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/get-incidents`
        ); // Use backend URL from .env
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Parse the JSON response
        const incidents = handleApiResponse(data, 'incidents'); // Extract 'incidents' from response
        setIncidentFiles(incidents);
      } catch (error) {
        console.error('Error fetching incident files:', error);
      }
    };

    fetchIncidentFiles();
  }, []);

  useEffect(() => {
    const fetchStationFiles = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/get-stations`
        ); // Fetch station files
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Parse the JSON response
        const stations = handleApiResponse(data, 'stations'); // Extract 'stations' from response
        setStationFiles(stations);
      } catch (error) {
        console.error('Error fetching station files:', error);
      }
    };

    fetchStationFiles();
  }, []);

  useEffect(() => {
    const fetchServiceZoneFiles = async () => {
      try {
        // For now, use the same endpoint as stations - you may need to create a separate endpoint
        const response = await fetch(
          `http://localhost:8000/get-shapes`
        ); // This might need to be changed to a service zones endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const zones = handleApiResponse(data, 'shapes'); // This might need to be 'zones' or similar
        setServiceZoneFiles(zones);
      } catch (error) {
        console.error('Error fetching service zone files:', error);
      }
    };

    // Only fetch service zone files if firebeats policy is selected
    if (selectedDispatchPolicy === 'firebeats') {
      fetchServiceZoneFiles();
    }
  }, [selectedDispatchPolicy]);

  const handleFileUpload = (
    file: File | null,
    type: 'stations' | 'incidents'
  ) => {
    if (type === 'stations') {
      setFireStationsFile(file);
    } else {
      setIncidentsFile(file);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true); // Disable the button and show loading state
      
      // Prepare the payload with current station positions and configuration
      const payload = {
        // Input configurations
        stationData: selectedStationData,
        
        // Model configurations
        models: {
          incident: selectedIncidentModel,
          travelTime: selectedTravelTimeModel,
          serviceTime: selectedServiceTimeModel,
          dispatch: selectedDispatchPolicy
        },
        
        // Legacy fields for backward compatibility
        selectedIncidentFile,
        selectedStationFile,
        selectedServiceZoneFile: selectedDispatchPolicy === 'firebeats' ? selectedServiceZoneFile : undefined,
        dispatchPolicy: selectedDispatchPolicy,
        
        stations: stations.map(station => ({
          id: station.id,
          name: station.displayName,
          lat: station.lat,
          lng: station.lon,
          apparatus: stationApparatus.get(station.id) || [],
          serviceZone: station.serviceZone, // Include serviceZone in the payload
        })),
        responseTime: parseInt(responseTime),
        maxDistance: parseFloat(maxDistance),
        options: {
          coverageAnalysis: true,
          responseTimeAnalysis: true,
          resourceOptimization: false // Based on the checkbox state
        }
      };
      
      console.log('Sending simulation request with payload:', payload);
      
      const response = await fetch('http://localhost:8000/run-simulation2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('Simulation result:', result);

      // Check if the status is success
      if (result.status === 'success') {
        // Call the parent component's callback to enable the tabs
        if (onSimulationSuccess) {
          onSimulationSuccess(result);
        }
      }
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setIsSimulating(false); // Re-enable the button
    }
  };

  // Remove the enableTabs function as it's no longer needed
  // Tab enabling logic should be handled in the parent component

  return (
    <div className={`h-full bg-card border-r flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
      <Card className="h-full border-0 rounded-none flex flex-col">
        {/* Header - Fixed */}
        <CardHeader className="flex-shrink-0 pb-4">
          <CardTitle className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Simulation Controls
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="p-1 h-8 w-8"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>

        {/* Scrollable Content - Only show when not collapsed */}
        {!isCollapsed && (
          <CardContent className="flex-1 overflow-y-auto space-y-6">
          {/* Clear Settings Button */}
          <div className="space-y-4">
            <Button
              onClick={onClearSettings}
              variant="outline"
              className="w-full"
            >
              Clear Settings
            </Button>
          </div>

          <Separator />

          {/* Input Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Input</h4>
            <div>
              <Label>Station Data</Label>
              <div className="mt-2">
                <select
                  value={selectedStationData || controlPanelConfig.stationData.default}
                  onChange={(e) => onStationDataChange?.(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {controlPanelConfig.stationData.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {controlPanelConfig.stationData.options.find(opt => opt.id === (selectedStationData || controlPanelConfig.stationData.default))?.description}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Models Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Models</h4>
            
            {/* Incident Model */}
            <div>
              <Label>Incident</Label>
              <div className="mt-2">
                <select
                  value={selectedIncidentModel}
                  onChange={(e) => setSelectedIncidentModel(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {controlPanelConfig.incidentModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {controlPanelConfig.incidentModels.options.find(model => model.id === selectedIncidentModel)?.description}
                </p>
              </div>
            </div>

            {/* Travel Time Model */}
            <div>
              <Label>Travel Time</Label>
              <div className="mt-2">
                <select
                  value={selectedTravelTimeModel}
                  onChange={(e) => setSelectedTravelTimeModel(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {controlPanelConfig.travelTimeModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {controlPanelConfig.travelTimeModels.options.find(model => model.id === selectedTravelTimeModel)?.description}
                </p>
              </div>
            </div>

            {/* Service Time Model */}
            <div>
              <Label>Service Time</Label>
              <div className="mt-2">
                <select
                  value={selectedServiceTimeModel}
                  onChange={(e) => setSelectedServiceTimeModel(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {controlPanelConfig.serviceTimeModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {controlPanelConfig.serviceTimeModels.options.find(model => model.id === selectedServiceTimeModel)?.description}
                </p>
              </div>
            </div>

            {/* Dispatch Policy */}
            <div>
              <Label>Dispatch Policy</Label>
              <div className="mt-2">
                <select
                  value={selectedDispatchPolicy}
                  onChange={(e) => onDispatchPolicyChange?.(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {controlPanelConfig.dispatchPolicies.options.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {controlPanelConfig.dispatchPolicies.options.find(policy => policy.id === selectedDispatchPolicy)?.description}
                </p>
              </div>
            </div>

            {/* Service Zones Data - Only show when Firebeats policy is selected */}
            {selectedDispatchPolicy === 'firebeats' && (
              <div>
                <Label>Service Zones Data</Label>
                <div className="mt-2">
                  <select
                    value={selectedServiceZoneFile}
                    onChange={(e) => onServiceZoneFileChange?.(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select service zones</option>
                    {serviceZoneFiles?.length > 0 ? (
                      serviceZoneFiles.map((file) => (
                        <option key={file} value={file}>
                          {file}
                        </option>
                      ))
                    ) : (
                      <option disabled>No files available</option>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Configuration Parameters */}
          {/* <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Simulation Parameters</h4>

            <div>
              <Label htmlFor="response-time">
                Target Response Time (minutes)
              </Label>
              <Input
                id="response-time"
                type="number"
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max-distance">Max Coverage Distance (km)</Label>
              <Input
                id="max-distance"
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Separator /> */}

          {/* Additional Options */}
          {/* <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Analysis Options</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Coverage Analysis</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Response Time Analysis</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Resource Optimization</span>
              </label>
            </div>
          </div>

          <Separator /> */}

          {/* Run Simulation Button */}
          <div className="pt-4">
            <Button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full h-12"
              size="lg"
            >
              {isSimulating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  SIMULATING...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  RUN SIMULATION
                </>
              )}
            </Button>
          </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
