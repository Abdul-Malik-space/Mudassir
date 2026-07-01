import React from 'react'
import RevnueChart from '../Dashboard/RevnueChart';
import SalesChart from '../Dashboard/SalesChart';
function ChartSection() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <RevnueChart />
      </div>
      <div className='space-x-6'>
        <SalesChart/>
      </div>
    </div>
  );
}

export default ChartSection