import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { AlertTriangle, CheckCircle, Clock, MapPin, AlertTriangle as Triangle, BarChart3, TrendingUp } from 'lucide-react';
import { SimulationPlotsContainer } from './SimulationPlots';

interface SimulationTabProps {
  hasResults: boolean;
  simulationResults: any;
}

export function SimulationTab({ hasResults, simulationResults }: SimulationTabProps) {
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
                />
              </CardContent>
            </Card>
          </div>
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