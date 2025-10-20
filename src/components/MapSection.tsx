import React, { useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColors } from '../config/categoryColors';
import { processStations, createDetailedStationPopup, createFirebeatsStationPopup, createStationIcon, ProcessedStation, processIncidents, createIncidentPopup, createIncidentIcon, ProcessedIncident, Apparatus } from '../utils/dataProcessing';
import { createDraggableStationMarker, defaultDragHandlers, setupGlobalDeleteHandler } from '../utils/markerControl';
import config from '../config/mapConfig.json';



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
  onApparatusChange
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
            crew: apparatusType === 'Ambulance' ? 2 : 4
          });
        }
      }
    });
    
    return apparatus;
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

  // Load grids and zones layers
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
          
          return station;
        }).filter(station => !isNaN(station.lat) && !isNaN(station.lon));
        
        console.log('Processed stations from CSV:', processedStations.length);
        onStationsChange(processedStations);
        
      } catch (error) {
        console.error('Error loading stations from CSV:', error);
      }
    }

    setCurrentStationData(stationDataId);
  }, [mapInstance, gridsLayer, zonesLayer, showGrids, showZones, parseCSV, createApparatusFromCSV, setStationApparatus, onStationsChange]);

  // Toggle grids layer
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

  // Load geographical layers when station data changes or on initial load
  useEffect(() => {
    const stationDataToLoad = selectedStationData || 'default_stations'; // Use default if none selected
    
    if (stationDataToLoad !== currentStationData) {
      loadGeographicalLayers(stationDataToLoad);
    }
  }, [selectedStationData, currentStationData, loadGeographicalLayers]);

  // Load default layers when map instance is ready
  useEffect(() => {
    if (mapInstance && !currentStationData) {
      const defaultStationData = selectedStationData || 'default_stations';
      loadGeographicalLayers(defaultStationData);
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

  useEffect(() => {
    const loadIncidents = async () => {
      if (!selectedIncidentFile) {
        setIncidents([]); // Clear incidents if no file selected
        return;
      }

      try {
        console.log('Loading incidents from:', `/data/${selectedIncidentFile}`);
        const response = await fetch(`/data/${selectedIncidentFile}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('CSV text length:', csvText.length);
        const parsedIncidents = parseCSV(csvText);
        console.log('Parsed incidents:', parsedIncidents.length);
        const processedIncidents = processIncidents(parsedIncidents.slice(0, 500)); // Process and limit to first 500
        setIncidents(processedIncidents);
      } catch (error) {
        console.error('Error loading incidents:', error);
      }
    };

    loadIncidents();
  }, [selectedIncidentFile]);

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
          }
          
          return station;
        }).filter(station => !isNaN(station.lat) && !isNaN(station.lon));
        
        onStationsChange(processedStations);
      } catch (error) {
        console.error('Error loading stations:', error);
      }
    };

    loadStations();
  }, [selectedStationFile, createApparatusFromCSV, setStationApparatus, onStationsChange]);

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
                <h4 className="font-medium text-gray-900 mb-3">Equipment & Apparatus</h4>
                <div className="space-y-2">
                  {(stationApparatus.get(selectedStationForApparatus.id) || []).map(apparatus => (
                    <div key={apparatus.id} className="border rounded-lg p-3 bg-gray-50">
                      {editingApparatus === apparatus.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                            <input
                              type="text"
                              defaultValue={apparatus.name}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              id={`name-${apparatus.id}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                            <select
                              defaultValue={apparatus.type}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              id={`type-${apparatus.id}`}
                            >
                              <option value="Engine">Engine</option>
                              <option value="Ladder">Ladder</option>
                              <option value="Rescue">Rescue</option>
                              <option value="Ambulance">Ambulance</option>
                              <option value="Chief">Chief</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select
                              defaultValue={apparatus.status}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              id={`status-${apparatus.id}`}
                            >
                              <option value="Available">Available</option>
                              <option value="In Use">In Use</option>
                              <option value="Out of Service">Out of Service</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Crew Size</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              defaultValue={apparatus.crew}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              id={`crew-${apparatus.id}`}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                const name = (document.getElementById(`name-${apparatus.id}`) as HTMLInputElement).value;
                                const type = (document.getElementById(`type-${apparatus.id}`) as HTMLSelectElement).value as Apparatus['type'];
                                const status = (document.getElementById(`status-${apparatus.id}`) as HTMLSelectElement).value as Apparatus['status'];
                                const crew = parseInt((document.getElementById(`crew-${apparatus.id}`) as HTMLInputElement).value);
                                handleApparatusUpdate(selectedStationForApparatus.id, apparatus.id, { name, type, status, crew });
                              }}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingApparatus(null)}
                              className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium text-gray-900">{apparatus.name}</h5>
                              <p className="text-sm text-gray-600">{apparatus.type}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              apparatus.status === 'Available' ? 'bg-green-100 text-green-800' :
                              apparatus.status === 'In Use' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {apparatus.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Crew Size: {apparatus.crew}</p>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => setEditingApparatus(apparatus.id)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                              Service Log
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Add Equipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}