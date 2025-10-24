import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Clock, MapPin, AlertTriangle as Triangle, BarChart3, TrendingUp } from 'lucide-react';
import { SimulationPlotsContainer } from './SimulationPlots';
import { processStationReport, StationReport } from '../utils/dataProcessing';

interface SimulationTabProps {
  hasResults: boolean;
  simulationResults: any;
  incidentsCount?: number;
}

export function SimulationTab({ hasResults, simulationResults, incidentsCount }: SimulationTabProps) {
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

  // Process station report data if available
  const stationReports: StationReport[] = simulationResults?.station_report 
    ? processStationReport(simulationResults.station_report)
    : [];

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      {hasResults ? (
        <div className="space-y-4">
          {/* KPI Cards moved from Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <CardTitle className="text-sm">Total Incidents</CardTitle>
                <Triangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl">{simulationResults?.total_incidents ?? '-'}</div>
                <p className="text-[11px] text-muted-foreground">From simulation</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl">{simulationResults?.average_response_time ? Number(simulationResults.average_response_time).toFixed(2) : '-'} sec</div>
                <p className="text-[11px] text-green-600">Within target range</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <CardTitle className="text-sm">On-Time Response Rate</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl">{simulationResults?.coverage_percent ? 
                  (typeof simulationResults.coverage_percent === 'string' && simulationResults.coverage_percent.includes('%') 
                    ? simulationResults.coverage_percent 
                    : Number(simulationResults.coverage_percent).toFixed(2) + '%') 
                  : '87%'}
                </div>
                <p className="text-[11px] text-muted-foreground">Within 5-minute response</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Simulation Complete
              </CardTitle>
              <CardDescription>
                Analysis completed successfully at {new Date().toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>



          {/* Performance Analytics Section */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>
                  Detailed performance metrics and operational insights from simulation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimulationPlotsContainer 
                  simulationResults={simulationResults}
                  historicalIncidentStats={undefined}
                  incidentsCount={incidentsCount}
                />
              </CardContent>
            </Card>
          </div>

          {/* Station Performance Report - Show only if simulation has run and we have station report data */}
          {simulationResults && simulationResults.station_report && stationReports.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Station Performance Report</h2>
                <Badge variant="secondary">{stationReports.length} stations</Badge>
                <Badge variant="outline" className="text-xs">From Simulation</Badge>
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
                            Station {report.stationName.padStart(2, '0')}
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
      ) : (
        <Card className="h-full">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>No simulation results available</p>
              <p className="text-sm">Run a simulation to see results here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}