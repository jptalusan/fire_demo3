import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColors } from '../config/categoryColors';
import { processStations, createStationPopup, createStationIcon, ProcessedStation, processIncidents, createIncidentPopup, createIncidentIcon, ProcessedIncident } from '../utils/dataProcessing';
import { createDraggableStationMarker, defaultDragHandlers } from '../utils/markerControl';
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
}

export function MapSection({ simulationResults, selectedIncidentFile, selectedStationFile }: MapSectionProps) {
  const [incidents, setIncidents] = useState<ProcessedIncident[]>([]);
  const [stations, setStations] = useState<ProcessedStation[]>([]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markerLayer, setMarkerLayer] = useState<L.LayerGroup | null>(null);

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
        const processedIncidents = processIncidents(parsedIncidents.slice(0, 100)); // Process and limit to first 100
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
        setStations([]); // Clear stations if no file selected
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
        setStations(processedStations);
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

      // Add station markers first (so incidents appear on top) - now draggable
      stations.forEach(station => {
        const iconHtml = createStationIcon(station);
        const marker = createDraggableStationMarker(station, iconHtml, defaultDragHandlers);

        marker.addTo(markerLayer);
        marker.bindPopup(createStationPopup(station));
      });

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
  }, [incidents, stations]);

  return (
    <div className="h-full w-full bg-white relative">
      {/* Leaflet map container */}
      <div id="map" className="h-full w-full absolute inset-0" />
    </div>
  );
}