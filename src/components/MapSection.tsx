import React, { useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColors } from '../config/categoryColors';
import { processStations, createDetailedStationPopup, createFirebeatsStationPopup, createStationIcon, ProcessedStation, processIncidents, createIncidentPopup, createIncidentIcon, ProcessedIncident, Apparatus } from '../utils/dataProcessing';
import { createDraggableStationMarker, defaultDragHandlers, setupGlobalDeleteHandler } from '../utils/markerControl';
import config from '../config/mapConfig.json';
import controlPanelConfig from '../config/controlPanelConfig.json';

// Apparatus counts interface for the new design
interface ApparatusCounts {
  [key: string]: number;
}

// All possible apparatus types from CSV columns
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

// Extend the Window interface to include our custom global functions
declare global {
  interface Window {
    deleteStation?: (stationId: string) => void;
    firebeatsUpdateServiceZone?: (stationId: string, zone: string) => void;
    openApparatusManager?: (stationId: string) => void;
  }
}

interface MapSectionProps {
  simulationResults: any;
  selectedIncidentFile: string;
  selectedStationFile: string;
  selectedDispatchPolicy: string;
  selectedServiceZoneFile: string;
  selectedStationData?: string;
  stations: ProcessedStation[];
  onStationsChange: (stations: ProcessedStation[]) => void;
  onApparatusChange?: (stationId: string, apparatus: Apparatus[]) => void;
  stationApparatusCounts: Map<string, ApparatusCounts>;
  setStationApparatusCounts: React.Dispatch<React.SetStateAction<Map<string, ApparatusCounts>>>;
  originalApparatusCounts: Map<string, ApparatusCounts>;
  setOriginalApparatusCounts: React.Dispatch<React.SetStateAction<Map<string, ApparatusCounts>>>;
  selectedIncidentModel?: string;
  startDate?: Date;
  endDate?: Date;
}

interface FireStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  resources: string[];
}

interface Incident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export function MapSection({ 
  simulationResults, 
  selectedIncidentFile, 
  selectedStationFile, 
  selectedDispatchPolicy,
  selectedServiceZoneFile,
  selectedStationData,
  stations, 
  onStationsChange,
  onApparatusChange,
  stationApparatusCounts,
  setStationApparatusCounts,
  originalApparatusCounts,
  setOriginalApparatusCounts,
  selectedIncidentModel,
  startDate,
  endDate
}: MapSectionProps) {
  const [incidents, setIncidents] = useState<ProcessedIncident[]>([]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markerLayer, setMarkerLayer] = useState<L.LayerGroup | null>(null);
  const [serviceZoneLayer, setServiceZoneLayer] = useState<L.LayerGroup | null>(null);
  const [stationMarkers, setStationMarkers] = useState<Map<string, L.Marker>>(new Map()); // Track station markers
  const [apparatusManagerOpen, setApparatusManagerOpen] = useState(false);
  const [selectedStationForApparatus, setSelectedStationForApparatus] = useState<ProcessedStation | null>(null);
  const [stationApparatus, setStationApparatus] = useState<Map<string, Apparatus[]>>(new Map());
  const [editingApparatus, setEditingApparatus] = useState<string | null>(null);
  
  // Layer toggle states
  const [gridsLayer, setGridsLayer] = useState<L.LayerGroup | null>(null);
  const [zonesLayer, setZonesLayer] = useState<L.LayerGroup | null>(null);
  const [showGrids, setShowGrids] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [currentStationData, setCurrentStationData] = useState<string>('');

  // Helper function to get apparatus data for payload
  const getStationWithApparatus = useCallback((station: ProcessedStation) => {
    const apparatus = stationApparatus.get(station.id) || [];
    return {
      ...station,
      apparatus: apparatus.map(app => ({
        id: app.id,
        type: app.type,
        name: app.name,
        status: app.status,
        crew: app.crew
      }))
    };
  }, [stationApparatus]);

  // Create apparatus from CSV equipment columns
  const createApparatusFromCSV = useCallback((stationRow: any, stationId: string, stationNumber: number): Apparatus[] => {
    const apparatus: Apparatus[] = [];
    const equipmentColumns = ['Engine_ID', 'Truck', 'Rescue', 'Hazard', 'Squad', 'FAST', 'Medic', 'Brush', 'Boat', 'UTV', 'REACH', 'Chief'];
    
    equipmentColumns.forEach(column => {
      const count = parseInt(stationRow[column]) || 0;
      if (count > 0) {
        for (let i = 1; i <= count; i++) {
          let apparatusType: Apparatus['type'];
          let apparatusName: string;
          
          switch (column) {
            case 'Engine_ID':
              apparatusType = 'Engine';
              apparatusName = `Engine ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
              break;
            case 'Truck':
              apparatusType = 'Ladder';
              apparatusName = `Truck ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
              break;
            case 'Rescue':
              apparatusType = 'Rescue';
              apparatusName = `Rescue ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
              break;
            case 'Medic':
              apparatusType = 'Ambulance';
              apparatusName = `Medic ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
              break;
            case 'Chief':
              apparatusType = 'Chief';
              apparatusName = `Chief ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
              break;
            default:
              apparatusType = 'Engine'; // Default fallback
              apparatusName = `${column} ${stationNumber.toString().padStart(2, '0')}${count > 1 ? `-${i}` : ''}`;
          }
          
          apparatus.push({
            id: `${column.toLowerCase()}-${stationId}-${i}`,
            type: apparatusType,
            name: apparatusName,
            status: 'Available',
            crew: 1 // Each apparatus represents a count of 1
          });
        }
      }
    });
    
    return apparatus;
  }, []);

  // Extract apparatus counts from CSV row
  const extractApparatusCountsFromCSV = useCallback((stationRow: any): ApparatusCounts => {
    const counts: ApparatusCounts = {};
    APPARATUS_TYPES.forEach(apparatusType => {
      counts[apparatusType.key] = parseInt(stationRow[apparatusType.csvColumn]) || 0;
    });
    return counts;
  }, []);

  // Parse CSV data
  const parseCSV = useCallback((csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index]?.trim() || '';
        return obj;
      }, {} as any);
    }).filter(Boolean); // Filter out any null entries from empty lines
  }, []);

  // Load grids and zones layers - optimized with minimal dependencies
  const loadGeographicalLayers = useCallback(async (stationDataId: string) => {
    if (!mapInstance) return;

    const controlPanelConfig = await import('../config/controlPanelConfig.json');
    const stationConfig = controlPanelConfig.stationData.options.find(opt => opt.id === stationDataId);
    
    if (!stationConfig) return;

    // Clear existing layers
    if (gridsLayer) {
      mapInstance.removeLayer(gridsLayer);
      setGridsLayer(null);
    }
    if (zonesLayer) {
      mapInstance.removeLayer(zonesLayer);
      setZonesLayer(null);
    }

    // Load grids layer
    if (stationConfig.grids) {
      try {
        const gridsResponse = await fetch(`/data/${stationConfig.grids}`);
        const gridsData = await gridsResponse.json();
        
        const gridsLayerGroup = L.layerGroup();
        
        L.geoJSON(gridsData, {
          style: {
            color: '#2563eb',
            weight: 2,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.1
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const { primary_zone, grid_id, intersecting_zones } = feature.properties;
              const popupContent = `
                <div class="p-2">
                  <h4 class="font-semibold">Grid Information</h4>
                  <p><strong>Grid ID:</strong> ${grid_id || 'N/A'}</p>
                  <p><strong>Primary Zone:</strong> ${primary_zone || 'N/A'}</p>
                  <p><strong>Intersecting Zones:</strong> ${intersecting_zones || 'N/A'}</p>
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(gridsLayerGroup);
        
        setGridsLayer(gridsLayerGroup);
        if (showGrids) {
          gridsLayerGroup.addTo(mapInstance);
        }
      } catch (error) {
        console.error('Error loading grids layer:', error);
      }
    }

    // Load zones layer
    if (stationConfig.zones) {
      try {
        const zonesResponse = await fetch(`/data/${stationConfig.zones}`);
        const zonesData = await zonesResponse.json();
        
        const zonesLayerGroup = L.layerGroup();
        
        L.geoJSON(zonesData, {
          style: {
            color: '#dc2626',
            weight: 2,
            opacity: 0.8,
            fillColor: '#ef4444',
            fillOpacity: 0.1
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const { ZONE, NAME, ZONE_ID, TYPE } = feature.properties;
              const popupContent = `
                <div class="p-2">
                  <h4 class="font-semibold">Zone Information</h4>
                  <p><strong>Zone:</strong> ${ZONE || 'N/A'}</p>
                  <p><strong>Name:</strong> ${NAME || 'N/A'}</p>
                  <p><strong>Zone ID:</strong> ${ZONE_ID !== undefined ? ZONE_ID : 'N/A'}</p>
                  <p><strong>Type:</strong> ${TYPE || 'N/A'}</p>
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(zonesLayerGroup);
        
        setZonesLayer(zonesLayerGroup);
        if (showZones) {
          zonesLayerGroup.addTo(mapInstance);
        }
      } catch (error) {
        console.error('Error loading zones layer:', error);
      }
    }

        // Load stations from CSV if configured
        if (stationConfig.stations) {
          try {
            console.log('Loading stations from config:', stationConfig.stations);
            const stationsResponse = await fetch(`/data/${stationConfig.stations}`);
            const csvText = await stationsResponse.text();
            const parsedStations = parseCSV(csvText);
            
            // Process stations and create apparatus from CSV equipment columns
            const processedStations = parsedStations.slice(0, 100).map((row, index) => {
              const stationNumberMatch = row.Stations?.match(/(\d+)/) || row['Facility Name']?.match(/(\d+)/);
              const stationNumber = stationNumberMatch ? parseInt(stationNumberMatch[1]) : index + 1;
              
              const station: ProcessedStation = {
                id: row.StationID || row.id || `station-${index}`,
                name: row.Stations || row['Facility Name'] || `Station ${stationNumber}`,
                address: row.Address || 'Address not available',
                lat: parseFloat(row.lat),
                lon: parseFloat(row.lon),
                stationNumber: stationNumber,
                displayName: `Station ${stationNumber.toString().padStart(2, '0')}`,
                apparatus: []
              };
              
              // Create apparatus from CSV equipment data
              const apparatus = createApparatusFromCSV(row, station.id, stationNumber);
              setStationApparatus(prev => new Map(prev).set(station.id, apparatus));
              
              // Extract apparatus counts for the new UI
              const apparatusCounts = extractApparatusCountsFromCSV(row);
              setStationApparatusCounts(prev => new Map(prev).set(station.id, apparatusCounts));
              setOriginalApparatusCounts(prev => new Map(prev).set(station.id, { ...apparatusCounts }));
              
              return station;
            }).filter(station => !isNaN(station.lat) && !isNaN(station.lon));
            
            console.log('Processed stations from CSV:', processedStations.length);
            onStationsChange(processedStations);
            
          } catch (error) {
            console.error('Error loading stations from CSV:', error);
          }
        }

        setCurrentStationData(stationDataId);
      }, [mapInstance, gridsLayer, zonesLayer, showGrids, showZones]); // Minimal dependencies to prevent unnecessary re-creation  // Toggle grids layer
  const toggleGridsLayer = useCallback(() => {
    if (!mapInstance || !gridsLayer) return;
    
    if (showGrids) {
      mapInstance.removeLayer(gridsLayer);
    } else {
      gridsLayer.addTo(mapInstance);
    }
    setShowGrids(!showGrids);
  }, [mapInstance, gridsLayer, showGrids]);

  // Toggle zones layer
  const toggleZonesLayer = useCallback(() => {
    if (!mapInstance || !zonesLayer) return;
    
    if (showZones) {
      mapInstance.removeLayer(zonesLayer);
    } else {
      zonesLayer.addTo(mapInstance);
    }
    setShowZones(!showZones);
  }, [mapInstance, zonesLayer, showZones]);

  // Point in polygon check
  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      const intersect = ((yi > point.lng) !== (yj > point.lng))
          && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  // Handle manual service zone update from popup
  const handleServiceZoneUpdate = useCallback((stationId: string, newZone: string) => {
    console.log(`handleServiceZoneUpdate called - stationId: ${stationId}, newZone: ${newZone}`);
    const updatedStations = stations.map(station => 
      station.id === stationId ? { ...station, serviceZone: newZone } : station
    );
    console.log('Updated stations array:', updatedStations);
    onStationsChange(updatedStations);

    // Force popup to refresh its content after update
    const marker = stationMarkers.get(stationId);
    const updatedStation = updatedStations.find(s => s.id === stationId);
    console.log('Found marker and updated station:', marker ? 'yes' : 'no', updatedStation ? 'yes' : 'no');
    if (marker && updatedStation) {
      // Re-bind the popup with the new station data to show the change immediately
      marker.unbindPopup();
      marker.bindPopup(createFirebeatsStationPopup(updatedStation));
      if (marker.isPopupOpen()) {
        marker.openPopup();
      }
      console.log('Popup updated successfully');
    }
  }, [stations, onStationsChange, stationMarkers]);

  // Handle apparatus manager opening
  const handleOpenApparatusManager = useCallback((stationId: string) => {
    console.log('handleOpenApparatusManager called with stationId:', stationId);
    const station = stations.find(s => s.id === stationId);
    console.log('Found station:', station);
    if (station) {
      setSelectedStationForApparatus(station);
      setApparatusManagerOpen(true);
      console.log('Apparatus manager opened for station:', station.displayName);
    } else {
      console.error('Station not found with ID:', stationId);
    }
  }, [stations]);

  // Handle apparatus update
  const handleApparatusUpdate = useCallback((stationId: string, apparatusId: string, updatedApparatus: Partial<Apparatus>) => {
    let updatedApparatusList: Apparatus[] = [];
    setStationApparatus(prev => {
      const newMap = new Map(prev);
      const stationApparatusList = newMap.get(stationId) || [];
      updatedApparatusList = stationApparatusList.map(app => 
        app.id === apparatusId ? { ...app, ...updatedApparatus } : app
      );
      newMap.set(stationId, updatedApparatusList);
      return newMap;
    });
    setEditingApparatus(null);
    
    // Notify parent component of apparatus changes
    if (onApparatusChange) {
      onApparatusChange(stationId, updatedApparatusList);
    }
  }, [onApparatusChange]);

  // Handle apparatus count update
  const handleApparatusCountUpdate = useCallback((stationId: string, apparatusKey: string, count: number) => {
    setStationApparatusCounts(prev => {
      const newMap = new Map(prev);
      const currentCounts = newMap.get(stationId) || {};
      const updatedCounts = { ...currentCounts, [apparatusKey]: Math.max(0, count) };
      newMap.set(stationId, updatedCounts);
      return newMap;
    });
  }, []);

  // Get current apparatus counts for a station
  const getApparatusCounts = useCallback((stationId: string): ApparatusCounts => {
    return stationApparatusCounts.get(stationId) || {};
  }, [stationApparatusCounts]);

  // Check if an apparatus count has been modified from the original CSV value
  const isApparatusCountModified = useCallback((stationId: string, apparatusKey: string): boolean => {
    const originalCounts = originalApparatusCounts.get(stationId) || {};
    const currentCounts = stationApparatusCounts.get(stationId) || {};
    const originalCount = originalCounts[apparatusKey] || 0;
    const currentCount = currentCounts[apparatusKey] || 0;
    return originalCount !== currentCount;
  }, [originalApparatusCounts, stationApparatusCounts]);

  // Initialize default apparatus for new stations
  useEffect(() => {
    stations.forEach(station => {
      if (!stationApparatus.has(station.id)) {
        const defaultApparatus: Apparatus[] = [
          {
            id: `engine-${station.id}`,
            type: 'Engine',
            name: `Engine ${station.stationNumber.toString().padStart(2, '0')}`,
            status: 'Available',
            crew: 4
          },
          {
            id: `ambulance-${station.id}`,
            type: 'Ambulance',
            name: `Ambulance ${station.stationNumber.toString().padStart(2, '0')}`,
            status: 'Available',
            crew: 2
          }
        ];
        setStationApparatus(prev => new Map(prev).set(station.id, defaultApparatus));
      }
    });
  }, [stations, stationApparatus]);

  // Load geographical layers and stations when station data changes or map is ready
  useEffect(() => {
    if (!mapInstance) return;
    
    const stationDataToLoad = selectedStationData || 'default_stations';
    
    // Only load if the station data has actually changed
    if (stationDataToLoad !== currentStationData) {
      console.log(`Loading station data: ${stationDataToLoad} (previous: ${currentStationData})`);
      loadGeographicalLayers(stationDataToLoad);
    }
  }, [mapInstance, selectedStationData, currentStationData, loadGeographicalLayers]);

  // Set up global handlers
  useEffect(() => {
    window.firebeatsUpdateServiceZone = handleServiceZoneUpdate;
    window.openApparatusManager = handleOpenApparatusManager;
    return () => {
      delete window.firebeatsUpdateServiceZone;
      delete window.openApparatusManager;
    };
  }, [handleServiceZoneUpdate, handleOpenApparatusManager]);


  // Handle station deletion using useCallback to ensure we always have the latest state
  const handleStationDelete = useCallback((stationId: string) => {
    console.log(`Attempting to delete station with ID: ${stationId}`);
    
    // Remove from stations array
    const filteredStations = stations.filter(station => station.id !== stationId);
    console.log(`Filtered stations count: ${filteredStations.length} (was ${stations.length})`);
    onStationsChange(filteredStations);
    
    // Remove marker from map
    const marker = stationMarkers.get(stationId);
    if (marker && markerLayer) {
      markerLayer.removeLayer(marker);
      setStationMarkers(prev => {
        const newMap = new Map(prev);
        newMap.delete(stationId);
        return newMap;
      });
      console.log(`Removed marker for station ${stationId} from map`);
    } else {
      console.log(`No marker found for station ${stationId}`);
    }
    
    console.log(`Successfully deleted station with ID: ${stationId}`);
  }, [stations, stationMarkers, markerLayer, onStationsChange]);

  // Set up global delete handler - update whenever the handler changes
  useEffect(() => {
    console.log('Setting up global delete handler');
    setupGlobalDeleteHandler(handleStationDelete);
  }, [handleStationDelete]);

  // Load service zones (GeoJSON polygons)
  useEffect(() => {
    const loadServiceZones = async () => {
      if (!selectedServiceZoneFile || !serviceZoneLayer) {
        // Clear service zones if no file selected
        if (serviceZoneLayer) {
          serviceZoneLayer.clearLayers();
        }
        return;
      }

      try {
        console.log('Loading service zones from:', `/data/${selectedServiceZoneFile}`);
        const response = await fetch(`/data/${selectedServiceZoneFile}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const geoJsonData = await response.json();
        console.log('GeoJSON data loaded:', geoJsonData);

        // Clear existing service zone layers
        serviceZoneLayer.clearLayers();

        // Add GeoJSON to the service zone layer
        const geoJsonLayer = L.geoJSON(geoJsonData, {
          style: (feature) => {
            // Style for the polygons
            return {
              fillColor: '#3388ff',
              weight: 2,
              opacity: 1,
              color: '#3388ff',
              dashArray: '3',
              fillOpacity: 0.2
            };
          },
          onEachFeature: (feature, layer) => {
            // Add popup with zone information if available
            if (feature.properties) {
              const popupContent = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>');
              layer.bindPopup(`<div>${popupContent}</div>`);
            }
          }
        });

        geoJsonLayer.addTo(serviceZoneLayer);
        console.log('Service zones added to map');

      } catch (error) {
        console.error('Error loading service zones:', error);
      }
    };

    loadServiceZones();
  }, [selectedServiceZoneFile, serviceZoneLayer]);

  // Helper function to filter incidents by date range
  const filterIncidentsByDateRange = useCallback((incidents: any[], startDate?: Date, endDate?: Date) => {
    if (!startDate && !endDate) {
      return incidents; // No date filtering
    }

    return incidents.filter(incident => {
      if (!incident.datetime) {
        return true; // Include incidents without datetime
      }

      const incidentDate = new Date(incident.datetime);
      
      // Check if the date is valid
      if (isNaN(incidentDate.getTime())) {
        return true; // Include incidents with invalid dates
      }

      // Filter by start date
      if (startDate && incidentDate < startDate) {
        return false;
      }

      // Filter by end date (include the entire end date)
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999); // End of the selected day
        if (incidentDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, []);

  useEffect(() => {
    const loadIncidents = async () => {
      // Clear incidents if no incident model selected
      if (!selectedIncidentModel) {
        setIncidents([]);
        return;
      }

      // Find the selected incident model configuration
      const incidentModelConfig = controlPanelConfig.incidentModels.options.find(
        model => model.id === selectedIncidentModel
      );

      // Only load incidents if the model has a dataFile
      if (!incidentModelConfig || !incidentModelConfig.dataFile) {
        setIncidents([]);
        return;
      }

      try {
        console.log('Loading incidents from model:', selectedIncidentModel, 'dataFile:', incidentModelConfig.dataFile);
        const response = await fetch(incidentModelConfig.dataFile);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('CSV text length:', csvText.length);
        const parsedIncidents = parseCSV(csvText);
        console.log('Parsed incidents before filtering:', parsedIncidents.length);
        
        // TEMPORARILY COMMENTED OUT: Filter incidents by date range
        // const filteredIncidents = filterIncidentsByDateRange(parsedIncidents, startDate, endDate);
        // console.log('Incidents after date filtering:', filteredIncidents.length);
        
        // For now, show all incidents without date filtering
        const filteredIncidents = parsedIncidents;
        console.log('Showing all incidents (date filtering disabled):', filteredIncidents.length);
        
        // Process and limit incidents (reduce limit to improve performance)
        const processedIncidents = processIncidents(filteredIncidents.slice(0, 500));
        console.log('Final processed incidents:', processedIncidents.length);
        setIncidents(processedIncidents);
      } catch (error) {
        console.error('Error loading incidents:', error);
        setIncidents([]);
      }
    };

    loadIncidents();
  }, [selectedIncidentModel]); // Temporarily removed: startDate, endDate, filterIncidentsByDateRange

  useEffect(() => {
    const loadStations = async () => {
      if (!selectedStationFile) {
        onStationsChange([]); // Clear stations if no file selected
        return;
      }

      try {
        console.log('Loading stations from:', `/data/${selectedStationFile}`);
        const response = await fetch(`/data/${selectedStationFile}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('CSV text length:', csvText.length);
        const parsedStations = parseCSV(csvText);
        console.log('Parsed stations:', parsedStations.length);
        
        // Process stations and create apparatus from CSV equipment columns
        const processedStations = parsedStations.slice(0, 100).map((row, index) => {
          // Use existing processStations logic but handle station number from "Stations" column
          const stationNumberMatch = row.Stations?.match(/(\d+)/) || row['Facility Name']?.match(/(\d+)/);
          const stationNumber = stationNumberMatch ? parseInt(stationNumberMatch[1]) : index + 1;
          
          const station: ProcessedStation = {
            id: row.StationID || row.id || `station-${index}`,
            name: row.Stations || row['Facility Name'] || `Station ${stationNumber}`,
            address: row.Address || 'Address not available',
            lat: parseFloat(row.lat),
            lon: parseFloat(row.lon),
            stationNumber: stationNumber,
            displayName: `Station ${stationNumber.toString().padStart(2, '0')}`,
            apparatus: []
          };
          
          // Create apparatus from CSV equipment data
          if (selectedStationFile === 'stations.csv') {
            const apparatus = createApparatusFromCSV(row, station.id, stationNumber);
            setStationApparatus(prev => new Map(prev).set(station.id, apparatus));
            
            // Extract apparatus counts for the new UI
            const apparatusCounts = extractApparatusCountsFromCSV(row);
            setStationApparatusCounts(prev => new Map(prev).set(station.id, apparatusCounts));
            setOriginalApparatusCounts(prev => new Map(prev).set(station.id, { ...apparatusCounts }));
          }
          
          return station;
        }).filter(station => !isNaN(station.lat) && !isNaN(station.lon));
        
        onStationsChange(processedStations);
      } catch (error) {
        console.error('Error loading stations:', error);
      }
    };

    loadStations();
  }, [selectedStationFile, createApparatusFromCSV, extractApparatusCountsFromCSV, setStationApparatus, onStationsChange]);

  useEffect(() => {
    console.log('Initializing map');
    const map = L.map('map').setView([config.map.defaultView.lat, config.map.defaultView.lng], config.map.defaultView.zoom);

    L.tileLayer(config.map.tileLayer.url, config.map.tileLayer.options).addTo(map);

    console.log('Map initialized', map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], config.map.defaultView.zoom);
          L.marker([latitude, longitude]).addTo(map).bindPopup('You are here').openPopup();
        },
        () => {
          console.error('Geolocation permission denied');
        }
      );
    }

    // Store map instance in state
    setMapInstance(map);

    // Initialize service zone layer
    const newServiceZoneLayer = L.layerGroup().addTo(map);
    setServiceZoneLayer(newServiceZoneLayer);

    // Cleanup on unmount
    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapInstance) return;

    // Ensure marker layer is initialized
    if (!markerLayer) {
      const newMarkerLayer = L.layerGroup().addTo(mapInstance);
      setMarkerLayer(newMarkerLayer);
    }

      // Clear existing markers if markerLayer is initialized
      if (markerLayer) {
        markerLayer.clearLayers();
        setStationMarkers(new Map()); // Clear tracked markers

        // Add station markers first (so incidents appear on top) - now draggable with detailed popups
        const newStationMarkers = new Map<string, L.Marker>();
        stations.forEach(station => {
          const iconHtml = createStationIcon(station);
          
          // Create custom drag handlers that update the shared state
          const customDragHandlers = {
            ...defaultDragHandlers,
            onStationUpdate: (updatedStation: ProcessedStation) => {
              let finalStation = updatedStation;
              let assignedZone = ''; // Keep track of the assigned zone
              // If firebeats, check if station is in a service zone
              if (selectedDispatchPolicy === 'firebeats' && serviceZoneLayer) {
                const point = L.latLng(updatedStation.lat, updatedStation.lon);

                serviceZoneLayer.eachLayer(layer => {
                  if (layer instanceof L.GeoJSON) {
                    layer.eachLayer(featureLayer => {
                      if (featureLayer instanceof L.Polygon) {
                        const latLngs = (featureLayer as L.Polygon).getLatLngs();
                        const polygon = Array.isArray(latLngs[0]) ? latLngs[0] as L.LatLng[] : latLngs as L.LatLng[];
                        if (isPointInPolygon(point, polygon)) {
                          // Get zone name from properties - try common property names
                          const props = (featureLayer as any).feature?.properties;
                          console.log('Found polygon properties:', props); // Debug log
                          
                          // Try various common property names for zone identification
                          assignedZone = props?.name || 
                                      props?.FIRE_BEAT || 
                                      props?.zone_name || 
                                      props?.zone || 
                                      props?.id || 
                                      props?.ID || 
                                      props?.ZONE || 
                                      props?.fire_beat ||
                                      props?.firebeat ||
                                      props?.beat ||
                                      props?.district ||
                                      props?.area ||
                                      `Zone ${props?.FID || props?.OBJECTID || 'Unknown'}`;
                          
                          console.log('Assigned zone:', assignedZone); // Debug log
                        }
                      }
                    });
                  }
                });
                
                if (assignedZone) {
                  finalStation = { ...updatedStation, serviceZone: assignedZone };
                }
              }

              // Update the shared stations state when a marker is moved
              const updatedStations = stations.map(s => 
                s.id === finalStation.id ? finalStation : s
              );
              onStationsChange(updatedStations);

              // Add visual feedback on drag-and-drop
              if (assignedZone) {
                const marker = stationMarkers.get(finalStation.id);
                if (marker) {
                  marker.bindTooltip(`Assigned to: ${assignedZone}`, { permanent: true, direction: 'top' }).openTooltip();
                  setTimeout(() => {
                    marker.closeTooltip().unbindTooltip();
                  }, 2000); // Tooltip disappears after 2 seconds
                }
              }
            }
          };
          
          const marker = createDraggableStationMarker(station, iconHtml, customDragHandlers);

          marker.addTo(markerLayer);
          
          // Bind the correct popup based on dispatch policy
          const popupContent = selectedDispatchPolicy === 'firebeats'
            ? createFirebeatsStationPopup(station)
            : createDetailedStationPopup(station);
          
          marker.bindPopup(popupContent);

          // Refresh popup content when it opens to ensure it's up-to-date
          marker.on('popupopen', () => {
            const freshStationData = stations.find(s => s.id === station.id) || station;
            const freshPopupContent = selectedDispatchPolicy === 'firebeats'
              ? createFirebeatsStationPopup(freshStationData)
              : createDetailedStationPopup(freshStationData);
            marker.setPopupContent(freshPopupContent);
          });
          
          // Track the marker
          newStationMarkers.set(station.id, marker);
        });
        setStationMarkers(newStationMarkers);

        // Add incident markers
        incidents.forEach(incident => {
          const marker = L.marker([incident.lat, incident.lon], {
            icon: L.divIcon({
              className: 'custom-marker incident-marker',
              html: createIncidentIcon(incident),
              iconSize: [24, 24], // Updated size to match the new icon
              iconAnchor: [12, 12] // Center the anchor
            })
          });

          marker.addTo(markerLayer);
          marker.bindPopup(createIncidentPopup(incident));
        });
      }
  }, [incidents, stations, markerLayer, selectedDispatchPolicy, serviceZoneLayer, onStationsChange]);

  // Debug logging for sidebar state
  console.log('MapSection render - apparatusManagerOpen:', apparatusManagerOpen, 'selectedStationForApparatus:', selectedStationForApparatus);

  return (
    <div className="h-full w-full bg-white relative">
      {/* Leaflet map container */}
      <div id="map" className="h-full w-full absolute inset-0" />
      
      {/* Layer Controls */}
      {(gridsLayer || zonesLayer) && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2" style={{zIndex: 10000}}>
          <div className="text-sm font-semibold text-gray-700 mb-2">Map Layers</div>
          {gridsLayer && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrids}
                onChange={toggleGridsLayer}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Grids</span>
              <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded-sm"></div>
            </label>
          )}
          {zonesLayer && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showZones}
                onChange={toggleZonesLayer}
                className="form-checkbox h-4 w-4 text-red-600"
              />
              <span className="text-sm text-gray-700">Zones</span>
              <div className="w-3 h-3 bg-red-500 border border-red-600 rounded-sm"></div>
            </label>
          )}
        </div>
      )}
      
      {/* Apparatus Manager Sidebar */}
      {apparatusManagerOpen && selectedStationForApparatus && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-300 shadow-lg overflow-y-auto" style={{zIndex: 1000}}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedStationForApparatus.displayName} - Apparatus
              </h3>
              <button
                onClick={() => setApparatusManagerOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Address:</strong> {selectedStationForApparatus.address}</p>
                <p><strong>Service Zone:</strong> {selectedStationForApparatus.serviceZone || 'Not assigned'}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Apparatus Configuration</h4>
                <div className="space-y-3">
                  {APPARATUS_TYPES.map(apparatusType => {
                    const currentCounts = getApparatusCounts(selectedStationForApparatus.id);
                    const count = currentCounts[apparatusType.key] || 0;
                    const isActive = count > 0;
                    const isModified = isApparatusCountModified(selectedStationForApparatus.id, apparatusType.key);
                    
                    return (
                      <div 
                        key={apparatusType.key} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                          isActive 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-gray-100 border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              isModified ? 'bg-red-500' : (isActive ? 'bg-blue-500' : 'bg-gray-400')
                            }`}
                          />
                          <span className={`font-medium ${
                            isActive ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {apparatusType.name}
                            {isModified && <span className="text-xs text-red-600 ml-2 font-normal">(modified)</span>}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApparatusCountUpdate(selectedStationForApparatus.id, apparatusType.key, count - 1)}
                            disabled={count <= 0}
                            className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {count}
                          </span>
                          <button
                            onClick={() => handleApparatusCountUpdate(selectedStationForApparatus.id, apparatusType.key, count + 1)}
                            className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Total Apparatus</h5>
                  <p className="text-sm text-gray-600">
                    {Object.values(getApparatusCounts(selectedStationForApparatus.id)).reduce((sum, count) => sum + count, 0)} units configured
                  </p>
                </div>
                
                <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Active</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span>Inactive</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Modified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}