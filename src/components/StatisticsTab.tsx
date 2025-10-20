import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp } from 'lucide-react';
import { processStationReport, StationReport } from '../utils/dataProcessing';

interface StatisticsTabProps {
  simulationResults?: any;
  stations?: Array<{
    id: string;
    displayName?: string;
    name?: string;
  }>;
  incidentsCount?: number;
}

// TODO: Hard coded minutes label performance here.
export function StatisticsTab({ simulationResults, stations = [], incidentsCount = 0 }: StatisticsTabProps) {
  // Process station report data if available
  const stationReports: StationReport[] = simulationResults?.station_report 
    ? processStationReport(simulationResults.station_report)
    : [];

  // Helper function to format time in minutes and seconds
  const formatTravelTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to get performance status based on travel time
  const getPerformanceStatus = (travelTimeSeconds: number): { status: string; color: string } => {
    const minutes = travelTimeSeconds / 60;
    if (minutes <= 4) return { status: 'Excellent', color: 'text-green-600' };
    if (minutes <= 6) return { status: 'Good', color: 'text-yellow-600' };
    return { status: 'Needs Improvement', color: 'text-red-600' };
  };

  // Baseline pre-simulation station summary
  const stationCount = stations.length;

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {simulationResults?.total_incidents ?? incidentsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {simulationResults?.total_incidents ? 'From simulation' : 'From current selection'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {simulationResults?.average_response_time || '4.5'} min
              </div>
            <p className="text-xs text-green-600">
              {/* TODO: Have this be configurable what is acceptable or not, see individual stations */}
              Within target range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Area Coverage</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">87%</div>
            <p className="text-xs text-muted-foreground">
              Within 5-minute response
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Station Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Total Stations</span>
              <Badge variant="secondary">{stationCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Incidents (selected model)</span>
              <Badge variant="outline">{incidentsCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Structure Fires</span>
                <span>16.4%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Medical Emergencies</span>
                <span>46.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Vehicle Accidents</span>
                <span>24.4%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Other Incidents</span>
                <span>12.7%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Report Cards - Show only if we have station report data */}
      {stationReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Station Performance Report</h2>
            <Badge variant="secondary">{stationReports.length} stations</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationReports
              .sort((a, b) => parseFloat(a.stationName) - parseFloat(b.stationName))
              .map((report) => {
                const performance = getPerformanceStatus(report.travelTimeMean);
                return (
                  <Card key={report.stationName} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm">
                        {report.stationName.padStart(2, '0')}
                      </CardTitle>
                      <TrendingUp className={`h-4 w-4 ${performance.color.replace('text-', 'text-')}`} />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Avg Travel Time</span>
                        <span className={`text-sm font-bold ${performance.color}`}>
                          {formatTravelTime(report.travelTimeMean)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Incidents Handled</span>
                        <Badge variant="outline">{report.incidentCount}</Badge>
                      </div>
                      <div className="pt-1">
                        <span className={`text-xs font-medium ${performance.color}`}>
                          {performance.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}