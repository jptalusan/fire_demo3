import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColors } from '../config/categoryColors';

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
}

export function MapSection({ simulationResults, selectedIncidentFile }: MapSectionProps) {
  const [incidents, setIncidents] = useState<any[]>([]);
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
        setIncidents(parsedIncidents.slice(0, 100)); // Limit to first 100 for performance
      } catch (error) {
        console.error('Error loading incidents:', error);
      }
    };

    loadIncidents();
  }, [selectedIncidentFile]);

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
    const map = L.map('map').setView([40.7128, -74.0060], 13); // Default to NYC

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log('Map initialized', map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
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

    // Clear only incident markers if markerLayer is initialized
    if (markerLayer) {
      // Remove only markers with the "incident" class
      markerLayer.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const icon = layer.getElement();
          if (icon && icon.classList.contains('incident-marker')) {
            markerLayer.removeLayer(layer);
          }
        }
      });

      // Add new incident markers
      incidents.forEach(incident => {
        const color = categoryColors[incident.category] || '#000000';
        const marker = L.marker([parseFloat(incident.lat), parseFloat(incident.lon)], {
          icon: L.divIcon({
            className: 'custom-marker incident-marker', // Add "incident-marker" class
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 0;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        });

        marker.addTo(markerLayer);

        marker.bindPopup(`
          <b>Datetime:</b> ${incident.datetime}<br>
          <b>Category:</b> ${incident.category}<br>
          <b>Incident Type:</b> ${incident.incident_type}
        `);
      });
    }
  }, [incidents]);

  return (
    <div className="h-full w-full bg-white relative">
      {/* Leaflet map container */}
      <div id="map" className="h-full w-full absolute inset-0" />
    </div>
  );
}