import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';

interface StatisticsTabProps {
  simulationResults?: any;
}

export function StatisticsTab({ simulationResults }: StatisticsTabProps) {
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
              {simulationResults?.total_incidents || '1,247'}
            </div>
            <p className="text-xs text-muted-foreground">
              {simulationResults?.total_incidents ? 'From simulation' : 'Last 30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">4.2 min</div>
            <p className="text-xs text-green-600">
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
            <CardTitle>Station Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Stations Meeting Targets</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge variant="secondary">3</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Stations Needing Improvement</span>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <Badge variant="outline">1</Badge>
              </div>
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
    </div>
  );
}