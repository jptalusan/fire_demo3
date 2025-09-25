import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function PlotsTab() {
  const responseTimeData = [
    { station: 'Station 1', avgTime: 4.2, target: 5 },
    { station: 'Station 2', avgTime: 6.1, target: 5 },
    { station: 'Station 3', avgTime: 3.8, target: 5 },
    { station: 'Station 4', avgTime: 5.3, target: 5 }
  ];

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
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Response Times</CardTitle>
            <CardDescription>
              Response times by fire station vs target time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="station" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgTime" fill="#8884d8" name="Avg Response Time" />
                <Bar dataKey="target" fill="#82ca9d" name="Target Time" />
              </BarChart>
            </ResponsiveContainer>
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