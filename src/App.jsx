import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Plus, Download, Upload, Copy, Trash2, Calculator } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Separator, Checkbox, Select, Tabs } from "./ui.jsx";

const STORAGE_KEY = "mortgage_scenario_comparator_v1";

const money = (n) => {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

const pct = (n, digits = 3) => {
  if (!isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
};

const num = (v) => {
  const x = typeof v === "string" ? v.replace(/[^0-9.\-]/g, "") : v;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

function monthlyRate(apr) {
  return apr / 12;
}

function pmt(principal, apr, months) {
  const r = monthlyRate(apr);
  if (months <= 0) return 0;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

function amortSchedule({ principal, apr, months, extraMonthly = 0, maxRows = 360 }) {
  const base = pmt(principal, apr, months);
  let bal = principal;
  let cumI = 0;
  const rows = [];
  for (let m = 1; m <= months && bal > 0.005 && m <= maxRows; m++) {
    const r = monthlyRate(apr);
    const interest = bal * r;
    const pay = Math.min(base + extraMonthly, bal + interest);
    const principalPaid = Math.max(0, pay - interest);
    bal = Math.max(0, bal - principalPaid);
    cumI += interest;
    rows.push({ m, payment: pay, interest, principalPaid, balance: bal, cumulativeInterest: cumI });
  }
  return { basePayment: base, rows };
}

function annualToMonthly(amount, cadence) {
  const a = num(amount);
  return cadence === "annual" ? a / 12 : a;
}

function calcScenario(s) {
  const price = num(s.price);
  const down = s.downMode === "percent" ? (price * num(s.downPercent)) / 100 : num(s.downDollars);
  const loanAmount = Math.max(0, price - down);

  const apr = num(s.ratePercent) / 100;
  const months = Math.round(num(s.termYears) * 12);

  const pointsPct = num(s.pointsPercent) / 100;
  const pointsCost = loanAmount * pointsPct;
  const pointsFinanced = !!s.pointsFinanced;

  const financedPrincipal = pointsFinanced ? loanAmount + pointsCost : loanAmount;

  const { basePayment, rows } = amortSchedule({
    principal: financedPrincipal,
    apr,
    months,
    extraMonthly: num(s.extraMonthly),
    maxRows: months,
  });

  const taxesM = annualToMonthly(s.propertyTaxes, s.propertyTaxesCadence);
  const insM = annualToMonthly(s.homeownersInsurance, s.homeownersInsuranceCadence);
  const hoaM = annualToMonthly(s.hoa, s.hoaCadence);
  const pmiM = s.includePMI ? annualToMonthly(s.pmi, s.pmiCadence) : 0;

  const piti = basePayment + taxesM + insM;
  const totalMonthly = piti + hoaM + pmiM;

  const last = rows[rows.length - 1] || { cumulativeInterest: 0 };
  const totalInterest = last.cumulativeInterest;

  return {
    loanAmount,
    down,
    basePayment,
    taxesM,
    insM,
    hoaM,
    pmiM,
    piti,
    totalMonthly,
    pointsCost,
    pointsFinanced,
    rows,
    payoffMonths: rows.length,
    totalInterest,
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_SCENARIO = {
  name: "Scenario 1",
  price: "1350000",
  downMode: "percent",
  downPercent: "20",
  downDollars: "270000",
  ratePercent: "6.25",
  termYears: "30",
  pointsPercent: "0",
  pointsFinanced: false,
  extraMonthly: "0",
  propertyTaxes: "0",
  propertyTaxesCadence: "annual",
  homeownersInsurance: "0",
  homeownersInsuranceCadence: "annual",
  hoa: "0",
  hoaCadence: "monthly",
  includePMI: false,
  pmi: "0",
  pmiCadence: "monthly",
  notes: "",
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.scenarios)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-3">
        <Label className="text-sm">{label}</Label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [scenarios, setScenarios] = useState(() => {
    const st = loadState();
    if (st?.scenarios?.length) return st.scenarios;
    return [{ id: uid(), ...DEFAULT_SCENARIO }];
  });

  const [selectedId, setSelectedId] = useState(() => {
    const st = loadState();
    return st?.selectedId || null;
  });

  const [tab, setTab] = useState("compare");

  const selected = useMemo(() => scenarios.find((s) => s.id === selectedId) || scenarios[0], [scenarios, selectedId]);

  useEffect(() => {
    if (!selectedId && scenarios[0]) setSelectedId(scenarios[0].id);
  }, [selectedId, scenarios]);

  useEffect(() => {
    saveState({ scenarios, selectedId });
  }, [scenarios, selectedId]);

  const computed = useMemo(() => {
    const map = new Map();
    for (const s of scenarios) map.set(s.id, calcScenario(s));
    return map;
  }, [scenarios]);

  const baselineId = scenarios[0]?.id;

  function updateSelected(patch) {
    setScenarios((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  }

  function addScenario() {
    const base = selected || scenarios[0];
    const n = scenarios.length + 1;
    const copy = { ...base, id: uid(), name: `Scenario ${n}` };
    setScenarios((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function duplicateScenario() {
    const base = selected;
    const copy = { ...base, id: uid(), name: `${base.name} (copy)` };
    setScenarios((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function deleteScenario(id) {
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.length ? next : [{ id: uid(), ...DEFAULT_SCENARIO }];
    });
    if (selectedId === id) {
      const next = scenarios.find((s) => s.id !== id) || scenarios[0];
      setSelectedId(next?.id || null);
    }
  }

  const comparisonRows = useMemo(() => {
    const base = baselineId ? computed.get(baselineId) : null;
    return scenarios.map((s) => {
      const c = computed.get(s.id);
      const upfront = c.pointsFinanced ? 0 : c.pointsCost;
      const monthlySavings = base ? base.totalMonthly - c.totalMonthly : 0;
      const breakevenMonths = monthlySavings > 0.01 ? upfront / monthlySavings : Infinity;
      const deltaMonthly = base ? c.totalMonthly - base.totalMonthly : 0;

      return {
        id: s.id,
        name: s.name,
        rate: num(s.ratePercent) / 100,
        termYears: num(s.termYears),
        points: num(s.pointsPercent) / 100,
        pointsCost: c.pointsCost,
        pointsFinanced: c.pointsFinanced,
        loan: c.loanAmount,
        pi: c.basePayment,
        taxesM: c.taxesM,
        insM: c.insM,
        hoaM: c.hoaM,
        pmiM: c.pmiM,
        total: c.totalMonthly,
        deltaMonthly,
        breakevenMonths,
        totalInterest: c.totalInterest,
      };
    });
  }, [scenarios, computed, baselineId]);

  const chartData = useMemo(() => {
    const maxM = Math.max(...scenarios.map((s) => computed.get(s.id)?.rows?.length || 0), 0);
    const cap = Math.min(maxM, 360);
    const byId = scenarios.map((s) => ({
      name: s.name,
      rows: computed.get(s.id)?.rows || [],
    }));

    const out = [];
    for (let m = 1; m <= cap; m++) {
      const row = { m };
      for (const sc of byId) row[sc.name] = sc.rows[m - 1] ? sc.rows[m - 1].balance : 0;
      out.push(row);
    }
    return out;
  }, [scenarios, computed]);

  function exportJSON() {
    const payload = { scenarios, selectedId, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mortgage-scenarios.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!parsed?.scenarios?.length) return;

        const normalized = parsed.scenarios.map((s, i) => ({
          id: s.id || uid(),
          ...DEFAULT_SCENARIO,
          ...s,
          price: String(s.price ?? DEFAULT_SCENARIO.price),
          downPercent: String(s.downPercent ?? DEFAULT_SCENARIO.downPercent),
          downDollars: String(s.downDollars ?? DEFAULT_SCENARIO.downDollars),
          ratePercent: String(s.ratePercent ?? DEFAULT_SCENARIO.ratePercent),
          termYears: String(s.termYears ?? DEFAULT_SCENARIO.termYears),
          pointsPercent: String(s.pointsPercent ?? DEFAULT_SCENARIO.pointsPercent),
          extraMonthly: String(s.extraMonthly ?? DEFAULT_SCENARIO.extraMonthly),
          propertyTaxes: String(s.propertyTaxes ?? DEFAULT_SCENARIO.propertyTaxes),
          homeownersInsurance: String(s.homeownersInsurance ?? DEFAULT_SCENARIO.homeownersInsurance),
          hoa: String(s.hoa ?? DEFAULT_SCENARIO.hoa),
          pmi: String(s.pmi ?? DEFAULT_SCENARIO.pmi),
          name: s.name || `Scenario ${i + 1}`,
        }));

        setScenarios(normalized);
        setSelectedId(parsed.selectedId || normalized[0].id);
      } catch {}
    };
    reader.readAsText(file);
  }

  const selComputed = selected ? computed.get(selected.id) : null;

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Mortgage Scenario Comparator</h1>
            </div>
            <p className="text-sm text-slate-600">
              Add scenarios, tweak rates/points/fees, and compare total monthly cost + interest. Saved locally in your browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={addScenario} className="gap-2">
              <Plus className="h-4 w-4" /> Add
            </Button>
            <Button variant="secondary" onClick={duplicateScenario} className="gap-2">
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Button variant="outline" onClick={exportJSON} className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>

            <label className="inline-block">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSON(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" /> Import
              </Button>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {scenarios.map((s, idx) => {
                  const c = computed.get(s.id);
                  const selectedNow = s.id === selected?.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition hover:shadow-sm ${
                        selectedNow ? "border-slate-900/30 shadow-sm" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">
                            {idx === 0 ? "★ " : ""}
                            {s.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {pct(num(s.ratePercent) / 100, 3)} · {num(s.termYears)}y · points{" "}
                            {pct(num(s.pointsPercent) / 100, 3)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{money(c?.totalMonthly || 0)}/mo</div>
                          <div className="text-xs text-slate-600">P&I {money(c?.basePayment || 0)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-slate-100 p-3 text-xs text-slate-600">
                Baseline is the first scenario (★). Breakeven comparisons are vs baseline.
              </div>

              <Separator />

              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => deleteScenario(selected?.id)}
                disabled={scenarios.length <= 1}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Edit: {selected?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? null : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Scenario name">
                      <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
                    </Field>

                    <Field label="Purchase price">
                      <Input inputMode="decimal" value={selected.price} onChange={(e) => updateSelected({ price: e.target.value })} />
                    </Field>

                    <Field label="Down payment" hint={selected.downMode === "percent" ? "% of price" : "dollars"}>
                      <div className="flex gap-2">
                        <Select value={selected.downMode} onChange={(v) => updateSelected({ downMode: v })} className="w-[140px]">
                          <option value="percent">Percent</option>
                          <option value="dollars">Dollars</option>
                        </Select>
                        {selected.downMode === "percent" ? (
                          <Input inputMode="decimal" step="0.01" value={selected.downPercent} onChange={(e) => updateSelected({ downPercent: e.target.value })} />
                        ) : (
                          <Input inputMode="decimal" value={selected.downDollars} onChange={(e) => updateSelected({ downDollars: e.target.value })} />
                        )}
                      </div>
                    </Field>

                    <Field label="Interest rate (APR)" hint="% (decimals allowed, e.g. 6.25)">
                      <Input inputMode="decimal" step="0.001" value={selected.ratePercent} onChange={(e) => updateSelected({ ratePercent: e.target.value })} />
                    </Field>

                    <Field label="Term" hint="years">
                      <Input inputMode="decimal" step="0.5" value={selected.termYears} onChange={(e) => updateSelected({ termYears: e.target.value })} />
                    </Field>

                    <Field label="Points" hint="% of loan (decimals allowed, e.g. 0.875)">
                      <Input inputMode="decimal" step="0.001" value={selected.pointsPercent} onChange={(e) => updateSelected({ pointsPercent: e.target.value })} />
                    </Field>

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                      <Checkbox checked={!!selected.pointsFinanced} onChange={(v) => updateSelected({ pointsFinanced: !!v })} id="pointsFinanced" />
                      <div className="space-y-0.5">
                        <Label htmlFor="pointsFinanced" className="text-sm">Finance points into loan</Label>
                        <div className="text-xs text-slate-600">If off, points are treated as upfront cash.</div>
                      </div>
                    </div>

                    <Field label="Extra principal" hint="$ / month">
                      <Input inputMode="decimal" value={selected.extraMonthly} onChange={(e) => updateSelected({ extraMonthly: e.target.value })} />
                    </Field>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Property taxes" hint={selected.propertyTaxesCadence === "annual" ? "$ / year" : "$ / month"}>
                      <div className="flex gap-2">
                        <Select value={selected.propertyTaxesCadence} onChange={(v) => updateSelected({ propertyTaxesCadence: v })} className="w-[140px]">
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                        </Select>
                        <Input inputMode="decimal" value={selected.propertyTaxes} onChange={(e) => updateSelected({ propertyTaxes: e.target.value })} />
                      </div>
                    </Field>

                    <Field label="Homeowners insurance" hint={selected.homeownersInsuranceCadence === "annual" ? "$ / year" : "$ / month"}>
                      <div className="flex gap-2">
                        <Select value={selected.homeownersInsuranceCadence} onChange={(v) => updateSelected({ homeownersInsuranceCadence: v })} className="w-[140px]">
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                        </Select>
                        <Input inputMode="decimal" value={selected.homeownersInsurance} onChange={(e) => updateSelected({ homeownersInsurance: e.target.value })} />
                      </div>
                    </Field>

                    <Field label="HOA" hint={selected.hoaCadence === "annual" ? "$ / year" : "$ / month"}>
                      <div className="flex gap-2">
                        <Select value={selected.hoaCadence} onChange={(v) => updateSelected({ hoaCadence: v })} className="w-[140px]">
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                        </Select>
                        <Input inputMode="decimal" value={selected.hoa} onChange={(e) => updateSelected({ hoa: e.target.value })} />
                      </div>
                    </Field>

                    <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={!!selected.includePMI} onChange={(v) => updateSelected({ includePMI: !!v })} id="includePMI" />
                        <Label htmlFor="includePMI" className="text-sm">Include PMI</Label>
                      </div>

                      <div className={`grid grid-cols-1 gap-2 ${selected.includePMI ? "" : "opacity-50"}`}>
                        <div className="flex gap-2">
                          <Select value={selected.pmiCadence} onChange={(v) => updateSelected({ pmiCadence: v })} className="w-[140px]" disabled={!selected.includePMI}>
                            <option value="monthly">Monthly</option>
                            <option value="annual">Annual</option>
                          </Select>
                          <Input inputMode="decimal" value={selected.pmi} onChange={(e) => updateSelected({ pmi: e.target.value })} disabled={!selected.includePMI} />
                        </div>
                        <div className="text-xs text-slate-600">PMI is treated as a flat amount (it does not auto-drop at 78–80% LTV).</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600">Loan amount</div>
                        <div className="text-lg font-semibold">{money(selComputed?.loanAmount || 0)}</div>
                        <div className="mt-1 text-xs text-slate-600">Down {money(selComputed?.down || 0)}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Points {selComputed?.pointsFinanced ? "(financed)" : ""} {money(selComputed?.pointsCost || 0)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Cash to close (min) {money((selComputed?.down || 0) + (selComputed?.pointsFinanced ? 0 : (selComputed?.pointsCost || 0)))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600">P&I payment</div>
                        <div className="text-lg font-semibold">{money(selComputed?.basePayment || 0)}/mo</div>
                        <div className="mt-1 text-xs text-slate-600">Payoff ~{selComputed?.payoffMonths || 0} months</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600">Total monthly (PITI + HOA + PMI)</div>
                        <div className="text-lg font-semibold">{money(selComputed?.totalMonthly || 0)}/mo</div>
                        <div className="mt-1 text-xs text-slate-600">Interest total {money(selComputed?.totalInterest || 0)}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: "compare", label: "Compare" }, { value: "charts", label: "Charts" }]} />
          <div className="text-xs text-slate-600">Charts show remaining balance (first 360 months).</div>
        </div>

        {tab === "compare" ? (
          <Card>
            <CardHeader>
              <CardTitle>Scenario comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Rate</th>
                      <th className="py-2 pr-3">Term</th>
                      <th className="py-2 pr-3">Points</th>
                      <th className="py-2 pr-3">Upfront points</th>
                      <th className="py-2 pr-3">P&I</th>
                      <th className="py-2 pr-3">Taxes</th>
                      <th className="py-2 pr-3">Ins</th>
                      <th className="py-2 pr-3">HOA</th>
                      <th className="py-2 pr-3">PMI</th>
                      <th className="py-2 pr-3">Total / mo</th>
                      <th className="py-2 pr-3">Δ vs baseline</th>
                      <th className="py-2 pr-3">Breakeven</th>
                      <th className="py-2 pr-3">Total interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-200 align-top">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{r.id === baselineId ? "★ " : ""}{r.name}</div>
                          <div className="text-xs text-slate-600">Loan {money(r.loan)}</div>
                        </td>
                        <td className="py-2 pr-3">{pct(r.rate, 3)}</td>
                        <td className="py-2 pr-3">{r.termYears}y</td>
                        <td className="py-2 pr-3">{pct(r.points, 3)}</td>
                        <td className="py-2 pr-3">{r.pointsFinanced ? <span className="text-xs text-slate-600">Financed</span> : money(r.pointsCost)}</td>
                        <td className="py-2 pr-3">{money(r.pi)}</td>
                        <td className="py-2 pr-3">{money(r.taxesM)}</td>
                        <td className="py-2 pr-3">{money(r.insM)}</td>
                        <td className="py-2 pr-3">{money(r.hoaM)}</td>
                        <td className="py-2 pr-3">{money(r.pmiM)}</td>
                        <td className="py-2 pr-3 font-semibold">{money(r.total)}</td>
                        <td className={`py-2 pr-3 ${r.id === baselineId ? "text-slate-600" : r.deltaMonthly > 0 ? "text-red-600" : "text-green-600"}`}>
                          {r.id === baselineId ? "—" : `${r.deltaMonthly > 0 ? "+" : ""}${money(r.deltaMonthly)}`}
                        </td>
                        <td className="py-2 pr-3">
                          {r.id === baselineId ? "—" : !isFinite(r.breakevenMonths) ? (
                            <span className="text-xs text-slate-600">No breakeven</span>
                          ) : (
                            <span>
                              {Math.ceil(r.breakevenMonths)} mo
                              <div className="text-xs text-slate-600">(~{(r.breakevenMonths / 12).toFixed(1)}y)</div>
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">{money(r.totalInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-100 p-3 text-xs text-slate-600">
                Breakeven = <b>upfront points</b> (if not financed) ÷ <b>monthly savings vs baseline</b>.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Balance over time (first 360 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="m" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v)}
                    />
                    <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(m) => `Month ${m}`} />
                    <Legend />
                    {scenarios.map((s) => (
                      <Line key={s.id} type="monotone" dataKey={s.name} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Deploy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div><b>Run:</b> <code>npm install</code>, then <code>npm run dev</code></div>
            <div><b>Build:</b> <code>npm run build</code> (output in <code>dist/</code>)</div>
            <div><b>Static deploy:</b> upload <code>dist/</code> to Netlify/Vercel/S3/Cloudflare Pages.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
