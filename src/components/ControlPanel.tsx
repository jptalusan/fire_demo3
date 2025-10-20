import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Play, Settings, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { ProcessedStation, Apparatus } from '../utils/dataProcessing';
import controlPanelConfig from '../config/controlPanelConfig.json';

// Interface for apparatus counts (matching App.tsx and MapSection)
interface ApparatusCounts {
  [key: string]: number;
}

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
  stationApparatusCounts: Map<string, ApparatusCounts>;
  originalApparatusCounts: Map<string, ApparatusCounts>;
  selectedStationData?: string;
  onStationDataChange?: (data: string) => void;
  onStationsChange: (stations: ProcessedStation[]) => void;
  selectedDispatchPolicy?: string;
  onDispatchPolicyChange?: (policy: string) => void;
  selectedServiceZoneFile?: string;
  onServiceZoneFileChange?: (file: string) => void;
  selectedIncidentModel?: string;
  onIncidentModelChange?: (model: string) => void;
  startDate?: Date;
  endDate?: Date;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
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
  stationApparatusCounts,
  originalApparatusCounts,
  selectedStationData,
  onStationDataChange,
  onStationsChange, // Add this line
  selectedDispatchPolicy = '',
  onDispatchPolicyChange,
  selectedServiceZoneFile = '',
  onServiceZoneFileChange,
  selectedIncidentModel = '',
  onIncidentModelChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
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
  
  // Model selection states - start empty to require user selection
  const [selectedTravelTimeModel, setSelectedTravelTimeModel] = useState('');
  const [selectedServiceTimeModel, setSelectedServiceTimeModel] = useState('');

  // Reset local model states when parent selections are cleared
  useEffect(() => {
    if (!selectedStationData) {
      setSelectedTravelTimeModel('');
      setSelectedServiceTimeModel('');
    }
  }, [selectedStationData]);

  useEffect(() => {
    if (!selectedDispatchPolicy) {
      // Reset models when dispatch policy is cleared
    }
  }, [selectedDispatchPolicy]);

  // Validation function to check if all required fields are selected
  const isFormValid = () => {
    const requiredFields = [
      selectedStationData,
      selectedIncidentModel,
      selectedTravelTimeModel,
      selectedServiceTimeModel,
      selectedDispatchPolicy
    ];
    
    // Check if all required fields have values
    const allFieldsSelected = requiredFields.every(field => field && field.trim() !== '');
    
    // If firebeats policy is selected, also check service zone file
    if (selectedDispatchPolicy === 'firebeats') {
      return allFieldsSelected && selectedServiceZoneFile && selectedServiceZoneFile.trim() !== '';
    }
    
    return allFieldsSelected;
  };

  // Get list of missing required fields for better user feedback
  const getMissingFields = () => {
    const missing = [];
    if (!selectedStationData) missing.push('Station Data');
    if (!selectedIncidentModel) missing.push('Incident Model');
    if (!selectedTravelTimeModel) missing.push('Travel Time Model');
    if (!selectedServiceTimeModel) missing.push('Service Time Model');
    if (!selectedDispatchPolicy) missing.push('Dispatch Policy');
    if (selectedDispatchPolicy === 'firebeats' && !selectedServiceZoneFile) {
      missing.push('Service Zones');
    }
    return missing;
  };

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

  // Helper function to convert apparatus counts to simple apparatus array for payload
  const convertApparatusCountsToSimpleArray = (counts: ApparatusCounts) => {
    const apparatusArray: Array<{type: string, count: number}> = [];
    
    // APPARATUS_TYPES mapping to match MapSection
    const APPARATUS_TYPES = [
      { key: 'Engine_ID', name: 'Engine', csvColumn: 'Engine_ID' },
      { key: 'Truck', name: 'Truck', csvColumn: 'Truck' },
      { key: 'Rescue', name: 'Rescue', csvColumn: 'Rescue' },
      { key: 'Hazard', name: 'Hazard', csvColumn: 'Hazard' },
      { key: 'Squad', name: 'Squad', csvColumn: 'Squad' },
      { key: 'FAST', name: 'FAST', csvColumn: 'FAST' },
      { key: 'Medic', name: 'Medic', csvColumn: 'Medic' },
      { key: 'Brush', name: 'Brush', csvColumn: 'Brush' },
      { key: 'Boat', name: 'Boat', csvColumn: 'Boat' },
      { key: 'UTV', name: 'UTV', csvColumn: 'UTV' },
      { key: 'REACH', name: 'REACH', csvColumn: 'REACH' },
      { key: 'Chief', name: 'Chief', csvColumn: 'Chief' }
    ];

    APPARATUS_TYPES.forEach(type => {
      const count = counts[type.key] || 0;
      if (count > 0) {
        apparatusArray.push({
          type: type.name,
          count: count
        });
      }
    });
    
    return apparatusArray;
  };

  const handleSaveStationConfiguration = async () => {
    try {
      // Prepare CSV headers
      const headers = [
        'StationID',
        'Stations',
        'Address', 
        'lat',
        'lon',
        'Service Zone',
        'Engine_ID',
        'Truck',
        'Rescue',
        'Hazard',
        'Squad',
        'FAST',
        'Medic',
        'Brush',
        'Boat',
        'UTV',
        'REACH',
        'Chief'
      ];

      // Prepare CSV rows
      const rows = stations.map(station => {
        const apparatusCounts = stationApparatusCounts.get(station.id) || {};
        
        return [
          station.id,
          station.name || station.displayName || '',
          station.address || '',
          station.lat.toString(),
          station.lon.toString(),
          station.serviceZone || '',
          (apparatusCounts['Engine_ID'] || 0).toString(),
          (apparatusCounts['Truck'] || 0).toString(),
          (apparatusCounts['Rescue'] || 0).toString(),
          (apparatusCounts['Hazard'] || 0).toString(),
          (apparatusCounts['Squad'] || 0).toString(),
          (apparatusCounts['FAST'] || 0).toString(),
          (apparatusCounts['Medic'] || 0).toString(),
          (apparatusCounts['Brush'] || 0).toString(),
          (apparatusCounts['Boat'] || 0).toString(),
          (apparatusCounts['UTV'] || 0).toString(),
          (apparatusCounts['REACH'] || 0).toString(),
          (apparatusCounts['Chief'] || 0).toString()
        ];
      });

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Generate default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `station_configuration_${timestamp}.csv`;

      // Check if File System Access API is supported and we're in a secure context
      const hasFileSystemAccess = 'showSaveFilePicker' in window && window.isSecureContext;
      console.log('File System Access API available:', hasFileSystemAccess);
      
      if (hasFileSystemAccess) {
        try {
          console.log('Attempting to show native save dialog...');
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: 'CSV files',
              accept: { 'text/csv': ['.csv'] }
            }],
            excludeAcceptAllOption: true
          });
          
          console.log('User selected file, writing content...');
          const writable = await fileHandle.createWritable();
          await writable.write(csvContent);
          await writable.close();
          
          console.log('Station configuration saved successfully via native dialog');
          return;
        } catch (error) {
          // User cancelled or error occurred, fall back to download method
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('User cancelled save dialog');
            return; // Don't fall back if user explicitly cancelled
          } else {
            console.warn('File System Access API failed, falling back to download:', error);
          }
        }
      } else {
        console.log('File System Access API not available, using download method');
      }

      // Fallback: Ask user for filename using browser prompt, then download
      let finalFilename = defaultFilename;
      const userFilename = prompt('Save as filename:', defaultFilename);
      if (userFilename === null) {
        console.log('User cancelled save');
        return; // User cancelled
      }
      if (userFilename.trim()) {
        finalFilename = userFilename.trim();
        if (!finalFilename.endsWith('.csv')) {
          finalFilename += '.csv';
        }
      }

      // Use traditional download method with user-specified filename
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      console.log('Station configuration saved successfully as:', finalFilename);
    } catch (error) {
      console.error('Error saving station configuration:', error);
      alert('Error saving station configuration. Please try again.');
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true); // Disable the button and show loading state
      
      // Prepare the payload with current station positions and configuration
      const payload = {
        // Input configurations
        stationData: selectedStationData,
        dateRange: {
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        },
        
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
        
        stations: stations.map(station => {
          // Use apparatus counts from the new system if available, otherwise fall back to old system
          const apparatusCounts = stationApparatusCounts.get(station.id);
          const apparatus = apparatusCounts 
            ? convertApparatusCountsToSimpleArray(apparatusCounts)
            : []; // Fallback to empty array for simple format
            
          return {
            id: station.id,
            name: station.displayName,
            lat: station.lat,
            lon: station.lon, // Changed from 'lng' to 'lon' to match CSV
            apparatus: apparatus,
            serviceZone: station.serviceZone, // Include serviceZone in the payload
          };
        }),
        responseTime: parseInt(responseTime),
        maxDistance: parseFloat(maxDistance),
        options: {
          coverageAnalysis: true,
          responseTimeAnalysis: true,
          resourceOptimization: false // Based on the checkbox state
        }
      };
      
      console.log('Sending simulation request with payload:', payload);
      
      const response = await fetch('http://localhost:8000/run-simulation', {
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
            
            {/* Station Data */}
            <div>
              <Label>Station Data</Label>
              <div className="mt-2">
                <select
                  value={selectedStationData || ''}
                  onChange={(e) => onStationDataChange?.(e.target.value)}
                  className="w-full p-2 border rounded text-gray-400"
                  style={{ color: selectedStationData ? '#111827' : '#9CA3AF' }}
                >
                  <option value="" disabled className="text-gray-400">Select station data</option>
                  {controlPanelConfig.stationData.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedStationData 
                    ? controlPanelConfig.stationData.options.find(opt => opt.id === selectedStationData)?.description
                    : 'Select station data'
                  }
                </p>
              </div>
            </div>

            {/* Date Range Selector */}
            <div>
              <Label>Date Range</Label>
              <div className="mt-2 space-y-2">
                {/* Start Date */}
                <div>
                  <Label className="text-sm text-gray-600">From</Label>
                  <input
                    type="date"
                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      onStartDateChange?.(date);
                    }}
                    max={endDate ? endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border rounded"
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label className="text-sm text-gray-600">To</Label>
                  <input
                    type="date"
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      onEndDateChange?.(date);
                    }}
                    min={startDate ? startDate.toISOString().split('T')[0] : undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  Select range for incidents
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
                  value={selectedIncidentModel || ''}
                  onChange={(e) => onIncidentModelChange?.(e.target.value)}
                  className="w-full p-2 border rounded text-gray-400"
                  style={{ color: selectedIncidentModel ? '#111827' : '#9CA3AF' }}
                >
                  <option value="" disabled className="text-gray-400">Select incident model</option>
                  {controlPanelConfig.incidentModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedIncidentModel 
                    ? controlPanelConfig.incidentModels.options.find(model => model.id === selectedIncidentModel)?.description
                    : 'Select an incident model'
                  }
                </p>
              </div>
            </div>

            {/* Travel Time Model */}
            <div>
              <Label>Travel Time</Label>
              <div className="mt-2">
                <select
                  value={selectedTravelTimeModel || ''}
                  onChange={(e) => setSelectedTravelTimeModel(e.target.value)}
                  className="w-full p-2 border rounded text-gray-400"
                  style={{ color: selectedTravelTimeModel ? '#111827' : '#9CA3AF' }}
                >
                  <option value="" disabled className="text-gray-400">Select travel time model</option>
                  {controlPanelConfig.travelTimeModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedTravelTimeModel 
                    ? controlPanelConfig.travelTimeModels.options.find(model => model.id === selectedTravelTimeModel)?.description
                    : 'Select a travel time model'
                  }
                </p>
              </div>
            </div>

            {/* Service Time Model */}
            <div>
              <Label>Service Time</Label>
              <div className="mt-2">
                <select
                  value={selectedServiceTimeModel || ''}
                  onChange={(e) => setSelectedServiceTimeModel(e.target.value)}
                  className="w-full p-2 border rounded text-gray-400"
                  style={{ color: selectedServiceTimeModel ? '#111827' : '#9CA3AF' }}
                >
                  <option value="" disabled className="text-gray-400">Select service time model</option>
                  {controlPanelConfig.serviceTimeModels.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedServiceTimeModel 
                    ? controlPanelConfig.serviceTimeModels.options.find(model => model.id === selectedServiceTimeModel)?.description
                    : 'Select a service time model'
                  }
                </p>
              </div>
            </div>

            {/* Dispatch Policy */}
            <div>
              <Label>Dispatch Policy</Label>
              <div className="mt-2">
                <select
                  value={selectedDispatchPolicy || ''}
                  onChange={(e) => onDispatchPolicyChange?.(e.target.value)}
                  className="w-full p-2 border rounded text-gray-400"
                  style={{ color: selectedDispatchPolicy ? '#111827' : '#9CA3AF' }}
                >
                  <option value="" disabled className="text-gray-400">Select dispatch policy</option>
                  {controlPanelConfig.dispatchPolicies.options.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedDispatchPolicy 
                    ? controlPanelConfig.dispatchPolicies.options.find(policy => policy.id === selectedDispatchPolicy)?.description
                    : 'Select a dispatch policy'
                  }
                </p>
              </div>
            </div>

            {/* Service Zones Data - Only show when Firebeats policy is selected */}
            {selectedDispatchPolicy === 'firebeats' && (
              <div>
                <Label>Service Zones Data</Label>
                <div className="mt-2">
                  <select
                    value={selectedServiceZoneFile || ''}
                    onChange={(e) => onServiceZoneFileChange?.(e.target.value)}
                    className="w-full p-2 border rounded text-gray-400"
                    style={{ color: selectedServiceZoneFile ? '#111827' : '#9CA3AF' }}
                  >
                    <option value="" disabled className="text-gray-400">Select service zones</option>
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
          <div className="pt-4 space-y-3">
            <Button
              onClick={handleRunSimulation}
              disabled={isSimulating || !isFormValid()}
              className={`w-full h-12 ${!isFormValid() && !isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            {!isFormValid() && !isSimulating && (
              <div className="text-xs text-gray-500 text-center">
                <div className="text-red-500 font-medium">
                  Missing:
                  {getMissingFields().map((field, index) => (
                    <p key={index} className="mt-1">{field}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Save Station Configuration Button */}
            <Button
              onClick={handleSaveStationConfiguration}
              disabled={stations.length === 0}
              variant="outline"
              className={`w-full h-10 ${stations.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              SAVE STATION CONFIG
            </Button>
          </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
