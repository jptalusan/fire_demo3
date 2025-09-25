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