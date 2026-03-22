import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

/**
 * FlavorRadarChart Component
 * Supports both 5-dimensional tasting data and 6-dimensional DNA data.
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of { name: string, value: number }
 * @param {string} props.color - Hex color for the radar area
 * @param {number} props.height - Chart height
 */
const FlavorRadarChart = ({ data, color = "#e9c176", height = 300 }) => {
  return (
    <div style={{ height, width: '100%' }}>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#4e4639" strokeOpacity={0.4} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: "#d1c5b4", fontSize: 10, fontWeight: 700, fontFamily: 'Inter' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 10]} 
              tick={false} 
              axisLine={false} 
            />
            <Radar
              name="Flavor"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d0c5af', fontSize: '12px' }}>
          No data available
        </div>
      )}
    </div>
  );
};

export default FlavorRadarChart;
