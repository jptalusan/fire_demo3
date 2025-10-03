import React, { useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColors } from '../config/categoryColors';
import { processStations, createDetailedStationPopup, createStationIcon, ProcessedStation, processIncidents, createIncidentPopup, createIncidentIcon, ProcessedIncident } from '../utils/dataProcessing';
import { createDraggableStationMarker, defaultDragHandlers, setupGlobalDeleteHandler } from '../utils/markerControl';
import config from '../config/mapConfig.json';

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

interface MapSectionProps {
  simulationResults?: any;
  selectedIncidentFile: string;
  selectedStationFile: string;
  selectedServiceZoneFile: string;
  stations: ProcessedStation[];
  onStationsChange: (stations: ProcessedStation[]) => void;
}

export function MapSection({ 
  simulationResults, 
  selectedIncidentFile, 
  selectedStationFile, 
  selectedServiceZoneFile,
  stations, 
  onStationsChange 
}: MapSectionProps) {
  const [incidents, setIncidents] = useState<ProcessedIncident[]>([]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markerLayer, setMarkerLayer] = useState<L.LayerGroup | null>(null);
  const [serviceZoneLayer, setServiceZoneLayer] = useState<L.LayerGroup | null>(null);
  const [stationMarkers, setStationMarkers] = useState<Map<string, L.Marker>>(new Map()); // Track station markers

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
        const processedStations = processStations(parsedStations.slice(0, 100)); // Process and limit to first 100
        onStationsChange(processedStations);
      } catch (error) {
        console.error('Error loading stations:', error);
      }
    };

    loadStations();
  }, [selectedStationFile]);

  const parseCSV = (csvText: string) => {
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
  };

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
              // Update the shared stations state when a marker is moved
              const updatedStations = stations.map(s => 
                s.id === updatedStation.id ? updatedStation : s
              );
              onStationsChange(updatedStations);
            }
          };
          
          const marker = createDraggableStationMarker(station, iconHtml, customDragHandlers);

          marker.addTo(markerLayer);
          marker.bindPopup(createDetailedStationPopup(station));
          
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
  }, [incidents, stations, markerLayer]);

  return (
    <div className="h-full w-full bg-white relative">
      {/* Leaflet map container */}
      <div id="map" className="h-full w-full absolute inset-0" />
    </div>
  );
}