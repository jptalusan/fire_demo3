/// <reference types="node" />
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Play, Settings } from 'lucide-react';
import { ProcessedStation } from '../utils/dataProcessing';

interface ControlPanelProps {
  onRunSimulation: () => void;
  selectedIncidentFile: string;
  onIncidentFileChange: (file: string) => void;
  onClearSettings: () => void;
  onSimulationSuccess?: (result: any) => void;
  selectedStationFile: string;
  onStationFileChange: (file: string) => void;
  stations: ProcessedStation[];
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
}: ControlPanelProps) {
  const [fireStationsFile, setFireStationsFile] = useState<File | null>(null);
  const [incidentsFile, setIncidentsFile] = useState<File | null>(null);
  const [responseTime, setResponseTime] = useState('5');
  const [maxDistance, setMaxDistance] = useState('10');
  const [incidentFiles, setIncidentFiles] = useState<string[]>([]);
  const [stationFiles, setStationFiles] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false); // Removed duplicate prop and initialized state

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
        selectedIncidentFile,
        selectedStationFile,
        stations: stations.map(station => ({
          id: station.id,
          name: station.displayName,
          lat: station.lat,
          lng: station.lon,
          apparatus: station.apparatus || []
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
    <div className="h-full bg-card border-r flex flex-col">
      <Card className="h-full border-0 rounded-none flex flex-col">
        {/* Header - Fixed */}
        <CardHeader className="flex-shrink-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Simulation Controls
          </CardTitle>
        </CardHeader>

        {/* Scrollable Content */}
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

          {/* File Uploads */}
          <div className="space-y-4">
            <div>
              <Label>Fire Stations Data</Label>
              <div className="mt-2">
                <select
                  value={selectedStationFile}
                  onChange={(e) => onStationFileChange(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select stations</option>
                  {stationFiles?.length > 0 ? (
                    stationFiles.map((file) => (
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

            <div>
              <Label>Incidents Data</Label>
              <div className="mt-2">
                <select
                  value={selectedIncidentFile}
                  onChange={(e) => onIncidentFileChange(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select incidents</option>
                  {incidentFiles?.length > 0 ? (
                    incidentFiles.map((file) => (
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
          </div>

          <Separator />

          {/* Configuration Parameters */}
          <div className="space-y-4">
            <h4>Simulation Parameters</h4>

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

          <Separator />

          {/* Additional Options */}
          <div className="space-y-3">
            <h4>Analysis Options</h4>
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
        </CardContent>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-4 border-t bg-card">
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
      </Card>
    </div>
  );
}
