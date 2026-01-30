import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, Smartphone, Monitor, Tablet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const AGE_COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6'];
const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' };

export default function AudienceDemographics({ demographics = {} }) {
  const { top_countries = [], age_groups = {}, gender = {}, devices = {} } = demographics;
  
  const ageData = [
    { name: '18-24', value: age_groups['18_24'] || 0 },
    { name: '25-34', value: age_groups['25_34'] || 0 },
    { name: '35-44', value: age_groups['35_44'] || 0 },
    { name: '45-54', value: age_groups['45_54'] || 0 },
    { name: '55+', value: age_groups['55_plus'] || 0 }
  ];
  
  const genderData = [
    { name: 'Male', value: gender.male || 0, color: GENDER_COLORS.male },
    { name: 'Female', value: gender.female || 0, color: GENDER_COLORS.female },
    { name: 'Other', value: gender.other || 0, color: GENDER_COLORS.other }
  ];
  
  const totalGender = genderData.reduce((sum, g) => sum + g.value, 0);
  
  const deviceData = [
    { name: 'Mobile', value: devices.mobile || 65, icon: Smartphone },
    { name: 'Desktop', value: devices.desktop || 28, icon: Monitor },
    { name: 'Tablet', value: devices.tablet || 7, icon: Tablet }
  ];

  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Audience Demographics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Age Distribution */}
        <div>
          <p className="text-amber-400/70 text-sm mb-3">Age Distribution</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={50} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Viewers']}
                  contentStyle={{ background: '#1c1917', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 8 }}
                  labelStyle={{ color: '#fef3c7' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Gender Distribution */}
        <div>
          <p className="text-amber-400/70 text-sm mb-3">Gender</p>
          <div className="flex gap-2 h-6 rounded-full overflow-hidden bg-stone-900">
            {genderData.map((g, i) => (
              <div 
                key={i}
                style={{ 
                  width: `${totalGender > 0 ? (g.value / totalGender * 100) : 0}%`,
                  backgroundColor: g.color 
                }}
                className="h-full first:rounded-l-full last:rounded-r-full"
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {genderData.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-amber-400/70 text-xs">{g.name}</span>
                <span className="text-amber-100 text-xs font-semibold">{g.value}%</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top Countries */}
        {top_countries.length > 0 && (
          <div>
            <p className="text-amber-400/70 text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Top Locations
            </p>
            <div className="space-y-2">
              {top_countries.slice(0, 5).map((country, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-amber-100 w-6 text-sm">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-amber-100">{country.country}</span>
                      <span className="text-amber-400">{country.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                        style={{ width: `${country.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Devices */}
        <div>
          <p className="text-amber-400/70 text-sm mb-3">Devices</p>
          <div className="grid grid-cols-3 gap-3">
            {deviceData.map((device, i) => {
              const Icon = device.icon;
              return (
                <div key={i} className="bg-stone-900/50 rounded-xl p-4 text-center">
                  <Icon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-amber-100">{device.value}%</p>
                  <p className="text-amber-400/50 text-xs">{device.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}