import React from 'react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface BoxPlotData {
  stationName: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
}

interface BoxPlotChartProps {
  data: BoxPlotData[];
  width?: string | number;
  height?: number;
  yAxisLabel?: string;
}

export function BoxPlotChart({ data, width = "100%", height = 400, yAxisLabel = "Value" }: BoxPlotChartProps) {
  // Calculate axis bounds
  const allValues = data.flatMap(d => [d.min, d.max]);
  const yMin = Math.min(...allValues) * 0.9;
  const yMax = Math.max(...allValues) * 1.1;
  
  // Box plot styling
  const boxWidth = 40;
  const whiskerWidth = 20;
  
  return (
    <ResponsiveContainer width={width} height={height}>
      <svg viewBox={`0 0 800 ${height}`} style={{ width: '100%', height: '100%' }}>
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="2,2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Y-axis */}
        <line x1="80" y1="50" x2="80" y2={height - 80} stroke="#666" strokeWidth="1"/>
        
        {/* X-axis */}
        <line x1="80" y1={height - 80} x2="720" y2={height - 80} stroke="#666" strokeWidth="1"/>
        
        {/* Y-axis label */}
        <text x="30" y={height / 2} textAnchor="middle" transform={`rotate(-90, 30, ${height / 2})`} 
              fontSize="12" fill="#666">
          {yAxisLabel}
        </text>
        
        {/* Box plots */}
        {data.map((item, index) => {
          const x = 120 + index * 80; // Center position for each box
          
          // Scale values to fit the chart
          const scaleY = (value: number) => {
            const ratio = (value - yMin) / (yMax - yMin);
            return height - 80 - ratio * (height - 130);
          };
          
          const minY = scaleY(item.min);
          const q1Y = scaleY(item.q1);
          const medianY = scaleY(item.median);
          const q3Y = scaleY(item.q3);
          const maxY = scaleY(item.max);
          const meanY = scaleY(item.mean);
          
          return (
            <g key={item.stationName}>
              {/* Upper whisker */}
              <line x1={x} y1={maxY} x2={x} y2={q3Y} stroke="#333" strokeWidth="2"/>
              <line x1={x - whiskerWidth/2} y1={maxY} x2={x + whiskerWidth/2} y2={maxY} stroke="#333" strokeWidth="2"/>
              
              {/* Box */}
              <rect 
                x={x - boxWidth/2} 
                y={q3Y} 
                width={boxWidth} 
                height={q1Y - q3Y} 
                fill="#4ECDC4" 
                fillOpacity="0.7"
                stroke="#333" 
                strokeWidth="2"
              />
              
              {/* Median line */}
              <line x1={x - boxWidth/2} y1={medianY} x2={x + boxWidth/2} y2={medianY} stroke="#333" strokeWidth="3"/>
              
              {/* Mean point */}
              <circle cx={x} cy={meanY} r="4" fill="#FF6B6B" stroke="#333" strokeWidth="1"/>
              
              {/* Lower whisker */}
              <line x1={x} y1={q1Y} x2={x} y2={minY} stroke="#333" strokeWidth="2"/>
              <line x1={x - whiskerWidth/2} y1={minY} x2={x + whiskerWidth/2} y2={minY} stroke="#333" strokeWidth="2"/>
              
              {/* Station label */}
              <text x={x} y={height - 60} textAnchor="middle" fontSize="11" fill="#666">
                {item.stationName.replace('station_', 'Station ')}
              </text>
            </g>
          );
        })}
        
        {/* Y-axis ticks and labels */}
        {Array.from({ length: 6 }, (_, i) => {
          const value = yMin + (yMax - yMin) * i / 5;
          const y = height - 80 - (i / 5) * (height - 130);
          return (
            <g key={i}>
              <line x1="75" y1={y} x2="85" y2={y} stroke="#666" strokeWidth="1"/>
              <text x="70" y={y + 4} textAnchor="end" fontSize="10" fill="#666">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* Legend */}
        <g transform="translate(550, 60)">
          <text x="0" y="0" fontSize="12" fontWeight="bold" fill="#333">Legend:</text>
          
          {/* Box */}
          <rect x="10" y="15" width="20" height="15" fill="#4ECDC4" fillOpacity="0.7" stroke="#333" strokeWidth="1"/>
          <text x="35" y="27" fontSize="10" fill="#666">Q1-Q3 (IQR)</text>
          
          {/* Median line */}
          <line x1="10" y1="45" x2="30" y2="45" stroke="#333" strokeWidth="2"/>
          <text x="35" y="49" fontSize="10" fill="#666">Median</text>
          
          {/* Mean point */}
          <circle cx="20" cy="60" r="3" fill="#FF6B6B" stroke="#333" strokeWidth="1"/>
          <text x="35" y="64" fontSize="10" fill="#666">Mean</text>
          
          {/* Whiskers */}
          <line x1="20" y1="75" x2="20" y2="85" stroke="#333" strokeWidth="1"/>
          <line x1="15" y1="75" x2="25" y2="75" stroke="#333" strokeWidth="1"/>
          <line x1="15" y1="85" x2="25" y2="85" stroke="#333" strokeWidth="1"/>
          <text x="35" y="82" fontSize="10" fill="#666">Min/Max</text>
        </g>
      </svg>
    </ResponsiveContainer>
  );
}