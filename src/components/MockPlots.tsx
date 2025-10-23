import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronRight, BarChart3, TrendingUp, Clock, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as d3 from 'd3';

// Mock data generators
const generateMockData = () => {
  const stations = ['Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5', 'Station 6'];
  const fireCategories = ['Structure Fire', 'Vehicle Fire', 'Wildfire', 'Medical Emergency', 'Rescue Operation'];
  
  return {
    stationTravelTimes: stations.map(station => {
      const min = Math.round((Math.random() * 2 + 1) * 100) / 100; // 1-3 minutes
      const q1 = min + Math.round((Math.random() * 3 + 2) * 100) / 100; // Q1 > min
      const median = q1 + Math.round((Math.random() * 2 + 1) * 100) / 100; // median > Q1
      const q3 = median + Math.round((Math.random() * 2 + 1) * 100) / 100; // Q3 > median
      const max = q3 + Math.round((Math.random() * 3 + 2) * 100) / 100; // max > Q3
      
      return {
        station,
        avgTime: median, // Use median as the main metric
        q1,
        q3,
        min,
        max,
        median
      };
    }),
    stationIncidentCounts: stations.map(station => ({
      station,
      totalIncidents: Math.floor(Math.random() * 150 + 50), // 50-200 incidents
    })),
    categoryResponseTimes: fireCategories.map(category => ({
      category,
      avgResponseTime: Math.round((Math.random() * 8 + 4) * 100) / 100, // 4-12 minutes
    })),
    vehicleDistances: [
      { vehicleType: 'Fire Engine', avgDistance: Math.round((Math.random() * 5 + 3) * 100) / 100 }, // 3-8 km
      { vehicleType: 'Medic Unit', avgDistance: Math.round((Math.random() * 3 + 2) * 100) / 100 }, // 2-5 km
      { vehicleType: 'Ladder Truck', avgDistance: Math.round((Math.random() * 6 + 4) * 100) / 100 }, // 4-10 km
      { vehicleType: 'Rescue Unit', avgDistance: Math.round((Math.random() * 4 + 3) * 100) / 100 }, // 3-7 km
    ],
    stationTimeSeriesData: stations.slice(0, 3).map(station => ({
      station,
      incidents: Array.from({ length: 20 }, (_, i) => ({
        time: `${String(Math.floor(i / 2) + 8).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`, // 8:00 to 17:30
        travelTime: Math.round((Math.random() * 12 + 3) * 100) / 100, // 3-15 minutes
        incidentType: fireCategories[Math.floor(Math.random() * fireCategories.length)],
      }))
    }))
  };
};

// D3.js Box Plot Component
export const MockBoxPlot: React.FC<{ title: string; data: any[] }> = ({ title, data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render
    
    // Use the actual size of the container
    const { width: containerWidth, height: containerHeight } = svgRef.current.getBoundingClientRect();

    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    const g = svg
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // const g = svg.append("g")
    //   .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.station))
      .padding(0.4);
    
    const yScale = d3.scaleLinear()
      .domain([0, (d3.max(data, (d: any) => d.max) || 0) * 1.1])
      .range([height, 0]);
    
    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "12px");
    
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px");
    
    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Travel Time (minutes)");
    
    // Create box plots for each station
    data.forEach(d => {
      const x = xScale(d.station)!;
      const boxWidth = xScale.bandwidth();
      const centerX = x + boxWidth / 2;
      
      // Vertical lines (whiskers)
      g.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", yScale(d.min))
        .attr("y2", yScale(d.q1))
        .attr("stroke", "#666")
        .attr("stroke-width", 1);
        
      g.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", yScale(d.q3))
        .attr("y2", yScale(d.max))
        .attr("stroke", "#666")
        .attr("stroke-width", 1);
      
      // Whisker caps
      g.append("line")
        .attr("x1", centerX - boxWidth * 0.2)
        .attr("x2", centerX + boxWidth * 0.2)
        .attr("y1", yScale(d.min))
        .attr("y2", yScale(d.min))
        .attr("stroke", "#666")
        .attr("stroke-width", 2);
        
      g.append("line")
        .attr("x1", centerX - boxWidth * 0.2)
        .attr("x2", centerX + boxWidth * 0.2)
        .attr("y1", yScale(d.max))
        .attr("y2", yScale(d.max))
        .attr("stroke", "#666")
        .attr("stroke-width", 2);
      
      // Box (IQR)
      g.append("rect")
        .attr("x", x + boxWidth * 0.1)
        .attr("y", yScale(d.q3))
        .attr("width", boxWidth * 0.8)
        .attr("height", yScale(d.q1) - yScale(d.q3))
        .attr("fill", "#3b82f6")
        .attr("fill-opacity", 0.7)
        .attr("stroke", "#1d4ed8")
        .attr("stroke-width", 1);
      
      // Median line
      g.append("line")
        .attr("x1", x + boxWidth * 0.1)
        .attr("x2", x + boxWidth * 0.9)
        .attr("y1", yScale(d.median || d.avgTime))
        .attr("y2", yScale(d.median || d.avgTime))
        .attr("stroke", "#dc2626")
        .attr("stroke-width", 2);
      
      // Mean point (slightly offset for visibility)
      g.append("circle")
        .attr("cx", centerX + 2)
        .attr("cy", yScale(d.avgTime))
        .attr("r", 3)
        .attr("fill", "#16a34a")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);
    });
    
  }, [data]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} width="500" height="300" style={{ maxWidth: '100%', height: 'auto' }}></svg>
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <div>• Blue box: Interquartile range (Q1-Q3)</div>
          <div>• Red line: Median, Green dot: Mean</div>
          <div>• Whiskers: Min-Max range</div>
        </div>
      </CardContent>
    </Card>
  );
};

// Bar Chart Component
export const MockBarChart: React.FC<{ 
  title: string; 
  data: any[]; 
  valueKey: string; 
  labelKey: string; 
  unit?: string;
  isRealData?: boolean;
}> = ({ 
  title, data, valueKey, labelKey, unit = '', isRealData = false 
}) => {
  const maxValue = Math.max(...data.map(item => item[valueKey]));
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
          {isRealData ? (
            <Badge variant="secondary" className="text-xs">Real Data</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Sample Data</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm font-medium text-right">{item[labelKey]}</div>
              <div className="flex-1 relative">
                <div className="h-6 bg-gray-100 rounded relative overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded transition-all duration-500"
                    style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-right">
                {item[valueKey]}{unit}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Line Chart for Station Details
export const StationLineChart: React.FC<{ stationData: any }> = ({ stationData }) => {
  // Convert time to numeric for proper sorting and plotting
  const chartData = stationData.incidents
    .map((incident: any, index: number) => ({
      ...incident,
      timeIndex: index,
      timeLabel: incident.time
    }))
    .sort((a: any, b: any) => a.timeIndex - b.timeIndex);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timeLabel" 
            interval={1}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            label={{ value: 'Travel Time (min)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: any, name: any) => [`${value} min`, 'Travel Time']}
            labelFormatter={(label: any) => `Time: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="travelTime" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {chartData.slice(0, 8).map((incident: any, index: number) => (
          <Badge key={index} variant="outline" className="text-xs justify-center">
            {incident.incidentType.split(' ')[0]}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// Incident Types Pie Chart Component
interface IncidentTypesPieChartProps {
  historicalIncidentStats?: any;
  incidents?: any[];
}

export const IncidentTypesPieChart: React.FC<IncidentTypesPieChartProps> = ({ historicalIncidentStats, incidents = [] }) => {
  // Create colors mapping for consistent colors based on incident type categories
  const getIncidentTypeColor = (incidentType: string): string => {
    const type = incidentType.toLowerCase();
    
    // Fire-related incidents - Red shades
    if (type.includes('fire') || type.includes('smoke') || type.includes('burning')) {
      return '#FF6B6B';
    }
    
    // Medical/EMS incidents - Teal/Blue shades  
    if (type.includes('medical') || type.includes('ems') || type.includes('cardiac') || 
        type.includes('injury') || type.includes('sick') || type.includes('overdose')) {
      return '#4ECDC4';
    }
    
    // Vehicle/Accident incidents - Blue shades
    if (type.includes('vehicle') || type.includes('accident') || type.includes('crash') || 
        type.includes('motor') || type.includes('traffic')) {
      return '#4DABF7';
    }
    
    // Hazmat/Dangerous incidents - Green shades
    if (type.includes('hazmat') || type.includes('chemical') || type.includes('gas') || 
        type.includes('spill') || type.includes('leak')) {
      return '#69DB7C';
    }
    
    // Rescue operations - Purple shades
    if (type.includes('rescue') || type.includes('trapped') || type.includes('confined') ||
        type.includes('water rescue') || type.includes('technical')) {
      return '#9B59B6';
    }
    
    // Alarm/False alarm - Orange shades
    if (type.includes('alarm') || type.includes('false') || type.includes('good intent')) {
      return '#F39C12';
    }
    
    // Default - Yellow shade
    return '#FFD43B';
  };

  // Use real data if available, otherwise fall back to mock data
  let incidentTypeData;
  if (incidents && incidents.length > 0) {
    // Process raw incidents array to get incident type distribution
    const incidentTypeCounts: { [key: string]: number } = {};
    
    incidents.forEach(incident => {
      const incidentType = incident.incident_type || incident.incidentType || 'Unknown';
      incidentTypeCounts[incidentType] = (incidentTypeCounts[incidentType] || 0) + 1;
    });

    const totalIncidents = incidents.length;
    const individualTypes = Object.entries(incidentTypeCounts)
      .map(([type, count]) => {
        return {
          type,
          count: count as number,
          percentage: (count / totalIncidents) * 100,
          color: getIncidentTypeColor(type)
        };
      })
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Group items with less than 1% into "Other"
    const significantTypes = individualTypes.filter(item => item.percentage >= 1);
    const insignificantTypes = individualTypes.filter(item => item.percentage < 1);
    
    incidentTypeData = [...significantTypes];
    
    // Add "Other" category if there are insignificant types
    if (insignificantTypes.length > 0) {
      const otherCount = insignificantTypes.reduce((sum, item) => sum + item.count, 0);
      incidentTypeData.push({
        type: 'Other',
        count: otherCount,
        percentage: (otherCount / totalIncidents) * 100,
        color: '#FFD43B' // Yellow for "Other"
      });
    }
  } else if (historicalIncidentStats && historicalIncidentStats.incident_counts) {
    // Fallback to historicalIncidentStats if available
    const totalFromStats = Object.values(historicalIncidentStats.incident_counts).reduce((sum: number, count: any) => sum + (count as number), 0);
    const individualTypes = Object.entries(historicalIncidentStats.incident_counts)
      .map(([type, count]) => {
        return {
          type,
          count: count as number,
          percentage: ((count as number) / totalFromStats) * 100,
          color: getIncidentTypeColor(type)
        };
      })
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Group items with less than 1% into "Other"
    const significantTypes = individualTypes.filter(item => item.percentage >= 1);
    const insignificantTypes = individualTypes.filter(item => item.percentage < 1);
    
    incidentTypeData = [...significantTypes];
    
    // Add "Other" category if there are insignificant types
    if (insignificantTypes.length > 0) {
      const otherCount = insignificantTypes.reduce((sum, item) => sum + item.count, 0);
      incidentTypeData.push({
        type: 'Other',
        count: otherCount,
        percentage: (otherCount / totalFromStats) * 100,
        color: '#FFD43B' // Yellow for "Other"
      });
    }
  } else {
    // Final fallback to mock data
    incidentTypeData = [
      { type: 'Medical Emergency', count: 580, color: '#4ECDC4' },
      { type: 'Structure Fire', count: 204, color: '#FF6B6B' },
      { type: 'Vehicle Accident', count: 304, color: '#4DABF7' },
      { type: 'Hazmat', count: 50, color: '#69DB7C' },
      { type: 'Other', count: 109, color: '#FFD43B' }
    ];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Incident Types Distribution
          {incidents && incidents.length > 0 ? (
            <Badge variant="secondary" className="text-xs">Real Data</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Sample Data</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {incidents && incidents.length > 0
            ? `Breakdown of ${incidents.length} loaded incidents by type` 
            : "Breakdown of incident types handled (sample data)"
          }
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
              label={({ type, percent }) => {
                const percentage = (percent * 100).toFixed(1);
                // Only show label for slices >= 3% to avoid overcrowding
                return parseFloat(percentage) >= 3 ? `${type} ${percentage}%` : '';
              }}
            >
              {incidentTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any, name: any, props: any) => [
                `${value} incidents (${((value / incidentTypeData.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
              labelFormatter={(label: any) => `${label}`}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Show summary of data grouping */}
        <div className="mt-4 text-xs text-gray-500">
          {incidents && incidents.length > 0 && (
            <div>
              Total incidents: {incidents.length} • 
              Showing {incidentTypeData.length} categories • 
              Items &lt; 1% grouped as "Other"
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Mock Plots Container
interface MockPlotsContainerProps {
  historicalIncidentStats?: any;
  simulationResults?: any;
  stationReports?: any[];
  incidents?: any[];
}

export const MockPlotsContainer: React.FC<MockPlotsContainerProps> = ({ 
  historicalIncidentStats, 
  simulationResults, 
  stationReports = [],
  incidents = []
}) => {
  const [mockData] = useState(generateMockData());
  const [openStations, setOpenStations] = useState<{ [key: string]: boolean }>({});

  const toggleStation = (station: string) => {
    setOpenStations(prev => ({
      ...prev,
      [station]: !prev[station]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* <MockBoxPlot 
          title="Average Travel Times per Station"
          data={mockData.stationTravelTimes}
        /> */}
       
        {/* Incident Types Pie Chart - moved to second position */}
        <IncidentTypesPieChart historicalIncidentStats={historicalIncidentStats} incidents={incidents} />
        
        <MockBarChart 
          title="Average Response Times by Category"
          data={mockData.categoryResponseTimes}
          valueKey="avgResponseTime"
          labelKey="category"
          unit=" min"
          isRealData={false}
        />
        
        <MockBarChart 
          title="Average Distance Covered by Vehicle Type"
          data={mockData.vehicleDistances}
          valueKey="avgDistance"
          labelKey="vehicleType"
          unit=" km"
          isRealData={false}
        />
      </div>

      {/* Station-Specific Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Detailed Station Analysis
        </h3>
        
        {mockData.stationTimeSeriesData.map((stationData) => (
          <Card key={stationData.station}>
            <Collapsible 
              open={openStations[stationData.station]} 
              onOpenChange={() => toggleStation(stationData.station)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {stationData.station} - Travel Times per Incident
                    </CardTitle>
                    <Button variant="ghost" size="sm">
                      {openStations[stationData.station] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {stationData.incidents.length} incidents analyzed
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent>
                  <StationLineChart stationData={stationData} />
                  <div className="mt-4 text-xs text-gray-500">
                    Line chart showing travel time trends throughout the day. Hover over points for details.
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};