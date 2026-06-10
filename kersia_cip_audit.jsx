import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  green:   "#0F6E56", greenLight: "#E1F5EE", greenMid: "#1D9E75",
  blue:    "#185FA5", blueLight:  "#E6F1FB",
  amber:   "#BA7517", amberLight: "#FAEEDA",
  red:     "#A32D2D", redLight:   "#FCEBEB",
  purple:  "#534AB7", purpleLight:"#EEEDFE",
  gray:    "#5F5E5A", grayLight:  "#F1EFE8",
  border:  "#D3D1C7",
  surface: "#FFFFFF",
  bg:      "#F8F9FA",
};

const TANK_TYPES = ["FST","BBT","YRT","YPT","HORAP","DAW","H&T","Other"];
const CIP_FREQ_OPTIONS = ["After emptying","Every batch","Weekly","Bi-weekly","Monthly","Custom"];
const SPRAYBALL_TYPES  = ["Fixed","Rotating","CIP-O-Mat","Spray nozzle","Other"];
const RECOVERY_OPTIONS = ["Recovery","No recovery"];
const BOOL_OPTIONS     = ["Yes","No"];

// ─── Default blank audit ──────────────────────────────────────────────────────
const blankAudit = () => ({
  id: Date.now(),
  createdAt: new Date().toISOString().slice(0,10),
  // Overview
  brewery: "", capacity: "", capacityUnit: "hl", currency: "EUR",
  rateWater: "", rateEle: "", rateHeat: "",
  rateCaustic32: "", rateCaustic50: "", rateAcid: "", rateDisinfectant: "",
  rateProposedAcidDisinfectant: "", exchangeRate: "",
  // Tank systems
  tanks: [{
    ...blankTank(),
    id: 1,
  }],
  notes: "",
  status: "Draft",
});

const blankTank = () => ({
  id: Date.now() + Math.random(),
  tankType: "FST",
  // Baseline
  howManyTanks: "", grossTankVolume: "", tankDiameter: "",
  spraybAllType: SPRAYBALL_TYPES[0],
  cipSupplyPipeDN: "", cipFrequency: CIP_FREQ_OPTIONS[0],
  cipTimesYearly: "", supplyPumpKw: "", returnPumpKw: "",
  concentratedCaustic: "", causticConcentrationUsed: "",
  causticCipTankVolume: "", acidConcentrationUsed: "",
  acidCipTankVolume: "", disinfectantConcentrationUsed: "",
  disinfectantCipTankVolume: "",
  // Proposal overrides
  proposalCausticConc: "", proposalAcidDisinfectantConc: "",
  proposalDisinfectantConc: "", proposalCipTimesYearly: "",
  // Current CIP steps
  current: blankCipSteps(),
  // Proposed CIP steps
  proposed: blankCipSteps(),
  // Totals (filled manually or computed)
  currentTotals: { caustic: "", acid: "", disinfectant: "", water: "", time: "", energy: "" },
  proposedTotals:{ caustic: "", acid: "", disinfectant: "", water: "", time: "", energy: "" },
});

const blankCipSteps = () => ({
  // 1. Water pre-rinse
  waterPreRinseIncluded: "No",
  waterPrerun_time: "", waterPrerun_flow: "", waterPrerun_vol: "",
  waterRinsing_intervals: "", waterRinsing_time: "", waterRinsing_flow: "", waterRinsing_vol: "", waterRinsing_rest: "",
  // 2. Caustic rinsing
  causticPrerun_time: "", causticPrerun_flow: "", causticPrerun_vol: "",
  causticTailCleaning_time: "", causticTailCleaning_flow: "", causticTailCleaning_vol: "",
  causticRinsing_intervals: "", causticRinsing_time: "", causticRinsing_flow: "", causticRinsing_vol: "", causticRinsing_rest: "",
  causticCirculationIncluded: "No",
  causticTankVolBefore: "", causticTankVolAfter: "",
  causticConcBefore: "", causticConcAfter: "",
  causticSoakingIncluded: "No",
  causticSoakVol: "", causticSoakFlow: "", causticSoakWaitTime: "",
  // 2b. Intermediate water rinse
  intWaterPrerun_time: "", intWaterPrerun_flow: "", intWaterPrerun_vol: "",
  intWaterRinsing_intervals: "", intWaterRinsing_time: "", intWaterRinsing_flow: "", intWaterRinsing_vol: "", intWaterRinsing_rest: "",
  // 3. Acid rinsing
  acidTankVolBefore: "", acidConcBefore: "",
  acidPrerun_time: "", acidPrerun_flow: "", acidPrerun_vol: "",
  acidTailCleaning_time: "", acidTailCleaning_flow: "",
  acidRinsing_intervals: "", acidRinsing_time: "", acidRinsing_flow: "", acidRinsing_rest: "",
  acidTankVolAfter: "", acidConcAfter: "",
  // 4. Intermediate water rinse 2
  intWater2Prerun_time: "", intWater2Prerun_flow: "", intWater2Prerun_vol: "",
  intWater2Rinsing_intervals: "", intWater2Rinsing_time: "", intWater2Rinsing_flow: "", intWater2Rinsing_vol: "", intWater2Rinsing_rest: "",
  // 5. Disinfection
  disinfectionIncluded: "No",
  disinfectionRecovery: "No recovery",
  disTankVolBefore: "", disConcBefore: "",
  disPrerun_time: "", disPrerun_flow: "", disPrerun_vol: "",
  disRinsing_intervals: "", disRinsing_time: "", disRinsing_flow: "", disRinsing_vol: "", disRinsing_rest: "",
  disTankVolAfter: "", disConcAfter: "",
  // 6. Final water rinse
  finalWaterPrerun_time: "", finalWaterPrerun_flow: "", finalWaterPrerun_vol: "",
  finalWaterRinsing_intervals: "", finalWaterRinsing_time: "", finalWaterRinsing_flow: "", finalWaterRinsing_vol: "", finalWaterRinsing_rest: "",
});

// ─── Small helpers ────────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0;
const pct = (a,b) => b ? (((b-a)/b)*100).toFixed(1) : "–";
const fmt = v => {
  const num = parseFloat(v);
  if (isNaN(num)) return "–";
  return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
};

// Savings = current - proposed (positive = saving)
function calcSavings(currentT, proposedT) {
  return {
    caustic:      n(currentT.caustic)      - n(proposedT.caustic),
    acid:         n(currentT.acid)         - n(proposedT.acid),
    disinfectant: n(currentT.disinfectant) - n(proposedT.disinfectant),
    water:        n(currentT.water)        - n(proposedT.water),
    time:         n(currentT.time)         - n(proposedT.time),
    energy:       n(currentT.energy)       - n(proposedT.energy),
  };
}

// ─── Styling helpers ──────────────────────────────────────────────────────────
const card = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: "16px 20px", marginBottom: 16,
};
const sectionTitle = {
  fontSize: 13, fontWeight: 600, color: C.green,
  borderBottom: `2px solid ${C.greenLight}`, paddingBottom: 6, marginBottom: 14,
  textTransform: "uppercase", letterSpacing: "0.04em",
};
const labelStyle = { fontSize: 12, color: C.gray, display: "block", marginBottom: 3, fontWeight: 500 };
const inputStyle = {
  width: "100%", fontSize: 13, padding: "6px 8px",
  border: `1px solid ${C.border}`, borderRadius: 6,
  background: "#FAFAF9", color: "#1a1a1a", boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };

function Field({ label, value, onChange, type = "text", options, unit, half, third, required }) {
  const w = third ? "calc(33.3% - 6px)" : half ? "calc(50% - 6px)" : "100%";
  return (
    <div style={{ width: w, marginBottom: 10 }}>
      <label style={labelStyle}>{label}{unit && <span style={{ color: C.amber, marginLeft: 4 }}>({unit})</span>}{required && <span style={{ color: C.red }}> *</span>}</label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14, background: "#F8FAF9", border: `1px solid ${C.greenLight}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.greenMid, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>{children}</div>
    </div>
  );
}

function StepBlock({ title, bgcolor, children }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ background: bgcolor || C.greenLight, padding: "7px 12px", fontSize: 12, fontWeight: 600, color: C.green }}>{title}</div>
      <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "0 12px" }}>{children}</div>
    </div>
  );
}

function MetricCard({ label, value, unit, color, saving }) {
  const isPos = parseFloat(saving) > 0;
  const isNeg = parseFloat(saving) < 0;
  return (
    <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.green }}>{value}</div>
      <div style={{ fontSize: 11, color: C.gray }}>{unit}</div>
      {saving !== undefined && (
        <div style={{ fontSize: 11, marginTop: 4, color: isPos ? C.green : isNeg ? C.red : C.gray }}>
          {isPos ? "▼ " : isNeg ? "▲ " : ""}{Math.abs(parseFloat(saving) || 0).toFixed(1)} {unit} saving
        </div>
      )}
    </div>
  );
}

// ─── CIP Steps form for one mode (current/proposed) ──────────────────────────
function CipStepsForm({ data, onChange, mode }) {
  const f = (key) => (val) => onChange(key, val);
  const accent = mode === "current" ? C.blue : C.green;
  const accentLight = mode === "current" ? C.blueLight : C.greenLight;
  return (
    <div>
      {/* 1 Water pre-rinse */}
      <StepBlock title="1. Water pre-rinse" bgcolor={accentLight}>
        <Field label="Included?" value={data.waterPreRinseIncluded} onChange={f("waterPreRinseIncluded")} options={BOOL_OPTIONS} third />
        <Field label="1.1 Prerun time" unit="min" value={data.waterPrerun_time} onChange={f("waterPrerun_time")} type="number" third />
        <Field label="1.1 Step flow" unit="hl/h" value={data.waterPrerun_flow} onChange={f("waterPrerun_flow")} type="number" third />
        <Field label="1.1 Step volume" unit="hl" value={data.waterPrerun_vol} onChange={f("waterPrerun_vol")} type="number" third />
        <Field label="1.2 Water rinsing intervals" value={data.waterRinsing_intervals} onChange={f("waterRinsing_intervals")} type="number" third />
        <Field label="1.2 Step time" unit="min" value={data.waterRinsing_time} onChange={f("waterRinsing_time")} type="number" third />
        <Field label="1.2 Step flow" unit="hl/h" value={data.waterRinsing_flow} onChange={f("waterRinsing_flow")} type="number" third />
        <Field label="1.2 Step volume" unit="hl" value={data.waterRinsing_vol} onChange={f("waterRinsing_vol")} type="number" third />
        <Field label="1.2 Rest time" unit="min" value={data.waterRinsing_rest} onChange={f("waterRinsing_rest")} type="number" third />
      </StepBlock>

      {/* 2 Caustic rinsing */}
      <StepBlock title="2. Caustic rinsing" bgcolor={accentLight}>
        <Field label="2.1 Caustic prerun time" unit="min" value={data.causticPrerun_time} onChange={f("causticPrerun_time")} type="number" third />
        <Field label="2.1 Step flow" unit="hl/h" value={data.causticPrerun_flow} onChange={f("causticPrerun_flow")} type="number" third />
        <Field label="2.1 Step volume" unit="hl" value={data.causticPrerun_vol} onChange={f("causticPrerun_vol")} type="number" third />
        <Field label="2.2 Caustic tail clean time" unit="min" value={data.causticTailCleaning_time} onChange={f("causticTailCleaning_time")} type="number" third />
        <Field label="2.2 Step flow" unit="hl/h" value={data.causticTailCleaning_flow} onChange={f("causticTailCleaning_flow")} type="number" third />
        <Field label="2.2 Step volume" unit="hl" value={data.causticTailCleaning_vol} onChange={f("causticTailCleaning_vol")} type="number" third />
        <Field label="2.3 Caustic rinsing intervals" value={data.causticRinsing_intervals} onChange={f("causticRinsing_intervals")} type="number" third />
        <Field label="2.3 Step time" unit="min" value={data.causticRinsing_time} onChange={f("causticRinsing_time")} type="number" third />
        <Field label="2.3 Step flow" unit="hl/h" value={data.causticRinsing_flow} onChange={f("causticRinsing_flow")} type="number" third />
        <Field label="2.3 Step volume" unit="hl" value={data.causticRinsing_vol} onChange={f("causticRinsing_vol")} type="number" third />
        <Field label="2.3 Rest time" unit="min" value={data.causticRinsing_rest} onChange={f("causticRinsing_rest")} type="number" third />
        <Field label="2.4 Caustic circulation?" value={data.causticCirculationIncluded} onChange={f("causticCirculationIncluded")} options={BOOL_OPTIONS} third />
        <Field label="2.4 Caustic tank vol before" unit="hl" value={data.causticTankVolBefore} onChange={f("causticTankVolBefore")} type="number" third />
        <Field label="2.4 Caustic tank vol after" unit="hl" value={data.causticTankVolAfter} onChange={f("causticTankVolAfter")} type="number" third />
        <Field label="2.4 Caustic conc before" unit="%w/v" value={data.causticConcBefore} onChange={f("causticConcBefore")} type="number" third />
        <Field label="2.4 Caustic conc after" unit="%w/v" value={data.causticConcAfter} onChange={f("causticConcAfter")} type="number" third />
        <Field label="2.5 Caustic soaking?" value={data.causticSoakingIncluded} onChange={f("causticSoakingIncluded")} options={BOOL_OPTIONS} third />
        <Field label="2.5 Soak volume" unit="hl" value={data.causticSoakVol} onChange={f("causticSoakVol")} type="number" third />
        <Field label="2.5 Soak flow" unit="hl/h" value={data.causticSoakFlow} onChange={f("causticSoakFlow")} type="number" third />
        <Field label="2.5 Soak waiting time" unit="min" value={data.causticSoakWaitTime} onChange={f("causticSoakWaitTime")} type="number" third />
      </StepBlock>

      {/* 2b Intermediate water rinse */}
      <StepBlock title="2b. Intermediate water rinse" bgcolor={accentLight}>
        <Field label="2.1 Water prerun time" unit="min" value={data.intWaterPrerun_time} onChange={f("intWaterPrerun_time")} type="number" third />
        <Field label="2.1 Step flow" unit="hl/h" value={data.intWaterPrerun_flow} onChange={f("intWaterPrerun_flow")} type="number" third />
        <Field label="2.1 Step volume" unit="hl" value={data.intWaterPrerun_vol} onChange={f("intWaterPrerun_vol")} type="number" third />
        <Field label="2.2 Rinsing intervals" value={data.intWaterRinsing_intervals} onChange={f("intWaterRinsing_intervals")} type="number" third />
        <Field label="2.2 Step time" unit="min" value={data.intWaterRinsing_time} onChange={f("intWaterRinsing_time")} type="number" third />
        <Field label="2.2 Step flow" unit="hl/h" value={data.intWaterRinsing_flow} onChange={f("intWaterRinsing_flow")} type="number" third />
        <Field label="2.2 Step volume" unit="hl" value={data.intWaterRinsing_vol} onChange={f("intWaterRinsing_vol")} type="number" third />
        <Field label="2.2 Rest time" unit="min" value={data.intWaterRinsing_rest} onChange={f("intWaterRinsing_rest")} type="number" third />
      </StepBlock>

      {/* 3 Acid rinsing */}
      <StepBlock title="3. Acid rinsing" bgcolor={accentLight}>
        <Field label="Acid tank vol before" unit="hl" value={data.acidTankVolBefore} onChange={f("acidTankVolBefore")} type="number" third />
        <Field label="Acid conc before" unit="%w/v" value={data.acidConcBefore} onChange={f("acidConcBefore")} type="number" third />
        <Field label="3.1 Acid prerun time" unit="min" value={data.acidPrerun_time} onChange={f("acidPrerun_time")} type="number" third />
        <Field label="3.1 Step flow" unit="hl/h" value={data.acidPrerun_flow} onChange={f("acidPrerun_flow")} type="number" third />
        <Field label="3.1 Step volume" unit="hl" value={data.acidPrerun_vol} onChange={f("acidPrerun_vol")} type="number" third />
        <Field label="3.2 Acid tail clean time" unit="min" value={data.acidTailCleaning_time} onChange={f("acidTailCleaning_time")} type="number" third />
        <Field label="3.2 Step flow" unit="hl/h" value={data.acidTailCleaning_flow} onChange={f("acidTailCleaning_flow")} type="number" third />
        <Field label="3.3 Acid rinsing intervals" value={data.acidRinsing_intervals} onChange={f("acidRinsing_intervals")} type="number" third />
        <Field label="3.3 Step time" unit="min" value={data.acidRinsing_time} onChange={f("acidRinsing_time")} type="number" third />
        <Field label="3.3 Step flow" unit="hl/h" value={data.acidRinsing_flow} onChange={f("acidRinsing_flow")} type="number" third />
        <Field label="3.3 Rest time" unit="min" value={data.acidRinsing_rest} onChange={f("acidRinsing_rest")} type="number" third />
        <Field label="Acid tank vol after" unit="hl" value={data.acidTankVolAfter} onChange={f("acidTankVolAfter")} type="number" third />
        <Field label="Acid conc after" unit="%w/v" value={data.acidConcAfter} onChange={f("acidConcAfter")} type="number" third />
      </StepBlock>

      {/* 4 Intermediate water rinse 2 */}
      <StepBlock title="4. Intermediate water rinse" bgcolor={accentLight}>
        <Field label="4.1 Water prerun time" unit="min" value={data.intWater2Prerun_time} onChange={f("intWater2Prerun_time")} type="number" third />
        <Field label="4.1 Step flow" unit="hl/h" value={data.intWater2Prerun_flow} onChange={f("intWater2Prerun_flow")} type="number" third />
        <Field label="4.1 Step volume" unit="hl" value={data.intWater2Prerun_vol} onChange={f("intWater2Prerun_vol")} type="number" third />
        <Field label="4.2 Rinsing intervals" value={data.intWater2Rinsing_intervals} onChange={f("intWater2Rinsing_intervals")} type="number" third />
        <Field label="4.2 Step time" unit="min" value={data.intWater2Rinsing_time} onChange={f("intWater2Rinsing_time")} type="number" third />
        <Field label="4.2 Step flow" unit="hl/h" value={data.intWater2Rinsing_flow} onChange={f("intWater2Rinsing_flow")} type="number" third />
        <Field label="4.2 Step volume" unit="hl" value={data.intWater2Rinsing_vol} onChange={f("intWater2Rinsing_vol")} type="number" third />
        <Field label="4.2 Rest time" unit="min" value={data.intWater2Rinsing_rest} onChange={f("intWater2Rinsing_rest")} type="number" third />
      </StepBlock>

      {/* 5 Disinfection */}
      <StepBlock title="5. Disinfection" bgcolor={accentLight}>
        <Field label="Included?" value={data.disinfectionIncluded} onChange={f("disinfectionIncluded")} options={BOOL_OPTIONS} third />
        <Field label="Solution recovery?" value={data.disinfectionRecovery} onChange={f("disinfectionRecovery")} options={RECOVERY_OPTIONS} third />
        <Field label="Disinfectant tank vol before" unit="hl" value={data.disTankVolBefore} onChange={f("disTankVolBefore")} type="number" third />
        <Field label="Disinfectant conc before" unit="%w/v" value={data.disConcBefore} onChange={f("disConcBefore")} type="number" third />
        <Field label="5.1 Prerun time" unit="min" value={data.disPrerun_time} onChange={f("disPrerun_time")} type="number" third />
        <Field label="5.1 Step flow" unit="hl/h" value={data.disPrerun_flow} onChange={f("disPrerun_flow")} type="number" third />
        <Field label="5.1 Step volume" unit="hl" value={data.disPrerun_vol} onChange={f("disPrerun_vol")} type="number" third />
        <Field label="5.2 Rinsing intervals" value={data.disRinsing_intervals} onChange={f("disRinsing_intervals")} type="number" third />
        <Field label="5.2 Step time" unit="min" value={data.disRinsing_time} onChange={f("disRinsing_time")} type="number" third />
        <Field label="5.2 Step flow" unit="hl/h" value={data.disRinsing_flow} onChange={f("disRinsing_flow")} type="number" third />
        <Field label="5.2 Step volume" unit="hl" value={data.disRinsing_vol} onChange={f("disRinsing_vol")} type="number" third />
        <Field label="5.2 Rest time" unit="min" value={data.disRinsing_rest} onChange={f("disRinsing_rest")} type="number" third />
        <Field label="Disinfectant tank vol after" unit="hl" value={data.disTankVolAfter} onChange={f("disTankVolAfter")} type="number" third />
        <Field label="Disinfectant conc after" unit="%w/v" value={data.disConcAfter} onChange={f("disConcAfter")} type="number" third />
      </StepBlock>

      {/* 6 Final water rinse */}
      <StepBlock title="6. Final water rinse" bgcolor={accentLight}>
        <Field label="6.1 Water prerun time" unit="min" value={data.finalWaterPrerun_time} onChange={f("finalWaterPrerun_time")} type="number" third />
        <Field label="6.1 Step flow" unit="hl/h" value={data.finalWaterPrerun_flow} onChange={f("finalWaterPrerun_flow")} type="number" third />
        <Field label="6.1 Step volume" unit="hl" value={data.finalWaterPrerun_vol} onChange={f("finalWaterPrerun_vol")} type="number" third />
        <Field label="6.2 Rinsing intervals" value={data.finalWaterRinsing_intervals} onChange={f("finalWaterRinsing_intervals")} type="number" third />
        <Field label="6.2 Step time" unit="min" value={data.finalWaterRinsing_time} onChange={f("finalWaterRinsing_time")} type="number" third />
        <Field label="6.2 Step flow" unit="hl/h" value={data.finalWaterRinsing_flow} onChange={f("finalWaterRinsing_flow")} type="number" third />
        <Field label="6.2 Step volume" unit="hl" value={data.finalWaterRinsing_vol} onChange={f("finalWaterRinsing_vol")} type="number" third />
        <Field label="6.2 Rest time" unit="min" value={data.finalWaterRinsing_rest} onChange={f("finalWaterRinsing_rest")} type="number" third />
      </StepBlock>
    </div>
  );
}

// ─── Tank Form ────────────────────────────────────────────────────────────────
function TankForm({ tank, onChange, onRemove, index }) {
  const f = key => val => onChange(index, key, val);
  const fCip = (mode, key, val) => {
    const updated = { ...tank[mode], [key]: val };
    onChange(index, mode, updated);
  };
  const fTotals = (mode, key, val) => {
    const updated = { ...tank[mode+"Totals"], [key]: val };
    onChange(index, mode+"Totals", updated);
  };

  const [cipTab, setCipTab] = useState("current");

  const sv = calcSavings(tank.currentTotals, tank.proposedTotals);

  return (
    <div style={{ ...card, border: `2px solid ${C.greenLight}`, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: C.greenMid, color: "#fff", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
            T{index + 1}
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.green }}>{tank.tankType || "Tank"} {tank.howManyTanks ? `(${tank.howManyTanks} tanks)` : ""}</span>
        </div>
        <button onClick={onRemove} style={{ fontSize: 12, color: C.red, border: `1px solid ${C.red}`, background: C.redLight, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          Remove
        </button>
      </div>

      {/* Baseline info */}
      <div style={sectionTitle}>Baseline Information</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
        <Field label="Tank type" value={tank.tankType} onChange={f("tankType")} options={TANK_TYPES} third />
        <Field label="How many tanks" value={tank.howManyTanks} onChange={f("howManyTanks")} type="number" third />
        <Field label="Gross tank volume" unit="hl" value={tank.grossTankVolume} onChange={f("grossTankVolume")} type="number" third />
        <Field label="Tank diameter" unit="m" value={tank.tankDiameter} onChange={f("tankDiameter")} type="number" third />
        <Field label="Sprayball type" value={tank.spraybAllType} onChange={f("spraybAllType")} options={SPRAYBALL_TYPES} third />
        <Field label="CIP supply pipe DN" unit="mm" value={tank.cipSupplyPipeDN} onChange={f("cipSupplyPipeDN")} type="number" third />
        <Field label="CIP frequency" value={tank.cipFrequency} onChange={f("cipFrequency")} options={CIP_FREQ_OPTIONS} third />
        <Field label="CIP times / year" value={tank.cipTimesYearly} onChange={f("cipTimesYearly")} type="number" third />
        <Field label="Supply pump capacity" unit="KWh" value={tank.supplyPumpKw} onChange={f("supplyPumpKw")} type="number" third />
        <Field label="Return pump capacity" unit="KWh" value={tank.returnPumpKw} onChange={f("returnPumpKw")} type="number" third />
        <Field label="Concentrated caustic" unit="%w/v" value={tank.concentratedCaustic} onChange={f("concentratedCaustic")} type="number" third />
        <Field label="Caustic concentration used" unit="%w/v" value={tank.causticConcentrationUsed} onChange={f("causticConcentrationUsed")} type="number" third />
        <Field label="Caustic CIP tank volume" unit="hl" value={tank.causticCipTankVolume} onChange={f("causticCipTankVolume")} type="number" third />
        <Field label="Acid concentration used" unit="%w/v" value={tank.acidConcentrationUsed} onChange={f("acidConcentrationUsed")} type="number" third />
        <Field label="Acid CIP tank volume" unit="hl" value={tank.acidCipTankVolume} onChange={f("acidCipTankVolume")} type="number" third />
        <Field label="Disinfectant concentration used" unit="%w/v" value={tank.disinfectantConcentrationUsed} onChange={f("disinfectantConcentrationUsed")} type="number" third />
        <Field label="Disinfectant CIP tank volume" unit="hl" value={tank.disinfectantCipTankVolume} onChange={f("disinfectantCipTankVolume")} type="number" third />
      </div>

      <div style={{ ...sectionTitle, marginTop: 8 }}>Proposal settings</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
        <Field label="Caustic concentration (proposal)" unit="%w/v" value={tank.proposalCausticConc} onChange={f("proposalCausticConc")} type="number" third />
        <Field label="Acid & disinfectant conc (proposal)" unit="%w/v" value={tank.proposalAcidDisinfectantConc} onChange={f("proposalAcidDisinfectantConc")} type="number" third />
        <Field label="Disinfectant conc (proposal)" unit="%w/v" value={tank.proposalDisinfectantConc} onChange={f("proposalDisinfectantConc")} type="number" third />
        <Field label="CIP times / year (proposal)" value={tank.proposalCipTimesYearly} onChange={f("proposalCipTimesYearly")} type="number" third />
      </div>

      {/* CIP steps tabs */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: `2px solid ${C.border}` }}>
          {[["current","Current CIP procedure"], ["proposed","Proposal CIP procedure"]].map(([k,lbl]) => (
            <button key={k} onClick={() => setCipTab(k)} style={{
              padding: "7px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: cipTab === k ? (k === "current" ? C.blueLight : C.greenLight) : "transparent",
              color: cipTab === k ? (k === "current" ? C.blue : C.green) : C.gray,
              border: "none", borderBottom: cipTab === k ? `3px solid ${k === "current" ? C.blue : C.green}` : "none",
              borderRadius: "6px 6px 0 0",
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ padding: "14px 0 0" }}>
          {cipTab === "current"
            ? <CipStepsForm data={tank.current} onChange={(k,v) => fCip("current", k, v)} mode="current" />
            : <CipStepsForm data={tank.proposed} onChange={(k,v) => fCip("proposed", k, v)} mode="proposed" />
          }
        </div>
      </div>

      {/* Totals */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionTitle}>Total consumption / CIP</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Current totals", mode: "current", bg: C.blueLight, col: C.blue },
            { label: "Proposed totals (Kersia)", mode: "proposed", bg: C.greenLight, col: C.green },
          ].map(({ label, mode, bg, col }) => (
            <div key={mode} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${col}22` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: col, marginBottom: 8 }}>{label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
                {[["caustic","Caustic 32% (kg)"],["acid","Acid (kg)"],["disinfectant","Disinfectant (kg)"],["water","Water (hl)"],["time","Time (h)"],["energy","Energy (KWh)"]].map(([k, lbl]) => (
                  <div key={k} style={{ width: "calc(33.3% - 6px)", marginBottom: 6 }}>
                    <label style={{ ...labelStyle, color: col }}>{lbl}</label>
                    <input type="number" value={tank[mode+"Totals"][k]} onChange={e => fTotals(mode, k, e.target.value)} style={{ ...inputStyle, borderColor: col + "55" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mini savings summary for this tank */}
        <div style={{ marginTop: 10, background: "#F0FBF5", borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.greenMid}33` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.green, marginBottom: 6 }}>Savings this tank / CIP</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["caustic","Caustic","kg"], ["acid","Acid","kg"], ["disinfectant","Disinfectant","kg"], ["water","Water","hl"], ["time","Time","h"], ["energy","Energy","KWh"]].map(([k,lbl,u]) => {
              const s = sv[k];
              return (
                <div key={k} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                  <span style={{ color: C.gray }}>{lbl}: </span>
                  <span style={{ fontWeight: 600, color: s > 0 ? C.green : s < 0 ? C.red : C.gray }}>{s > 0 ? "▼" : s < 0 ? "▲" : ""} {Math.abs(s).toFixed(1)} {u}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [audits, setAudits] = useState([]);
  const [current, setCurrent] = useState(null); // audit being edited
  const [viewAudit, setViewAudit] = useState(null);

  // ── helpers for editing ──
  function newAudit() {
    const a = blankAudit();
    setCurrent(a);
    setTab("form");
  }

  function editAudit(a) {
    setCurrent(JSON.parse(JSON.stringify(a)));
    setTab("form");
  }

  function saveAudit() {
    if (!current) return;
    const toSave = { ...current, status: "Saved", updatedAt: new Date().toISOString().slice(0,10) };
    setAudits(prev => {
      const idx = prev.findIndex(a => a.id === toSave.id);
      return idx >= 0 ? prev.map((a,i) => i === idx ? toSave : a) : [...prev, toSave];
    });
    setCurrent(null);
    setTab("list");
  }

  function deleteAudit(id) {
    setAudits(prev => prev.filter(a => a.id !== id));
  }

  function updateCurrent(key, val) {
    setCurrent(prev => ({ ...prev, [key]: val }));
  }

  function updateTank(index, key, val) {
    setCurrent(prev => {
      const tanks = [...prev.tanks];
      tanks[index] = { ...tanks[index], [key]: val };
      return { ...prev, tanks };
    });
  }

  function addTank() {
    setCurrent(prev => ({ ...prev, tanks: [...prev.tanks, { ...blankTank(), id: Date.now() }] }));
  }

  function removeTank(index) {
    setCurrent(prev => ({ ...prev, tanks: prev.tanks.filter((_, i) => i !== index) }));
  }

  // ── Dashboard data ──
  const dashData = useMemo(() => {
    if (!audits.length) return null;
    return audits.map(a => {
      const totalSav = a.tanks.reduce((acc, t) => {
        const s = calcSavings(t.currentTotals, t.proposedTotals);
        return {
          caustic: acc.caustic + s.caustic * n(t.cipTimesYearly),
          water:   acc.water   + s.water   * n(t.cipTimesYearly),
          energy:  acc.energy  + s.energy  * n(t.cipTimesYearly),
          time:    acc.time    + s.time    * n(t.cipTimesYearly),
        };
      }, { caustic: 0, water: 0, energy: 0, time: 0 });
      return { name: a.brewery || `Audit ${a.id}`, date: a.createdAt, ...totalSav, tanks: a.tanks.length };
    });
  }, [audits]);

  const TABS = [
    { key: "dashboard", label: "Dashboard",     icon: "ti-layout-dashboard" },
    { key: "list",      label: "Audit history", icon: "ti-list-details" },
    { key: "form",      label: current ? "Edit audit" : "New audit", icon: "ti-edit" },
  ];

  const PIE_C = [C.green, C.blue, C.amber, C.red, C.purple, C.gray];

  return (
    <div style={{ background: C.bg, minHeight: 600, fontFamily: "var(--font-sans)", color: "#1a1a1a", padding: 0 }}>
      <h2 className="sr-only" style={{ position:"absolute", left:"-9999px" }}>Kersia CIP Audit App</h2>

      {/* ── Top header ── */}
      <div style={{ background: C.green, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-droplet-half-2" style={{ color: "#fff", fontSize: 20 }} aria-hidden="true"></i>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>KERSIA</span>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>CIP Audit & TCO Calculator</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Tank CIP monitoring — Brewery audit tool</div>
          </div>
        </div>
        <button onClick={newAudit} style={{ background: "#fff", color: C.green, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true"></i> New audit
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { if (t.key !== "form" || current) setTab(t.key); }}
            style={{ padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "transparent", border: "none",
              borderBottom: tab === t.key ? `3px solid ${C.green}` : "3px solid transparent",
              color: tab === t.key ? C.green : C.gray, opacity: (t.key === "form" && !current) ? 0.4 : 1,
            }}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 5, fontSize: 14 }} aria-hidden="true"></i>{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div>
            {!audits.length ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.gray }}>
                <i className="ti ti-chart-bar" style={{ fontSize: 48, display: "block", marginBottom: 12 }} aria-hidden="true"></i>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No audits yet</div>
                <div style={{ fontSize: 13 }}>Create your first audit to see the dashboard.</div>
                <button onClick={newAudit} style={{ marginTop: 16, background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                  Start new audit
                </button>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  <MetricCard label="Total audits" value={audits.length} unit="breweries" color={C.green} />
                  <MetricCard label="Total tank systems" value={audits.reduce((s,a) => s + a.tanks.length, 0)} unit="systems" color={C.blue} />
                  <MetricCard label="Total caustic saving" value={fmt(dashData.reduce((s,d) => s + (d.caustic||0), 0).toFixed(0))} unit="kg/year" color={C.greenMid} />
                  <MetricCard label="Total water saving" value={fmt(dashData.reduce((s,d) => s + (d.water||0), 0).toFixed(0))} unit="hl/year" color={C.blue} />
                  <MetricCard label="Total time saving" value={fmt(dashData.reduce((s,d) => s + (d.time||0), 0).toFixed(1))} unit="h/year" color={C.amber} />
                  <MetricCard label="Total energy saving" value={fmt(dashData.reduce((s,d) => s + (d.energy||0), 0).toFixed(0))} unit="KWh/year" color={C.purple} />
                </div>

                {/* Charts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: C.green }}>Caustic saving / brewery (kg/year)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dashData} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="caustic" name="Caustic saving (kg)" fill={C.greenMid} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: C.blue }}>Water saving / brewery (hl/year)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dashData} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="water" name="Water saving (hl)" fill={C.blue} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Audit list mini-table */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.green }}>Recent audits</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.grayLight }}>
                        {["Brewery","Date","Capacity (hl)","Tanks","Caustic saving (kg/yr)","Water saving (hl/yr)","Actions"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: C.gray, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map(a => {
                        const totalCaustic = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).caustic * n(t.cipTimesYearly), 0);
                        const totalWater   = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).water   * n(t.cipTimesYearly), 0);
                        return (
                          <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600 }}>{a.brewery || "–"}</td>
                            <td style={{ padding: "8px 10px", color: C.gray }}>{a.createdAt}</td>
                            <td style={{ padding: "8px 10px" }}>{a.capacity || "–"} {a.capacityUnit}</td>
                            <td style={{ padding: "8px 10px" }}>{a.tanks.length}</td>
                            <td style={{ padding: "8px 10px", color: totalCaustic > 0 ? C.green : C.red, fontWeight: 600 }}>{totalCaustic.toFixed(1)}</td>
                            <td style={{ padding: "8px 10px", color: totalWater > 0 ? C.green : C.red, fontWeight: 600 }}>{totalWater.toFixed(1)}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <button onClick={() => editAudit(a)} style={{ fontSize: 11, padding: "3px 8px", cursor: "pointer", marginRight: 4, borderRadius: 5 }}>Edit</button>
                              <button onClick={() => { setViewAudit(a); setTab("view"); }} style={{ fontSize: 11, padding: "3px 8px", cursor: "pointer", background: C.blueLight, color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5 }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ AUDIT LIST ═══ */}
        {tab === "list" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Audit history ({audits.length})</div>
              <button onClick={newAudit} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                <i className="ti ti-plus" style={{ marginRight: 5 }} aria-hidden="true"></i>New audit
              </button>
            </div>
            {!audits.length ? (
              <div style={{ ...card, textAlign: "center", padding: 40, color: C.gray }}>
                No saved audits yet. Click "New audit" to start.
              </div>
            ) : (
              audits.map(a => {
                const totalCausticSaving = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).caustic * n(t.cipTimesYearly), 0);
                const totalWaterSaving   = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).water   * n(t.cipTimesYearly), 0);
                const totalEnergySaving  = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).energy  * n(t.cipTimesYearly), 0);
                const totalTimeSaving    = a.tanks.reduce((s,t) => s + calcSavings(t.currentTotals, t.proposedTotals).time    * n(t.cipTimesYearly), 0);
                return (
                  <div key={a.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{a.brewery || "(No brewery name)"}</div>
                        <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                          Saved: {a.updatedAt || a.createdAt} &nbsp;|&nbsp; {a.capacity} {a.capacityUnit} capacity &nbsp;|&nbsp; {a.tanks.length} tank system(s)
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setViewAudit(a); setTab("view"); }} style={{ fontSize: 12, padding: "5px 12px", cursor: "pointer", borderRadius: 6, background: C.blueLight, color: C.blue, border: `1px solid ${C.blue}` }}>View</button>
                        <button onClick={() => editAudit(a)} style={{ fontSize: 12, padding: "5px 12px", cursor: "pointer", borderRadius: 6 }}>Edit</button>
                        <button onClick={() => deleteAudit(a.id)} style={{ fontSize: 12, padding: "5px 12px", cursor: "pointer", borderRadius: 6, background: C.redLight, color: C.red, border: `1px solid ${C.red}` }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[
                        ["Caustic saving", totalCausticSaving.toFixed(1), "kg/yr", C.green],
                        ["Water saving", totalWaterSaving.toFixed(1), "hl/yr", C.blue],
                        ["Energy saving", totalEnergySaving.toFixed(1), "KWh/yr", C.amber],
                        ["Time saving", totalTimeSaving.toFixed(1), "h/yr", C.purple],
                      ].map(([lbl, val, unit, col]) => (
                        <div key={lbl} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                          <span style={{ color: C.gray }}>{lbl}: </span>
                          <span style={{ fontWeight: 700, color: parseFloat(val) > 0 ? col : C.red }}>{parseFloat(val) > 0 ? "▼ " : parseFloat(val) < 0 ? "▲ " : ""}{Math.abs(parseFloat(val))} {unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══ AUDIT FORM ═══ */}
        {tab === "form" && current && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>
                  {audits.find(a => a.id === current.id) ? "Edit audit" : "New audit"}
                </div>
                <div style={{ fontSize: 12, color: C.gray }}>Fill in all fields from the TCO calculator — Kersia proposal</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCurrent(null); setTab("list"); }}
                  style={{ fontSize: 13, padding: "8px 16px", cursor: "pointer", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff" }}>
                  Cancel
                </button>
                <button onClick={saveAudit}
                  style={{ fontSize: 13, padding: "8px 20px", cursor: "pointer", borderRadius: 8, background: C.green, color: "#fff", border: "none", fontWeight: 700 }}>
                  <i className="ti ti-device-floppy" style={{ marginRight: 5 }} aria-hidden="true"></i>Save audit
                </button>
              </div>
            </div>

            {/* Overview */}
            <div style={card}>
              <div style={sectionTitle}>Brewery overview</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                <Field label="Brewery name" value={current.brewery} onChange={v => updateCurrent("brewery", v)} half required />
                <Field label="Capacity" unit="hl" value={current.capacity} onChange={v => updateCurrent("capacity", v)} type="number" half />
              </div>

              <div style={sectionTitle}>Rate utilities</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                <Field label="Currency" value={current.currency} onChange={v => updateCurrent("currency", v)} options={["EUR","USD","VND","Other"]} third />
                <Field label="Water rate" unit="per m³" value={current.rateWater} onChange={v => updateCurrent("rateWater", v)} type="number" third />
                <Field label="Electricity rate" unit="per kWh" value={current.rateEle} onChange={v => updateCurrent("rateEle", v)} type="number" third />
                <Field label="Heat rate" unit="per GJ" value={current.rateHeat} onChange={v => updateCurrent("rateHeat", v)} type="number" third />
                <Field label="Caustic 32% rate" unit="per kg" value={current.rateCaustic32} onChange={v => updateCurrent("rateCaustic32", v)} type="number" third />
                <Field label="Caustic 50% rate" unit="per kg" value={current.rateCaustic50} onChange={v => updateCurrent("rateCaustic50", v)} type="number" third />
                <Field label="Acid rate" unit="per kg" value={current.rateAcid} onChange={v => updateCurrent("rateAcid", v)} type="number" third />
                <Field label="Disinfectant rate" unit="per kg" value={current.rateDisinfectant} onChange={v => updateCurrent("rateDisinfectant", v)} type="number" third />
                <Field label="Proposed acid & disinfectant rate" unit="per kg" value={current.rateProposedAcidDisinfectant} onChange={v => updateCurrent("rateProposedAcidDisinfectant", v)} type="number" third />
                <Field label="Exchange rate 1 EUR =" value={current.exchangeRate} onChange={v => updateCurrent("exchangeRate", v)} type="number" third />
              </div>
            </div>

            {/* Tank systems */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Tank systems ({current.tanks.length})</div>
              <button onClick={addTank} style={{ background: C.greenLight, color: C.green, border: `1px solid ${C.greenMid}`, borderRadius: 8, padding: "7px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                <i className="ti ti-plus" style={{ marginRight: 4 }} aria-hidden="true"></i>Add tank system
              </button>
            </div>

            {current.tanks.map((t, i) => (
              <TankForm key={t.id} tank={t} index={i} onChange={updateTank} onRemove={() => removeTank(i)} />
            ))}

            {/* Notes */}
            <div style={card}>
              <div style={sectionTitle}>Notes & observations</div>
              <textarea value={current.notes} onChange={e => updateCurrent("notes", e.target.value)}
                rows={4} style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Ghi chú kỹ thuật, nhận xét, đề nghị Kersia..." />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 20 }}>
              <button onClick={() => { setCurrent(null); setTab("list"); }} style={{ fontSize: 13, padding: "10px 20px", cursor: "pointer", borderRadius: 8 }}>Cancel</button>
              <button onClick={saveAudit} style={{ fontSize: 13, padding: "10px 24px", cursor: "pointer", borderRadius: 8, background: C.green, color: "#fff", border: "none", fontWeight: 700 }}>
                <i className="ti ti-device-floppy" style={{ marginRight: 5 }} aria-hidden="true"></i>Save audit
              </button>
            </div>
          </div>
        )}

        {/* ═══ VIEW AUDIT ═══ */}
        {tab === "view" && viewAudit && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{viewAudit.brewery || "(No brewery name)"}</div>
                <div style={{ fontSize: 12, color: C.gray }}>Audit date: {viewAudit.createdAt} | Capacity: {viewAudit.capacity} {viewAudit.capacityUnit}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => editAudit(viewAudit)} style={{ fontSize: 13, padding: "8px 16px", cursor: "pointer", borderRadius: 8 }}>Edit</button>
                <button onClick={() => setTab("list")} style={{ fontSize: 13, padding: "8px 16px", cursor: "pointer", borderRadius: 8 }}>Back</button>
              </div>
            </div>

            {/* Utilities rates */}
            <div style={card}>
              <div style={sectionTitle}>Utility rates ({viewAudit.currency})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["Water", viewAudit.rateWater, "per m³"],
                  ["Electricity", viewAudit.rateEle, "per kWh"],
                  ["Heat", viewAudit.rateHeat, "per GJ"],
                  ["Caustic 32%", viewAudit.rateCaustic32, "per kg"],
                  ["Caustic 50%", viewAudit.rateCaustic50, "per kg"],
                  ["Acid", viewAudit.rateAcid, "per kg"],
                  ["Disinfectant", viewAudit.rateDisinfectant, "per kg"],
                ].map(([lbl, v, u]) => v ? (
                  <div key={lbl} style={{ background: C.grayLight, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                    <span style={{ color: C.gray }}>{lbl}: </span><strong>{v} {viewAudit.currency}/{u.replace("per ","")}</strong>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Per tank summary */}
            {viewAudit.tanks.map((t, i) => {
              const sv = calcSavings(t.currentTotals, t.proposedTotals);
              const yearly = k => (sv[k] * n(t.cipTimesYearly)).toFixed(1);
              return (
                <div key={t.id} style={card}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>
                    {t.tankType} — {t.howManyTanks || "?"} tank(s), {t.grossTankVolume || "?"} hl each
                  </div>
                  <div style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>
                    CIP {t.cipTimesYearly} times/year | Supply pump {t.supplyPumpKw} KWh | Return pump {t.returnPumpKw} KWh
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    {[
                      { label: "Caustic (current)", val: t.currentTotals.caustic, unit: "kg/CIP", color: C.blue },
                      { label: "Caustic (Kersia proposal)", val: t.proposedTotals.caustic, unit: "kg/CIP", color: C.green },
                      { label: "Caustic saving/year", val: yearly("caustic"), unit: "kg/yr", color: parseFloat(yearly("caustic")) >= 0 ? C.green : C.red },
                      { label: "Water (current)", val: t.currentTotals.water, unit: "hl/CIP", color: C.blue },
                      { label: "Water (Kersia proposal)", val: t.proposedTotals.water, unit: "hl/CIP", color: C.green },
                      { label: "Water saving/year", val: yearly("water"), unit: "hl/yr", color: parseFloat(yearly("water")) >= 0 ? C.green : C.red },
                      { label: "Time (current)", val: t.currentTotals.time, unit: "h/CIP", color: C.blue },
                      { label: "Time (Kersia proposal)", val: t.proposedTotals.time, unit: "h/CIP", color: C.green },
                      { label: "Time saving/year", val: yearly("time"), unit: "h/yr", color: parseFloat(yearly("time")) >= 0 ? C.green : C.red },
                      { label: "Energy (current)", val: t.currentTotals.energy, unit: "KWh/CIP", color: C.blue },
                      { label: "Energy (Kersia proposal)", val: t.proposedTotals.energy, unit: "KWh/CIP", color: C.green },
                      { label: "Energy saving/year", val: yearly("energy"), unit: "KWh/yr", color: parseFloat(yearly("energy")) >= 0 ? C.green : C.red },
                    ].map((m,j) => (
                      <div key={j} style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, color: C.gray }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.val || "–"}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{m.unit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Current vs proposed chart */}
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={[
                      { name: "Caustic (kg)", current: n(t.currentTotals.caustic), proposed: n(t.proposedTotals.caustic) },
                      { name: "Water (hl)", current: n(t.currentTotals.water), proposed: n(t.proposedTotals.water) },
                      { name: "Time (h)", current: n(t.currentTotals.time), proposed: n(t.proposedTotals.time) },
                      { name: "Energy (KWh)", current: n(t.currentTotals.energy) / 10, proposed: n(t.proposedTotals.energy) / 10 },
                    ]} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="current" name="Current" fill={C.blue} radius={[3,3,0,0]} />
                      <Bar dataKey="proposed" name="Kersia proposal" fill={C.green} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}

            {/* Notes */}
            {viewAudit.notes && (
              <div style={card}>
                <div style={sectionTitle}>Notes</div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "#333" }}>{viewAudit.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: C.green, color: "rgba(255,255,255,0.75)", fontSize: 11, padding: "10px 20px", display: "flex", justifyContent: "space-between" }}>
        <span>Kersia Vietnam — CIP Audit & TCO Calculator v1.0</span>
        <span>Caustic · Acid (ATR B) · Disinfectant (SOPUROXID 15)</span>
      </div>
    </div>
  );
}
