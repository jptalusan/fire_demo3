import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { processStationReport, processStationTravelTimes, StationReport, StationTravelTimes } from '../utils/dataProcessing';
import { BoxPlotChart } from './BoxPlotChart';

interface PlotsTabProps {
  simulationResults?: any;
}

export function PlotsTab({ simulationResults }: PlotsTabProps) {
  // Build response time chart data from simulation station_report
  const stationReports: StationReport[] = simulationResults?.station_report
    ? processStationReport(simulationResults.station_report)
    : [];

  // Process travel times for box plot visualization
  const stationTravelTimes: StationTravelTimes[] = simulationResults?.station_report
    ? processStationTravelTimes(simulationResults.station_report)
    : [];

  // TODO: 5 is hard coded, put it in some config.
  const targetMinutes: number = simulationResults?.target_response_minutes ?? 5;

  const responseTimeData = stationReports
    .slice()
    .sort((a, b) => parseFloat(a.stationName) - parseFloat(b.stationName))
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

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Travel Times Box Plot */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Travel Times Distribution by Station</CardTitle>
            <CardDescription>
              Box plot showing travel time distribution (minutes) for each station from last simulation
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
              <div className="text-sm text-muted-foreground">Run a simulation to see travel time distribution plots.</div>
            )}
          </CardContent>
        </Card>

        {/* Response Time Chart (from simulation results) */}
        <Card>
          <CardHeader>
            <CardTitle>Average Response Times</CardTitle>
            <CardDescription>
              Response time (minutes) per station from last simulation
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
                  <Bar dataKey="avgTime" fill="#8884d8" name="Avg Time (min)">
                  </Bar>
                  <ReferenceLine y={targetMinutes} stroke="#82ca9d" strokeDasharray="4 4" label={`Target ${targetMinutes}m`} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Run a simulation to see response time plots.</div>
            )}
          </CardContent>
        </Card>

        {/* Incident Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Types Distribution</CardTitle>
            <CardDescription>
              Breakdown of incident types handled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incidentTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                >
                  {incidentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coverage Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coverage Analysis by Area</CardTitle>
            <CardDescription>
              Percentage of area covered within target response time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coverageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" />
                <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="covered" stackId="a" fill="#82ca9d" name="Covered" />
                <Bar dataKey="uncovered" stackId="a" fill="#ff7979" name="Uncovered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}