import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
  stationApparatusCounts?: Map<string, Record<string, number>>;
  historicalIncidentStats?: any;
  historicalIncidentError?: string | null;
}

// TODO: Hard coded minutes label performance here.
export function StatisticsTab({ simulationResults, stations = [], incidentsCount = 0, stationApparatusCounts, historicalIncidentStats, historicalIncidentError }: StatisticsTabProps) {
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

  // Calculate average apparatus per station
  const averageApparatusPerStation = useMemo(() => {
    if (!stationApparatusCounts || stationApparatusCounts.size === 0) return 0;
    
    let totalApparatus = 0;
    stationApparatusCounts.forEach(counts => {
      const stationTotal = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
      totalApparatus += stationTotal;
    });
    
    return stationApparatusCounts.size > 0 ? (totalApparatus / stationApparatusCounts.size).toFixed(1) : '0';
  }, [stationApparatusCounts]);

  // Apparatus keys and display names (aligns with MapSection CSV columns)
  const apparatusColumns: { key: string; label: string }[] = [
    { key: 'Engine_ID', label: 'Engine' },
    { key: 'Truck', label: 'Truck' },
    { key: 'Rescue', label: 'Rescue' },
    { key: 'Medic', label: 'Medic' },
    { key: 'Chief', label: 'Chief' },
    { key: 'Hazard', label: 'Hazard' },
    { key: 'Squad', label: 'Squad' },
    { key: 'FAST', label: 'FAST' },
    { key: 'Brush', label: 'Brush' },
    { key: 'Boat', label: 'Boat' },
    { key: 'UTV', label: 'UTV' },
    { key: 'REACH', label: 'REACH' },
  ];

  // Compute totals and per-station rows
  const { totalsByType, stationRows } = React.useMemo(() => {
    const totals: Record<string, number> = {};
    const rows: Array<{ stationId: string; stationName: string; counts: Record<string, number> }> = [];
    if (!stationApparatusCounts) {
      return { totalsByType: totals, stationRows: rows };
    }
    // Initialize totals
    apparatusColumns.forEach(col => (totals[col.key] = 0));

    // Build rows
    stationApparatusCounts.forEach((counts, stationId) => {
      const station = stations.find(s => s.id === stationId);
      const stationName = station?.displayName || station?.name || stationId;
      const rowCounts: Record<string, number> = {};
      apparatusColumns.forEach(col => {
        const val = Number(counts[col.key] || 0);
        rowCounts[col.key] = val;
        totals[col.key] += val;
      });
      rows.push({ stationId, stationName, counts: rowCounts });
    });

    // Sort rows by station number if present in name
    rows.sort((a, b) => {
      const an = parseInt(a.stationName.match(/\d+/)?.[0] || '0', 10);
      const bn = parseInt(b.stationName.match(/\d+/)?.[0] || '0', 10);
      return an - bn;
    });

    return { totalsByType: totals, stationRows: rows };
  }, [stationApparatusCounts, stations]);

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      {/* Top-level simulation KPIs moved to Simulation Results tab */}
      {/* Compact apparatus totals grid (aim ~6+ per row) */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {apparatusColumns.map(col => (
          <Card key={col.key} className="min-w-0">
            <CardHeader className="py-1 px-2">
              <CardTitle className="text-[10px] font-medium">{col.label}</CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-2">
              <div className="text-[13px] leading-none font-semibold">{totalsByType?.[col.key] ?? 0}</div>
              <p className="text-[9px] leading-none mt-1 text-muted-foreground">Across all</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stations Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Total Stations</span>
              <Badge variant="secondary">{stationCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Average Apparatus per Station</span>
              <Badge variant="outline">{averageApparatusPerStation}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Total Incidents</span>
              <Badge variant="secondary">
                {historicalIncidentStats?.total_incidents || incidentsCount}
              </Badge>
            </div>
            
            {/* Error Message */}
            {historicalIncidentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{historicalIncidentError}</p>
              </div>
            )}
            
            {/* Historical Incident Statistics */}
            {historicalIncidentStats && !historicalIncidentError && (
              <div className="space-y-3">
                {/* Average time between incidents - with safe access */}
                {historicalIncidentStats.average_time_between_incidents_minutes !== undefined && 
                 historicalIncidentStats.average_time_between_incidents_minutes !== null && 
                 typeof historicalIncidentStats.average_time_between_incidents_minutes === 'number' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Time Between Incidents</span>
                    <Badge variant="outline">
                      {historicalIncidentStats.average_time_between_incidents_minutes.toFixed(2)} min
                    </Badge>
                  </div>
                )}
                
                {/* Incident Type Breakdown */}
                {historicalIncidentStats.incident_counts && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Incident Types:</span>
                    {Object.entries(historicalIncidentStats.incident_counts).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span>{type}</span>
                        <span>{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

      {/* Apparatus by Station Table */}
      <Card>
        <CardHeader>
          <CardTitle>Apparatus by Station</CardTitle>
        </CardHeader>
        <CardContent>
          {stationRows && stationRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  {apparatusColumns.map(col => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationRows.map(row => (
                  <TableRow key={row.stationId}>
                    <TableCell className="font-medium">{row.stationName}</TableCell>
                    {apparatusColumns.map(col => (
                      <TableCell key={col.key} className="text-center">{row.counts[col.key] || 0}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  {apparatusColumns.map(col => (
                    <TableCell key={col.key} className="font-bold text-center">{totalsByType?.[col.key] || 0}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No apparatus data available yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}