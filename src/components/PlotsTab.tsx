import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronRight, Maximize2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { processStationReport, processStationTravelTimes, StationReport, StationTravelTimes } from '../utils/dataProcessing';
import { BoxPlotChart } from './BoxPlotChart';
import { MockPlotsContainer, IncidentTypesPieChart, MockBoxPlot } from './MockPlots';

interface PlotsTabProps {
  simulationResults?: any;
  historicalIncidentStats?: any;
  incidents?: any[];
}

export function PlotsTab({ simulationResults, historicalIncidentStats, incidents = [] }: PlotsTabProps) {
  console.log('PlotsTab simulationResults:', simulationResults);
  
  const [advancedAnalyticsOpen, setAdvancedAnalyticsOpen] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState<{
    title: string;
    content: React.ReactNode;
  } | null>(null);

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
  const mockStationTravelTimes = ['station_01', 'station_02', 'station_03', 'station_04', 'station_05', 'station_06'].map(station => {
    const min = Math.round((Math.random() * 2 + 1) * 100) / 100; // 1-3 minutes
    const q1 = min + Math.round((Math.random() * 3 + 2) * 100) / 100; // Q1 > min
    const median = q1 + Math.round((Math.random() * 2 + 1) * 100) / 100; // median > Q1
    const q3 = median + Math.round((Math.random() * 2 + 1) * 100) / 100; // Q3 > median
    const max = q3 + Math.round((Math.random() * 3 + 2) * 100) / 100; // max > Q3
    const mean = (min + q1 + median + q3 + max) / 5; // Calculate mean
    
    return {
      stationName: station,
      min,
      q1,
      median,
      q3,
      max,
      mean: Math.round(mean * 100) / 100
    };
  });

  return (
    <div className="h-full overflow-auto space-y-4 p-4">
      {/* Travel Times Box Plot - Full Width */}
      {/* Travel Times Box Plot - Compact Layout */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Travel Time Distribution by Station</CardTitle>
              <CardDescription className="text-sm mt-1">
                Distribution of travel times for different scenarios
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFullscreenChart({
                title: "Travel Time Distribution by Station",
                content: simulationResults && stationTravelTimes.length > 0 ? (
                  <BoxPlotChart data={stationTravelTimes} yAxisLabel="Travel Time (minutes)" />
                ) : (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Run a simulation to see travel time distribution.
                  </div>
                )
              })}
              className="hover:bg-gray-100"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-2">
          {simulationResults && stationTravelTimes.length > 0 ? (
            <div className="w-full" style={{ height: '240px' }}>
              <BoxPlotChart data={stationTravelTimes} yAxisLabel="Travel Time (minutes)" height={240} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Run a simulation to see travel time distribution.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Time and Incidents Charts - Full Width Layout */}
      <div className="space-y-4">
        {/* Response Time Chart (from actual simulation results) */}
        {/* Average Response Times by Station */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Average Response Times by Station</CardTitle>
                <CardDescription>
                  Response time (minutes) per station from simulation
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFullscreenChart({
                  title: "Average Response Times by Station",
                  content: simulationResults && simulationResults.station_report && responseTimeData.length > 0 ? (
                    <div style={{ width: '100%', height: '700px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={responseTimeData} margin={{ top: 20, right: 30, left: 40, bottom: 120 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="station" 
                            interval={0} 
                            angle={-45} 
                            textAnchor="end" 
                            height={120} 
                            tickMargin={20}
                            fontSize={14}
                            label={{ value: 'Stations', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: '16px' } }}
                          />
                          <YAxis 
                            label={{ value: 'Response Time (minutes)', angle: -90, position: 'insideLeft' }}
                            fontSize={14}
                          />
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} min`, name === 'avgTime' ? 'Response Time' : name]}
                            labelStyle={{ fontSize: '14px' }}
                            contentStyle={{ fontSize: '14px' }}
                          />
                          <Bar dataKey="avgTime" fill="#8884d8" name="Response Time (min)" />
                          <ReferenceLine y={targetMinutes} stroke="red" strokeDasharray="5 5" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Run a simulation to see response times.
                    </div>
                  )
                })}
                className="hover:bg-gray-100"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {simulationResults && simulationResults.station_report && responseTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={responseTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="station" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tickMargin={15}
                    fontSize={11}
                    label={{ value: 'Stations', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                  />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Incidents Handled by Station</CardTitle>
                <CardDescription>
                  Number of incidents handled by each station
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFullscreenChart({
                  title: "Incidents Handled by Station",
                  content: simulationResults && simulationResults.station_report && responseTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={600}>
                      <BarChart data={responseTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="station" 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          tickMargin={15}
                          fontSize={11}
                          label={{ value: 'Stations', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                        />
                        <YAxis label={{ value: 'Incidents', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: any, name: any) => [value, name === 'incidents' ? 'Incidents' : name]} />
                        <Bar dataKey="incidents" fill="#4ECDC4" name="Incidents" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Run a simulation to see incident distribution.
                    </div>
                  )
                })}
                className="hover:bg-gray-100"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {simulationResults && simulationResults.station_report && responseTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={responseTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="station" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tickMargin={15}
                    fontSize={11}
                    label={{ value: 'Stations', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                  />
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

        {/* Average Service Time per Station */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Average Service Time by Station</CardTitle>
                <CardDescription>
                  Average time spent at incident scenes by each station (in minutes)
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFullscreenChart({
                  title: "Average Service Time by Station",
                  content: simulationResults && simulationResults.station_report && stationReports.length > 0 ? (
                    <ResponsiveContainer width="100%" height={600}>
                      <BarChart 
                        data={stationReports
                          .slice()
                          .sort((a, b) => {
                            const aNum = parseFloat(a.stationName.replace(/\D/g, '')) || 0;
                            const bNum = parseFloat(b.stationName.replace(/\D/g, '')) || 0;
                            return aNum - bNum;
                          })
                          .map((report) => {
                            const match = report.stationName.match(/\d+/);
                            const stationNum = match ? match[0] : report.stationName;
                            const stationData = simulationResults.station_report.find((item: any) => 
                              Object.keys(item)[0] === `Station ${stationNum.padStart(2, '0')}`
                            );
                            const serviceTime = stationData ? 
                              (Object.values(stationData)[0] as any)['average service time'] / 60 : 0;
                            return {
                              station: stationNum,
                              serviceTime: Number(serviceTime.toFixed(2))
                            };
                          })
                        } 
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="station" 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          tickMargin={15}
                          fontSize={11}
                          label={{ value: 'Stations', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                        />
                        <YAxis label={{ value: 'Service Time (minutes)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: any, name: any) => [`${value} min`, 'Service Time']} />
                        <Bar dataKey="serviceTime" fill="#9B59B6" name="Service Time (min)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Run a simulation to see service time data.
                    </div>
                  )
                })}
                className="hover:bg-gray-100"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {simulationResults && simulationResults.station_report && stationReports.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart 
                  data={stationReports
                    .slice()
                    .sort((a, b) => {
                      // Extract station numbers for sorting
                      const aNum = parseFloat(a.stationName.replace(/\D/g, '')) || 0;
                      const bNum = parseFloat(b.stationName.replace(/\D/g, '')) || 0;
                      return aNum - bNum;
                    })
                    .map((report) => {
                      // Extract just the number from "Station XX" format
                      const match = report.stationName.match(/\d+/);
                      const stationNum = match ? match[0] : report.stationName;
                      
                      // Get service time from simulation results
                      const stationData = simulationResults.station_report.find((item: any) => 
                        Object.keys(item)[0] === `Station ${stationNum.padStart(2, '0')}`
                      );
                      const serviceTime = stationData ? 
                        (Object.values(stationData)[0] as any)['average service time'] / 60 : 0; // Convert seconds to minutes
                      
                      return {
                        station: stationNum,
                        serviceTime: Number(serviceTime.toFixed(2))
                      };
                    })
                  } 
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="station" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tickMargin={15}
                    fontSize={11}
                    label={{ value: 'Stations', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                  />
                  <YAxis label={{ value: 'Service Time (minutes)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: any, name: any) => [`${value} min`, 'Service Time']} />
                  <Bar dataKey="serviceTime" fill="#9B59B6" name="Service Time (min)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Run a simulation to see service time data.
              </div>
            )}
          </CardContent>
        </Card>

      </div>



      {/* Enhanced Analytics with Real Data */}
      <div className="mt-8">
        <Collapsible open={advancedAnalyticsOpen} onOpenChange={setAdvancedAnalyticsOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                    <CardDescription className="mt-2">
                      {incidents.length > 0 || (simulationResults && simulationResults.station_report)
                        ? "Performance metrics using real data from loaded incidents and simulation results"
                        : "Detailed performance metrics and station-specific analysis with sample data"
                      }
                    </CardDescription>

                  </div>
                  <Button variant="ghost" size="sm">
                    {advancedAnalyticsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-4">
              <MockPlotsContainer 
                historicalIncidentStats={historicalIncidentStats} 
                simulationResults={simulationResults}
                stationReports={stationReports}
                incidents={incidents}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Fullscreen Modal - Rendered as Portal */}
      {fullscreenChart && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-8" 
          style={{ 
            zIndex: 10000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl flex flex-col"
            style={{
              width: '90vw',
              height: '85vh',
              maxWidth: '1600px',
              maxHeight: '1000px'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{fullscreenChart.title}</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFullscreenChart(null)}
                className="hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
              <div className="p-6">
                {fullscreenChart.content}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}