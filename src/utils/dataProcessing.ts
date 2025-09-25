// Data processing utilities for map markers and popups

export interface ProcessedStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  stationNumber: number;
  displayName: string;
}

export interface ProcessedIncident {
  id: string;
  incidentType: string;
  lat: number;
  lon: number;
  datetime: string;
  category: string;
  incidentTypeCategory: 'ems' | 'warning' | 'fire';
}

/**
 * Processes raw incident data from CSV and extracts relevant information
 * @param rawIncidents - Array of raw incident objects from CSV parsing
 * @returns Array of processed incident objects with extracted data
 */
export function processIncidents(rawIncidents: any[]): ProcessedIncident[] {
  return rawIncidents.map(incident => {
    const incidentType = incident.incident_type || incident.type || '';
    const incidentTypeCategory = categorizeIncidentType(incidentType);

    return {
      id: incident.incident_id || incident.id || '',
      incidentType,
      lat: parseFloat(incident.lat),
      lon: parseFloat(incident.lon),
      datetime: incident.datetime || '',
      category: incident.category || '',
      incidentTypeCategory
    };
  }).filter(incident => !isNaN(incident.lat) && !isNaN(incident.lon));
}

/**
 * Categorizes incident type for icon selection
 * @param incidentType - The incident type string
 * @returns The category for icon selection
 */
export function categorizeIncidentType(incidentType: string): 'ems' | 'warning' | 'fire' {
  if (incidentType.toLowerCase().includes('ems & rescue')) {
    return 'ems';
  } else if (incidentType.toLowerCase().includes('good intent call')) {
    return 'warning';
  } else {
    return 'fire';
  }
}

/**
 * Creates popup content for incident markers
 * @param incident - Processed incident object
 * @returns HTML string for the popup
 */
export function createIncidentPopup(incident: ProcessedIncident): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 200px;">
      <b>${incident.incidentType}</b><br>
      <span style="color: #666; font-size: 12px;">${incident.datetime}</span><br>
      <span style="color: #666; font-size: 12px;">Category: ${incident.category}</span>
    </div>
  `;
}

/**
 * Creates the HTML content for incident marker icons
 * @param incident - Processed incident object
 * @returns HTML string for the marker icon
 */
export function createIncidentIcon(incident: ProcessedIncident): string {
  const iconHtml = getIncidentIconHtml(incident.incidentTypeCategory);

  return `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      ${iconHtml}
    </div>
  `;
}

/**
 * Gets the HTML for the incident icon based on category
 * @param category - The incident type category
 * @returns HTML string for the icon
 */
function getIncidentIconHtml(category: 'ems' | 'warning' | 'fire'): string {
  switch (category) {
    case 'ems':
      return '🚑'; // Heart icon for EMS & Rescue
    case 'warning':
      return '⚠️'; // Warning icon for Good Intent Call
    case 'fire':
    default:
      return '🔥'; // Fire icon for everything else
  }
}

/**
 * Gets the background color for incident icons
 * @param category - The incident type category
 * @returns Color string
 */
function getIncidentIconColor(category: 'ems' | 'warning' | 'fire'): string {
  switch (category) {
    case 'ems':
      return '#dc2626'; // Red for EMS
    case 'warning':
      return '#f59e0b'; // Orange for warning
    case 'fire':
    default:
      return '#7c2d12'; // Dark red for fire
  }
}

/**
 * Processes raw station data from CSV and extracts relevant information
 * @param rawStations - Array of raw station objects from CSV parsing
 * @returns Array of processed station objects with extracted data
 */
export function processStations(rawStations: any[]): ProcessedStation[] {
  return rawStations.map(station => {
    // Extract station number from "Facility Name" (e.g., "Station 01" -> 1)
    const facilityName = station['Facility Name'] || station.name || '';
    const stationNumber = extractStationNumber(facilityName);

    return {
      id: station.StationID || station.id || '',
      name: facilityName,
      address: station.Address || '',
      lat: parseFloat(station.lat),
      lon: parseFloat(station.lon),
      stationNumber,
      displayName: `Station ${stationNumber.toString().padStart(2, '0')}`
    };
  }).filter(station => !isNaN(station.lat) && !isNaN(station.lon));
}

/**
 * Extracts the station number from facility name
 * @param facilityName - The facility name string (e.g., "Station 01")
 * @returns The extracted station number
 */
export function extractStationNumber(facilityName: string): number {
  // Match patterns like "Station 01", "Station 1", "01", "1"
  const match = facilityName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Creates popup content for station markers
 * @param station - Processed station object
 * @returns HTML string for the popup
 */
export function createStationPopup(station: ProcessedStation): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 200px;">
      <b>${station.displayName}</b><br>
      <span style="color: #666; font-size: 12px;">${station.address}</span>
    </div>
  `;
}

/**
 * Creates the HTML content for station marker icons
 * @param station - Processed station object
 * @returns HTML string for the marker icon
 */
export function createStationIcon(station: ProcessedStation): string {
  const size = 24; // Slightly bigger than the current 16px
  return `
    <div style="
      background-color: #dc2626;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">
      ${station.stationNumber}
    </div>
  `;
}