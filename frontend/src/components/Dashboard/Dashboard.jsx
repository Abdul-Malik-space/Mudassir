import StatsGrid from '../Dashboard/StatsGrid';
import ChartSection from '../Dashboard/ChartSection';
import TableSection from '../Dashboard/TableSection';
import ActivatiFeed from '../Dashboard/ActivatiFeed';


function Dashboard() {
    return (

        
        <div className="space-y-6">
            
            {/* Status */}
            <StatsGrid />

            {/* ChartSection */}
            <ChartSection />

            {/* TableSection */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <TableSection />
                </div>
                <div>
                    <ActivatiFeed />
                </div>
                
            </div>
        </div>
    );
}

export default Dashboard;