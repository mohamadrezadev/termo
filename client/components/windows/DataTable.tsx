'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Trash2, FileText, AArrowDown as Csv } from 'lucide-react';

export default function DataTable() {
  const {
    language,
    markers,
    regions,
    updateMarker,
    updateRegion,
    removeMarker,
    removeRegion,
    clearAll
  } = useAppStore();

  const t = translations[language];

  const handleExportCSV = () => {
    const data = [
      ['Type', 'Label', 'X', 'Y', 'Temperature', 'Emissivity', 'Area'],
      ...markers.map(marker => [
        'Point',
        marker.label,
        marker.x.toFixed(1),
        marker.y.toFixed(1),
        marker.temperature.toFixed(1),
        marker.emissivity.toFixed(2),
        '-'
      ]),
      ...regions.map(region => [
        region.type,
        region.label,
        region.points[0]?.x.toFixed(1) || '-',
        region.points[0]?.y.toFixed(1) || '-',
        region.avgTemp.toFixed(1),
        region.emissivity.toFixed(2),
        region.area?.toFixed(1) || '-'
      ])
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thermal_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
      markers,
      regions,
      exportDate: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thermal_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Window id="data-table" title={t.dataTable} minHeight={200}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-300">
              {markers.length + regions.length} items
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 px-2"
            >
              <Csv className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportJSON}
              className="h-8 px-2"
            >
              <FileText className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 px-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t.clear}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.label}</TableHead>
                <TableHead>{t.coordinates}</TableHead>
                <TableHead>{t.temperature}</TableHead>
                <TableHead>{t.emissivity}</TableHead>
                <TableHead>{t.area}</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markers.map((marker) => (
                <TableRow key={marker.id}>
                  <TableCell className="font-medium">Point</TableCell>
                  <TableCell>
                    <Input
                      value={marker.label}
                      onChange={(e) => updateMarker(marker.id, { label: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    {marker.x.toFixed(1)}, {marker.y.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    {marker.temperature.toFixed(1)}°C
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={marker.emissivity}
                      onChange={(e) => updateMarker(marker.id, { emissivity: parseFloat(e.target.value) })}
                      className="h-8 text-sm w-20"
                      step="0.01"
                      min="0"
                      max="1"
                    />
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMarker(marker.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium capitalize">
                    {region.type}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={region.label}
                      onChange={(e) => updateRegion(region.id, { label: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    {region.points[0] ? 
                      `${region.points[0].x.toFixed(1)}, ${region.points[0].y.toFixed(1)}` : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Avg: {region.avgTemp.toFixed(1)}°C</div>
                      <div className="text-gray-400">
                        Min: {region.minTemp.toFixed(1)}°C
                      </div>
                      <div className="text-gray-400">
                        Max: {region.maxTemp.toFixed(1)}°C
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={region.emissivity}
                      onChange={(e) => updateRegion(region.id, { emissivity: parseFloat(e.target.value) })}
                      className="h-8 text-sm w-20"
                      step="0.01"
                      min="0"
                      max="1"
                    />
                  </TableCell>
                  <TableCell>
                    {region.area ? region.area.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRegion(region.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {markers.length === 0 && regions.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p>No measurement data</p>
                <p className="text-sm">Use the tools to add markers and regions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}

// 'use client';

// import { useAppStore } from '@/lib/store';
// import { translations } from '@/lib/translations';
// import Window from './Window';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import { Download, Trash2, FileText, AArrowDown as Csv } from 'lucide-react';

// export default function DataTable() {
//   const {
//     language,
//     markers,
//     regions,
//     updateMarker,
//     updateRegion,
//     removeMarker,
//     removeRegion,
//     clearAll
//   } = useAppStore();

//   const t = translations[language];

//   const handleExportCSV = () => {
//     const data = [
//       ['Type', 'Label', 'X', 'Y', 'Temperature', 'Emissivity', 'Area'],
//       ...markers.map(marker => [
//         'Point',
//         marker.label,
//         marker.x.toFixed(1),
//         marker.y.toFixed(1),
//         marker.temperature.toFixed(1),
//         marker.emissivity.toFixed(2),
//         '-'
//       ]),
//       ...regions.map(region => [
//         region.type,
//         region.label,
//         region.points[0]?.x.toFixed(1) || '-',
//         region.points[0]?.y.toFixed(1) || '-',
//         region.avgTemp.toFixed(1),
//         region.emissivity.toFixed(2),
//         region.area?.toFixed(1) || '-'
//       ])
//     ];

//     const csvContent = data.map(row => row.join(',')).join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'thermal_data.csv';
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const handleExportJSON = () => {
//     const data = {
//       markers,
//       regions,
//       exportDate: new Date().toISOString()
//     };

//     const jsonContent = JSON.stringify(data, null, 2);
//     const blob = new Blob([jsonContent], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'thermal_data.json';
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <Window id="data-table" title={t.dataTable} minHeight={200}>
//       <div className="flex flex-col h-full">
//         {/* Toolbar */}
//         <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
//           <div className="flex items-center space-x-1">
//             <span className="text-sm text-gray-300">
//               {markers.length + regions.length} items
//             </span>
//           </div>
          
//           <div className="flex items-center space-x-1">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={handleExportCSV}
//               className="h-8 px-2"
//             >
//               <Csv className="w-4 h-4 mr-1" />
//               CSV
//             </Button>
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={handleExportJSON}
//               className="h-8 px-2"
//             >
//               <FileText className="w-4 h-4 mr-1" />
//               JSON
//             </Button>
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={clearAll}
//               className="h-8 px-2 text-red-400 hover:text-red-300"
//             >
//               <Trash2 className="w-4 h-4 mr-1" />
//               {t.clear}
//             </Button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="flex-1 overflow-auto">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>{t.type}</TableHead>
//                 <TableHead>{t.label}</TableHead>
//                 <TableHead>{t.coordinates}</TableHead>
//                 <TableHead>{t.temperature}</TableHead>
//                 <TableHead>{t.emissivity}</TableHead>
//                 <TableHead>{t.area}</TableHead>
//                 <TableHead className="w-20">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {markers.map((marker) => (
//                 <TableRow key={marker.id}>
//                   <TableCell className="font-medium">Point</TableCell>
//                   <TableCell>
//                     <Input
//                       value={marker.label}
//                       onChange={(e) => updateMarker(marker.id, { label: e.target.value })}
//                       className="h-8 text-sm"
//                     />
//                   </TableCell>
//                   <TableCell>
//                     {marker.x.toFixed(1)}, {marker.y.toFixed(1)}
//                   </TableCell>
//                   <TableCell>
//                     {marker.temperature.toFixed(1)}°C
//                   </TableCell>
//                   <TableCell>
//                     <Input
//                       type="number"
//                       value={marker.emissivity}
//                       onChange={(e) => updateMarker(marker.id, { emissivity: parseFloat(e.target.value) })}
//                       className="h-8 text-sm w-20"
//                       step="0.01"
//                       min="0"
//                       max="1"
//                     />
//                   </TableCell>
//                   <TableCell>-</TableCell>
//                   <TableCell>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => removeMarker(marker.id)}
//                       className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
//                     >
//                       <Trash2 className="w-3 h-3" />
//                     </Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
              
//               {regions.map((region) => (
//                 <TableRow key={region.id}>
//                   <TableCell className="font-medium capitalize">
//                     {region.type}
//                   </TableCell>
//                   <TableCell>
//                     <Input
//                       value={region.label}
//                       onChange={(e) => updateRegion(region.id, { label: e.target.value })}
//                       className="h-8 text-sm"
//                     />
//                   </TableCell>
//                   <TableCell>
//                     {region.points[0] ? 
//                       `${region.points[0].x.toFixed(1)}, ${region.points[0].y.toFixed(1)}` : 
//                       '-'
//                     }
//                   </TableCell>
//                   <TableCell>
//                     <div className="text-xs">
//                       <div>Avg: {region.avgTemp.toFixed(1)}°C</div>
//                       <div className="text-gray-400">
//                         Min: {region.minTemp.toFixed(1)}°C
//                       </div>
//                       <div className="text-gray-400">
//                         Max: {region.maxTemp.toFixed(1)}°C
//                       </div>
//                     </div>
//                   </TableCell>
//                   <TableCell>
//                     <Input
//                       type="number"
//                       value={region.emissivity}
//                       onChange={(e) => updateRegion(region.id, { emissivity: parseFloat(e.target.value) })}
//                       className="h-8 text-sm w-20"
//                       step="0.01"
//                       min="0"
//                       max="1"
//                     />
//                   </TableCell>
//                   <TableCell>
//                     {region.area ? region.area.toFixed(1) : '-'}
//                   </TableCell>
//                   <TableCell>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => removeRegion(region.id)}
//                       className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
//                     >
//                       <Trash2 className="w-3 h-3" />
//                     </Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
          
//           {markers.length === 0 && regions.length === 0 && (
//             <div className="flex items-center justify-center h-32 text-gray-400">
//               <div className="text-center">
//                 <FileText className="w-8 h-8 mx-auto mb-2" />
//                 <p>No measurement data</p>
//                 <p className="text-sm">Use the tools to add markers and regions</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </Window>
//   );
// }