import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { processStationReport, processStationTravelTimes, StationReport, StationTravelTimes } from '../utils/dataProcessing';
import { BoxPlotChart } from './BoxPlotChart';
import { MockPlotsContainer, IncidentTypesPieChart, MockBoxPlot } from './MockPlots';

interface PlotsTabProps {
  simulationResults?: any;
}

export function PlotsTab({ simulationResults }: PlotsTabProps) {
  console.log('PlotsTab simulationResults:', simulationResults);

  // Build response time chart data from simulation station_report
  let stationReports: StationReport[] = [];
  let stationTravelTimes: StationTravelTimes[] = [];
  
  try {
    stationReports = simulationResults?.station_report
      ? processStationReport(simulationResults.station_report)
      : [];
    
    stationTravelTimes = simulationResults?.station_report
      ? processStationTravelTimes(simulationResults.station_report)
      : [];
  } catch (error) {
    console.error('Error processing station data:', error);
    stationReports = [];
    stationTravelTimes = [];
  }

  console.log('Processed station reports:', stationReports);
  console.log('Processed station travel times:', stationTravelTimes);

  // TODO: 5 is hard coded, put it in some config.
  const targetMinutes: number = simulationResults?.target_response_minutes ?? 5;

  const responseTimeData = stationReports
    .slice()
    .sort((a, b) => {
      // Extract station numbers for sorting
      const aNum = parseFloat(a.stationName.replace(/\D/g, '')) || 0;
      const bNum = parseFloat(b.stationName.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    })
    .map((r) => {
      // Extract just the number from "Station XX" format
      const match = r.stationName.match(/\d+/);
      const stationNum = match ? match[0] : r.stationName;
      return {
        station: stationNum,
        avgTime: Number((r.travelTimeMean / 60).toFixed(2)), // seconds -> minutes
        target: targetMinutes,
        incidents: r.incidentCount,
      };
    });

  const incidentTypeData = [
    { type: 'Medical Emergency', count: 580, color: '#4ECDC4' },
    { type: 'Structure Fire', count: 204, color: '#FF6B6B' },
    { type: 'Vehicle Accident', count: 304, color: '#4DABF7' },
    { type: 'Hazmat', count: 50, color: '#69DB7C' },
    { type: 'Other', count: 109, color: '#FFD43B' }
  ];

  const coverageData = [
    { area: 'Downtown', covered: 85, uncovered: 15 },
    { area: 'Midtown', covered: 78, uncovered: 22 },
    { area: 'Uptown', covered: 92, uncovered: 8 },
    { area: 'Brooklyn', covered: 71, uncovered: 29 }
  ];

  // Generate mock data for the box plot with proper quartile relationships
  const mockStationTravelTimes = ['Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5', 'Station 6'].map(station => {
    const min = Math.round((Math.random() * 2 + 1) * 100) / 100; // 1-3 minutes
    const q1 = min + Math.round((Math.random() * 3 + 2) * 100) / 100; // Q1 > min
    const median = q1 + Math.round((Math.random() * 2 + 1) * 100) / 100; // median > Q1
    const q3 = median + Math.round((Math.random() * 2 + 1) * 100) / 100; // Q3 > median
    const max = q3 + Math.round((Math.random() * 3 + 2) * 100) / 100; // max > Q3
    const avgTime = (min + q1 + median + q3 + max) / 5; // Calculate mean
    
    return {
      station,
      avgTime: Math.round(avgTime * 100) / 100,
      q1,
      q3,
      min,
      max,
      median
    };
  });

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      {/* Travel Times Box Plot - Full Width */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Travel Times Distribution by Station</CardTitle>
          <CardDescription>
            Box plot showing travel time distribution (minutes) for each station from simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stationTravelTimes.length > 0 ? (
            <BoxPlotChart 
              data={stationTravelTimes.map(station => ({
                stationName: station.stationName,
                min: station.min,
                q1: station.q1,
                median: station.median,
                q3: station.q3,
                max: station.max,
                mean: station.mean
              }))}
              height={400}
              yAxisLabel="Travel Time (minutes)"
            />
          ) : (
            <div className="text-sm text-muted-foreground p-4 text-center">
              Run a simulation to see travel time distribution plots.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time Chart (from actual simulation results) */}
        <Card>
          <CardHeader>
            <CardTitle>Average Response Times by Station</CardTitle>
            <CardDescription>
              Response time (minutes) per station from simulation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responseTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="station" interval={0} angle={0} textAnchor="middle" height={60} tickMargin={8} />
                  <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: any, name: any) => [value, name === 'avgTime' ? 'Avg Time (min)' : name === 'target' ? 'Target (min)' : name]} />
                  <Bar dataKey="avgTime" fill="#8884d8" name="Avg Time (min)" />
                  <ReferenceLine y={targetMinutes} stroke="#82ca9d" strokeDasharray="4 4" label={`Target ${targetMinutes}m`} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Run a simulation to see response time data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidents per Station */}
        <Card>
          <CardHeader>
            <CardTitle>Incidents Handled by Station</CardTitle>
            <CardDescription>
              Number of incidents handled by each station
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responseTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="station" interval={0} angle={0} textAnchor="middle" height={60} tickMargin={8} />
                  <YAxis label={{ value: 'Incidents', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: any, name: any) => [value, name === 'incidents' ? 'Incidents' : name]} />
                  <Bar dataKey="incidents" fill="#4ECDC4" name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Run a simulation to see incident distribution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Enhanced Mock Analytics */}
      <div className="mt-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Advanced Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Detailed performance metrics and station-specific analysis
          </p>
        </div>
        <MockPlotsContainer />
      </div>
    </div>
  );
}