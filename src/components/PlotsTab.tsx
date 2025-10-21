import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { processStationReport, StationReport } from '../utils/dataProcessing';
import { MockPlotsContainer, IncidentTypesPieChart, MockBoxPlot } from './MockPlots';

interface PlotsTabProps {
  simulationResults?: any;
}

export function PlotsTab({ simulationResults }: PlotsTabProps) {
  // Build response time chart data from simulation station_report
  const stationReports: StationReport[] = simulationResults?.station_report
    ? processStationReport(simulationResults.station_report)
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
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"> */}
      <div className="col-span-1 lg:col-span-2 w-full">
        {/* Average Travel Times Box Plot - moved to first position */}
        <MockBoxPlot 
          title="Average Travel Times per Station"
          data={mockStationTravelTimes}
        />
        
        {/* Incident Types Pie Chart - moved to second position */}
        {/* <IncidentTypesPieChart /> */}
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