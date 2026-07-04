/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, CloudRain, ShieldAlert, Activity, 
  Droplets, Zap, Server, ShieldCheck, AlertTriangle, 
  CloudLightning, Lock, Cpu, Fan, AlertCircle, 
  TrendingDown, DollarSign, Cloud, Sun, StopCircle, Waves, RotateCcw
} from 'lucide-react';

export default function App() {
  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  
  // Infrastructure State (Bundled for atomic, bug-free physics updates)
  const [tanks, setTanks] = useState({
    treated: 35, // Treated RWHT
    muni: 92,    // Municipal Grid
    roof: 15,    // Raw Tank 1
    storm: 25    // Raw Tank 2
  });
  
  const [flows, setFlows] = useState({ treated: 0, muni: 0 });
  
  const [waterSavedMTD, setWaterSavedMTD] = useState(1245000); // MTD = Month to Date
  const [powerUsage, setPowerUsage] = useState(450); // kW
  const [pue, setPue] = useState(1.24); 
  const [drawRate, setDrawRate] = useState(1); 
  const [waterAlert, setWaterAlert] = useState(null);

  // Simulation States
  const [forecastData, setForecastData] = useState(null);
  const [locationInput, setLocationInput] = useState('Cyberjaya');
  const [isHarvesting, setIsHarvesting] = useState(false);
  
  const [siemStatus, setSiemStatus] = useState('Normal');
  const [siemLogs, setSiemLogs] = useState([]);
  const [isSimulatingAnomaly, setIsSimulatingAnomaly] = useState(false);

  // Derived Metrics
  const costSavedRM = (waterSavedMTD * 0.002).toFixed(2); 
  const dependencyReduction = Math.min(100, 20 + (waterSavedMTD / 150000)).toFixed(1);
  const rawTotal = tanks.roof + tanks.storm;
  const activeSource = (tanks.treated > 0 || rawTotal > 0) ? 'RWHT' : 'MUNICIPAL';
  
  // Power Load Derivations based on dynamic Power Usage
  const serverLoadPercent = Math.min(100, (powerUsage / 1000) * 100).toFixed(1);
  const coolingRequiredPercent = Math.min(100, (powerUsage / 1000) * 115).toFixed(1);
  
  const dynamicRwhtStatus = isHarvesting 
    ? 'Harvesting Active' 
    : (rawTotal < 1 && tanks.treated <= 0) ? 'Harvesting Required' : 'Standby / Idle';

  // --- UNIFIED PHYSICS LOOP ---
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
      
      // Load dynamically scales based on the Draw Rate slider
      if (!isSimulatingAnomaly) {
        const targetPower = 300 + (drawRate * 60); 
        setPowerUsage(prev => prev + ((targetPower - prev) * 0.2) + (Math.random() * 10 - 5));
        setPue(Math.max(1.1, 1.15 + (drawRate * 0.015) + (Math.random() * 0.02 - 0.01)));
      }

      setTanks(prev => {
        let { treated, muni, roof, storm } = prev;
        let treatedFlow = 0;
        let muniFlow = 0;
        
        // 1. Municipal Refill (Simulating continuous city pressure)
        muni = Math.min(100, muni + 2.0); 
        
        // 2. Harvesting Fill
        if (isHarvesting) {
          roof = Math.min(100, roof + 1.5);
          storm = Math.min(100, storm + 2.0);
        }

        // 3. Sequential Draw Logic (Treated -> Raw -> Muni)
        let drawRemaining = drawRate * 0.8;

        // Step 3a: Draw from Treated Tank
        if (treated >= drawRemaining) {
          treated -= drawRemaining;
          treatedFlow -= drawRemaining;
          setWaterSavedMTD(w => w + (drawRemaining * 120));
          drawRemaining = 0;
        } else {
          const treatedDrawn = treated;
          treated = 0;
          treatedFlow -= treatedDrawn;
          setWaterSavedMTD(w => w + (treatedDrawn * 120));
          drawRemaining -= treatedDrawn;
        }

        // Step 3b: If Treated is empty, aggressively treat Raw Water to meet demand
        if (drawRemaining > 0 && (roof > 0 || storm > 0)) {
          let rawNeeded = drawRemaining / 0.9; 
          let roofDrawn = Math.min(roof, rawNeeded / 2);
          let stormDrawn = Math.min(storm, rawNeeded - roofDrawn);
          
          if (stormDrawn < rawNeeded / 2) {
             roofDrawn = Math.min(roof, rawNeeded - stormDrawn);
          }
          
          roof -= roofDrawn;
          storm -= stormDrawn;
          
          const waterTreated = (roofDrawn + stormDrawn) * 0.9;
          treatedFlow -= waterTreated; // Flows through treated tank
          setWaterSavedMTD(w => w + (waterTreated * 120));
          drawRemaining -= waterTreated;
        }

        // Step 3c: Standard background treatment if demand is met but treated tank is low (< 30%)
        if (drawRemaining <= 0 && treated < 30 && (roof > 0 || storm > 0) && treated < 100) {
          const rDraw = Math.min(roof, 1.0);
          const sDraw = Math.min(storm, 1.2);
          roof -= rDraw;
          storm -= sDraw;
          const treatmentGain = (rDraw + sDraw) * 0.9;
          treated = Math.min(100, treated + treatmentGain);
          treatedFlow += treatmentGain;
        }

        // Step 3d: If STILL demand remaining (Raw is empty too), draw from Municipal
        if (drawRemaining > 0) {
          muni -= drawRemaining;
          muniFlow -= drawRemaining;
        }

        // 4. Safety Floors (Municipal never drops below 10%)
        if (muni < 10) muni = 10;
        if (treated < 0) treated = 0;
        if (roof < 0) roof = 0;
        if (storm < 0) storm = 0;

        setFlows({ treated: treatedFlow, muni: muniFlow });

        return { treated, muni, roof, storm };
      });
      
    }, 1000); 
    
    return () => clearInterval(timer);
  }, [isHarvesting, drawRate, isSimulatingAnomaly]);

  // Alert Monitor Effect
  useEffect(() => {
    if (drawRate > 4 && tanks.treated < 60) {
      setWaterAlert({
        msg: 'CRITICAL: Rapid Treated Water Depletion Detected',
        check: '1. Inspect Secondary Cooling Loop (Valve V-204) for physical leaks. 2. Verify CRAC units are not experiencing sudden thermal runaway.'
      });
    } else if (drawRate <= 2) {
      setWaterAlert(null);
    }
  }, [drawRate, tanks.treated]);

  // Depletion Time Calculator Helper
  const calcDepletionTime = (level, netFlow) => {
    if (netFlow >= 0 || level <= 0) return 'Stable / Filling';
    const ticksToEmpty = level / Math.abs(netFlow);
    const mins = Math.floor(ticksToEmpty * 1.5); 
    if (mins > 1440) return '> 24 hrs';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m remaining`;
  };

  // --- SIMULATION HANDLERS ---
  const handleWeatherSearch = (e) => {
    e.preventDefault();
    setForecastData(null);
    setIsHarvesting(false);
    
    setTimeout(() => {
      const isDry = locationInput === 'Bukit Jalil' || locationInput === 'Petaling Jaya';
      
      setForecastData({
        location: locationInput.toUpperCase(),
        precipitationProb: isDry ? 12 : 88,
        estimatedVolume: isDry ? 45 : 5200,
        timeToRain: isDry ? '> 48 hours' : '1.5 hours',
        recommendation: isDry 
          ? 'Conserve RWHT. Maintain Municipal Supply dependency.' 
          : 'Initiate Rainwater Harvesting Prep. Storm imminent.',
        rwhtStatus: isDry ? 'Standby / Idle' : 'Ready for Harvesting'
      });
    }, 1200);
  };

  const toggleHarvesting = () => {
    setIsHarvesting(!isHarvesting);
  };

  const triggerAnomaly = () => {
    if (isSimulatingAnomaly) return;
    setIsSimulatingAnomaly(true);
    setSiemStatus('Critical Threat Detected');
    setPowerUsage(850); 
    setPue(1.85); 
    
    const sequence = [
      { type: 'IT', msg: '[IT SEC] Anomalous outbound connection detected on Port 443', time: 0 },
      { type: 'IT', msg: '[IT SEC] Cryptomining payload signature matched on Server Rack C4', time: 1000 },
      { type: 'SYS', msg: '[METRIC] Rack C4 CPU utilization spiked to 99%', time: 2000 },
      { type: 'OT', msg: '[OT ALARM] CRAC Unit 2 thermal overload. Return temp exceeds threshold', time: 3500 },
      { type: 'AI', msg: '[AI CORRELATION] IT Malware causing thermal runaway. Cascading OT stress.', time: 5500 },
      { type: 'ACTION', msg: '[MITIGATION] 1. Isolate VLAN C4. 2. Spin up backup CRAC Unit.', time: 7000 },
    ];

    setSiemLogs([]);
    sequence.forEach((log, index) => {
      setTimeout(() => setSiemLogs(prev => [...prev, { id: index, ...log }]), log.time);
    });

    setTimeout(() => {
      setIsSimulatingAnomaly(false);
      setSiemStatus('Normal');
      setPowerUsage(450);
      setPue(1.24);
    }, 15000);
  };

  // Dynamic Weather UI Logic
  const isDryLoc = locationInput === 'Bukit Jalil' || locationInput === 'Petaling Jaya';
  const displayWeatherState = isHarvesting ? 'Heavy Rain' : (isDryLoc ? 'Clear & Dry' : 'Cloudy');
  const displayWeatherIcon = isHarvesting ? <CloudRain size={24} className="text-blue-400 animate-pulse"/> : (isDryLoc ? <Sun size={24} className="text-amber-400"/> : <Cloud size={24} className="text-slate-400"/>);
  const timeLabel = isHarvesting ? 'Est. Harvest Time Left' : 'Time to Next Rain';

  // --- UI COMPONENTS ---
  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col gap-8 flex-shrink-0">
        <div className="flex items-center gap-3 text-emerald-400">
          <Activity size={28} />
          <div>
            <h1 className="font-bold text-lg leading-tight">EcoDC Console</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI Optimization</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Central Dashboard" />
          <SidebarItem id="water" icon={CloudRain} label="Rainwater AI" />
          <SidebarItem id="energy" icon={Zap} label="Energy & SIEM" />
        </nav>

        <div className="mt-auto bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">System Time</p>
          <p className="font-mono text-emerald-400">{systemTime}</p>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-8 overflow-y-auto h-screen">
        
        {/* VIEW: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold text-white">Facility Overview</h2>
              <span className="text-sm text-slate-500">Central Monitoring Hub</span>
            </div>

            {waterAlert && (
              <div className="bg-red-900/30 border-l-4 border-red-500 p-5 rounded-r-xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top-4">
                <AlertCircle className="text-red-500 shrink-0 mt-1" size={28} />
                <div>
                  <h3 className="text-red-400 font-bold text-lg uppercase tracking-wide">{waterAlert.msg}</h3>
                  <p className="text-red-200 mt-2 text-sm leading-relaxed"><strong className="text-white">ACTION REQUIRED:</strong> {waterAlert.check}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4"><p className="text-sm text-slate-400 font-medium">Power Usage (PUE)</p><Activity className="text-emerald-400" size={20} /></div>
                <h3 className="text-3xl font-bold text-white font-mono">{pue.toFixed(2)}</h3>
                <div className={`absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all`} style={{ width: `${(pue/2)*100}%` }}></div>
              </div>

              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4"><p className="text-sm text-slate-400 font-medium">Water Saved (MTD)</p><Droplets className="text-blue-400" size={20} /></div>
                  <h3 className="text-3xl font-bold text-white font-mono">{(waterSavedMTD/1000).toFixed(1)}k <span className="text-sm text-slate-500">L</span></h3>
                  <p className="text-[11px] text-emerald-400 mt-2">RM {costSavedRM} Saved | -{dependencyReduction}% Dependency</p>
                </div>
                <div className="mt-4 text-[11px] bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 flex justify-between items-center">
                  <span className="text-slate-400">RWHT Status:</span>
                  <span className="text-blue-300 font-bold">{isHarvesting ? 'Harvesting' : (forecastData?.rwhtStatus || 'Standby / Idle')}</span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-start mb-4"><p className="text-sm text-slate-400 font-medium">Live Power Draw</p><Zap className="text-amber-400" size={20} /></div>
                <h3 className="text-3xl font-bold text-white font-mono">{powerUsage.toFixed(0)} <span className="text-lg text-slate-500">kW</span></h3>
              </div>

              <div className={`bg-slate-800/40 p-5 rounded-2xl border ${siemStatus === 'Normal' ? 'border-slate-700/50' : 'border-red-500 bg-red-900/20'}`}>
                <div className="flex justify-between items-start mb-4"><p className="text-sm text-slate-400 font-medium">Cybersecurity</p>{siemStatus === 'Normal' ? <ShieldCheck className="text-emerald-400" size={20} /> : <ShieldAlert className="text-red-500 animate-pulse" size={20} />}</div>
                <h3 className={`text-xl font-bold mt-2 ${siemStatus === 'Normal' ? 'text-emerald-400' : 'text-red-500'}`}>{siemStatus}</h3>
              </div>
            </div>
            
            <div className="mt-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Server size={18}/> Infrastructure Health Map</h3>
              <div className="grid grid-cols-3 gap-6">
                
                <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 text-blue-400 mb-2"><Droplets size={16}/> RWHT & Supply</div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Raw Rainwater</span> <span className="text-white font-mono">{((tanks.roof + tanks.storm) / 2).toFixed(0)}%</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Municipal Supply</span> <span className="text-white font-mono">{tanks.muni.toFixed(0)}%</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Treated RWHT</span> <span className={`${tanks.treated < 20 ? 'text-red-400' : 'text-white'} font-mono`}>{tanks.treated.toFixed(0)}%</span></div>
                  <div className="flex justify-between text-sm text-slate-400 mt-1 pt-2 border-t border-slate-800">
                    <span>Active Source</span> <span className={activeSource === 'RWHT' ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>{activeSource}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 text-amber-400 mb-2"><Cpu size={16}/> IT Infrastructure</div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Core Routers</span> <span className="text-emerald-400">Online</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Rack Group A</span> <span className="text-emerald-400">Optimal</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Rack Group C</span> <span className={siemStatus !== 'Normal' ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400'}>{siemStatus !== 'Normal' ? 'CRITICAL' : 'Optimal'}</span></div>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 text-teal-400 mb-2"><Fan size={16}/> OT Cooling Loop</div>
                  <div className="flex justify-between text-sm text-slate-400"><span>CRAC Unit 1</span> <span className="text-emerald-400">Online</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>CRAC Unit 2</span> <span className={siemStatus !== 'Normal' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{siemStatus !== 'Normal' ? 'OVERLOAD' : 'Online'}</span></div>
                  <div className="flex justify-between text-sm text-slate-400"><span>Water Pressure</span> <span className={drawRate > 4 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{drawRate > 4 ? 'DROPPING' : 'Stable'}</span></div>
                </div>
                
              </div>
            </div>
          </div>
        )}

        {/* VIEW: WATER AI */}
        {activeTab === 'water' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><CloudRain className="text-blue-400"/> Weather-Aware Rainwater Manager</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COL: AI & Raw Water */}
              <div className="flex flex-col gap-6">
                
                {/* AI Prediction Panel */}
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 flex flex-col gap-5 shadow-lg">
                  <h3 className="text-lg font-semibold text-white">AI Weather Prediction Engine</h3>
                  
                  <form onSubmit={handleWeatherSearch} className="flex gap-3">
                    <select 
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      disabled={isHarvesting}
                      className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="Cyberjaya">Cyberjaya</option>
                      <option value="Kuala Lumpur">Kuala Lumpur</option>
                      <option value="Bukit Jalil">Bukit Jalil</option>
                      <option value="Petaling Jaya">Petaling Jaya</option>
                    </select>
                    <button type="submit" disabled={isHarvesting} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                      Forecast
                    </button>
                  </form>

                  {/* Forecast Results */}
                  <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-700 p-5 flex flex-col justify-center min-h-[220px]">
                    {!forecastData ? (
                      <div className="text-center text-slate-500 flex flex-col items-center gap-3">
                        <CloudLightning size={40} className="opacity-50" />
                        <p>Select a location to run meteorological models...</p>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                          <span className="text-slate-400 flex items-center gap-2">Current: {displayWeatherIcon} <span className="font-bold text-slate-200">{displayWeatherState}</span></span>
                          <span className="text-white font-bold">{forecastData.location}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800 p-3 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">Precipitation Prob.</p>
                            <p className={`text-xl font-bold ${forecastData.precipitationProb > 50 ? 'text-blue-400' : 'text-amber-400'}`}>{forecastData.precipitationProb}%</p>
                          </div>
                          <div className="bg-slate-800 p-3 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">{timeLabel}</p>
                            <p className="text-lg font-semibold text-slate-200">{isHarvesting ? '4.5 hours' : forecastData.timeToRain}</p>
                          </div>
                        </div>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex flex-col gap-3 mt-2">
                          <div>
                            <p className="text-xs text-blue-300 font-bold uppercase mb-1">AI Recommendation</p>
                            <p className="text-sm text-blue-100">{forecastData.recommendation}</p>
                          </div>
                          <div className="flex gap-2 w-full mt-2">
                            {(!isHarvesting) ? (
                               <button 
                                onClick={toggleHarvesting}
                                disabled={forecastData.precipitationProb < 50}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors w-full"
                              >
                                Approve & Prep System
                              </button>
                            ) : (
                              <>
                                <button disabled className="bg-emerald-600/50 text-white px-4 py-2 rounded text-xs font-bold uppercase w-full flex justify-center items-center gap-2">
                                  <Activity size={14} className="animate-spin"/> Harvesting In Progress...
                                </button>
                                <button onClick={toggleHarvesting} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors flex items-center gap-1">
                                  <StopCircle size={14}/> Stop
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw Water Collection Panel */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex flex-col shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Waves size={16}/> Raw Water Collection</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${dynamicRwhtStatus.includes('Required') ? 'bg-amber-900/50 text-amber-400' : 'bg-slate-900 text-slate-500'}`}>
                      {dynamicRwhtStatus}
                    </span>
                  </div>
                  <div className="flex justify-around items-end">
                    
                    {/* Rooftop */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-28 bg-slate-900 border-2 border-slate-600 rounded relative overflow-hidden">
                         {isHarvesting && <div className="absolute inset-0 bg-blue-500/20 animate-pulse z-10"></div>}
                         <div className="absolute bottom-0 left-0 w-full bg-slate-500/80 transition-all duration-1000" style={{ height: `${tanks.roof}%` }}></div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Rooftop Catchment</p>
                        <p className="font-mono text-sm text-white">{tanks.roof.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    {/* Stormwater */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-28 bg-slate-900 border-2 border-slate-600 rounded relative overflow-hidden">
                         {isHarvesting && <div className="absolute inset-0 bg-blue-500/20 animate-pulse z-10"></div>}
                         <div className="absolute bottom-0 left-0 w-full bg-slate-600/80 transition-all duration-1000" style={{ height: `${tanks.storm}%` }}></div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Retention Pond</p>
                        <p className="font-mono text-sm text-white">{tanks.storm.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 text-center">When treatment is active or Treated Tank &lt; 30%, raw water is automatically filtered and transferred.</p>
                </div>
              </div>

              {/* RIGHT COL: Dual Tanks & Simulation */}
              <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 flex flex-col gap-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-3">Treatment, Storage & Distribution</h3>
                
                {/* Dynamic Load Indicators */}
                <div className="flex justify-center gap-6 mt-2">
                   <div className="text-center bg-slate-900/50 border border-slate-700 px-4 py-2 rounded-lg">
                     <p className="text-[10px] uppercase text-orange-400 font-bold">Server Load</p>
                     <p className="font-mono text-lg text-white">{serverLoadPercent}%</p>
                   </div>
                   <div className="text-center bg-slate-900/50 border border-slate-700 px-4 py-2 rounded-lg">
                     <p className="text-[10px] uppercase text-teal-400 font-bold">Cooling Required</p>
                     <p className="font-mono text-lg text-white">{coolingRequiredPercent}%</p>
                   </div>
                </div>

                {/* Two Tanks Display */}
                <div className="flex justify-around items-end pt-4 border-b border-slate-700 pb-6">
                  {/* Municipal Tank */}
                  <div className="flex flex-col items-center gap-3 relative">
                    {activeSource === 'MUNICIPAL' && <div className="absolute -top-8 text-xs font-bold text-emerald-400 animate-pulse bg-emerald-900/30 px-2 py-1 rounded">ACTIVE DRAW</div>}
                    <div className={`w-28 h-44 bg-slate-900 border-4 ${activeSource === 'MUNICIPAL' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-700'} rounded-t-sm rounded-b-2xl relative overflow-hidden transition-all duration-500`}>
                      <div className="absolute bottom-0 left-0 w-full bg-blue-600/60 border-t border-blue-500 transition-all duration-1000" style={{ height: `${tanks.muni}%` }}></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase text-slate-400">Municipal Grid</p>
                      <p className="font-mono text-lg text-white">{tanks.muni.toFixed(0)}%</p>
                      <p className={`text-[10px] mt-1 font-mono ${flows.muni < 0 ? 'text-red-400' : 'text-slate-500'}`}>{calcDepletionTime(tanks.muni, flows.muni)}</p>
                    </div>
                  </div>

                  {/* RWHT Tank */}
                  <div className="flex flex-col items-center gap-3 relative">
                     {activeSource === 'RWHT' && <div className="absolute -top-8 text-xs font-bold text-emerald-400 animate-pulse bg-emerald-900/30 px-2 py-1 rounded">ACTIVE DRAW</div>}
                    <div className={`w-28 h-44 bg-slate-900 border-4 ${activeSource === 'RWHT' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-700'} rounded-t-sm rounded-b-2xl relative overflow-hidden transition-all duration-500`}>
                      {isHarvesting && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjIwIj48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI4IiBmaWxsPSIjM2I4MmY2IiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-30 animate-[slide_1s_linear_infinite] z-10"></div>}
                      <div className="absolute bottom-0 left-0 w-full bg-teal-500/80 border-t border-teal-400 transition-all duration-1000 ease-linear" style={{ height: `${tanks.treated}%` }}></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase text-slate-400">Treated Rainwater</p>
                      <p className="font-mono text-lg text-white">{tanks.treated.toFixed(0)}%</p>
                      <p className={`text-[10px] mt-1 font-mono ${flows.treated < 0 ? 'text-red-400' : 'text-emerald-500'}`}>{calcDepletionTime(tanks.treated, flows.treated)}</p>
                    </div>
                  </div>
                </div>

                {/* Financials & Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                     <div className="p-2 bg-emerald-900/40 rounded-lg"><DollarSign className="text-emerald-400" size={20}/></div>
                     <div>
                       <p className="text-xs text-slate-400">Savings (MTD)</p>
                       <p className="text-sm font-bold text-white">RM {costSavedRM}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                     <div className="p-2 bg-blue-900/40 rounded-lg"><TrendingDown className="text-blue-400" size={20}/></div>
                     <div>
                       <p className="text-[10px] text-slate-400">Dependency Reduced (MTD)</p>
                       <p className="text-sm font-bold text-white">{dependencyReduction}%</p>
                     </div>
                  </div>
                </div>

                {/* Depletion Simulator Slider */}
                <div className="mt-2 bg-slate-900/80 p-4 rounded-xl border border-slate-700 border-dashed">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2"><AlertCircle size={14}/> Simulate Facility Draw</label>
                    <span className="text-xs font-mono text-amber-400">{drawRate}x Multiplier</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="0" max="10" step="1"
                      value={drawRate}
                      onChange={(e) => setDrawRate(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <button 
                      onClick={() => setDrawRate(1)}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors text-slate-300 hover:text-white"
                      title="Reset Load"
                    >
                      <RotateCcw size={16}/>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW: ENERGY & SIEM */}
        {activeTab === 'energy' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ShieldAlert className="text-amber-400"/> Energy Monitoring & Security (SIEM)</h2>
                <button onClick={triggerAnomaly} disabled={isSimulatingAnomaly} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2">
                  <AlertTriangle size={18}/> {isSimulatingAnomaly ? 'Threat Active' : 'Inject Anomalous Spike'}
                </button>
             </div>
             
             {/* Log Terminal & Live Graph */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
                <div className="lg:col-span-2 bg-[#0a0a0a] rounded-2xl border border-slate-700/50 p-4 font-mono text-sm flex flex-col shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4 text-slate-500">
                    <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500/50"></div><div className="w-3 h-3 rounded-full bg-yellow-500/50"></div><div className="w-3 h-3 rounded-full bg-green-500/50"></div></div>
                    <span>AI Correlation Engine // IT-OT Bridge Log</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {siemLogs.length === 0 ? (<p className="text-slate-600 italic">Listening for anomalous events on IT and OT networks...</p>) : (
                      siemLogs.map(log => (
                        <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2">
                          <span className="text-slate-500 mr-3">[{new Date().toLocaleTimeString()}]</span>
                          <span className={`${log.type === 'IT' ? 'text-blue-400' : ''} ${log.type === 'OT' ? 'text-amber-400' : ''} ${log.type === 'SYS' ? 'text-slate-300' : ''} ${log.type === 'AI' ? 'text-purple-400 font-bold' : ''} ${log.type === 'ACTION' ? 'text-emerald-400 font-bold bg-emerald-900/30 p-1 rounded inline-block mt-1' : ''}`}>{log.msg}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-between relative overflow-hidden">
                   <div className={`absolute inset-0 bg-red-500/10 transition-opacity duration-1000 ${isSimulatingAnomaly ? 'opacity-100' : 'opacity-0'}`}></div>
                   <div>
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">Live Power Telemetry</h3>
                    <p className="text-xs text-slate-400">Total Facility Draw (IT + Cooling)</p>
                   </div>
                   <div className="text-center my-6">
                      <span className={`text-5xl font-bold font-mono transition-colors duration-500 ${isSimulatingAnomaly ? 'text-red-500' : 'text-emerald-400'}`}>{powerUsage.toFixed(0)}</span><span className="text-slate-500 ml-2">kW</span>
                   </div>
                   <div className="space-y-4 relative z-10">
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-300"><Lock size={16} className="text-blue-400"/> IT Network</div>
                        <span className={siemLogs.some(l => l.type==='IT') ? 'text-red-400 font-bold' : 'text-emerald-400'}>{siemLogs.some(l => l.type==='IT') ? 'BREACHED' : 'SECURE'}</span>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-300"><Fan size={16} className="text-amber-400"/> OT Cooling Subsystem</div>
                        <span className={siemLogs.some(l => l.type==='OT') ? 'text-red-400 font-bold' : 'text-emerald-400'}>{siemLogs.some(l => l.type==='OT') ? 'CRITICAL' : 'NOMINAL'}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide { from { transform: translateY(-20px); } to { transform: translateY(0); } }
      `}} />
    </div>
  );
}