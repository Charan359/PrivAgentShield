import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Panel } from "@/components/primitives";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sensitivity-config")({
  head: () => ({
    meta: [
      { title: "Sensitivity Taxonomy — PrivAgentShield" },
      { name: "description", content: "Configurable sensitivity taxonomy and severity level weights (L1=0.1, L2=0.3, L3=0.7, L4=1.0) according to the paper." },
    ],
  }),
  component: SensitivityConfigPage,
});

export type SensitivityCategory = {
  id: string;
  name: string;
  level: "L1" | "L2" | "L3" | "L4";
  description: string;
  examples: string[];
  isCustom?: boolean;
};

const DEFAULT_TAXONOMY: SensitivityCategory[] = [
  {
    id: "cat-1",
    name: "General Identifiers & Low-Sensitivity Metadata",
    level: "L1",
    description: "Low-impact identifiers, non-sensitive transaction IDs, public document references",
    examples: ["Session IDs", "Transaction ref numbers", "Public URLs", "System metadata"],
  },
  {
    id: "cat-2",
    name: "Personal Information (PII)",
    level: "L2",
    description: "Direct personal contact details, physical locations, names",
    examples: ["Names", "Email addresses", "Phone numbers", "Physical addresses", "IP addresses"],
  },
  {
    id: "cat-3",
    name: "Medical & Health Records",
    level: "L3",
    description: "Protected health information (ePHI), clinical diagnoses, medical history",
    examples: ["Clinical diagnoses", "Prescription details", "Patient IDs", "Medical notes"],
  },
  {
    id: "cat-4",
    name: "Financial Data & Identifiers",
    level: "L3",
    description: "Bank account details, payment card numbers, IBANs, tax identifiers",
    examples: ["Credit card primary numbers", "IBAN", "Bank account numbers", "Tax IDs"],
  },
  {
    id: "cat-5",
    name: "Credentials & Authentication Secrets",
    level: "L4",
    description: "High-entropy secrets, API keys, passwords, bearer tokens, private keys",
    examples: ["API keys (sk_test_*)", "JWT tokens", "Passwords", "SSH private keys", "OAuth secrets"],
  },
  {
    id: "cat-6",
    name: "Highly Confidential Records & Regulated Data",
    level: "L4",
    description: "Critical national identifiers, government IDs, trade secrets under NDA",
    examples: ["Aadhaar / SSN / PAN", "Trade secrets", "Internal M&A documents"],
  },
];

const SEVERITY_LEVELS = [
  { level: "L1", weight: 0.1, label: "L1 (0.1)", desc: "Low sensitivity / metadata", color: "text-muted-foreground border-border bg-secondary/50" },
  { level: "L2", weight: 0.3, label: "L2 (0.3)", desc: "Personal information", color: "text-mask border-mask/40 bg-mask/10" },
  { level: "L3", weight: 0.7, label: "L3 (0.7)", desc: "Medical / financial / confidential", color: "text-redact border-redact/40 bg-redact/10" },
  { level: "L4", weight: 1.0, label: "L4 (1.0)", desc: "Credentials / secrets / national IDs", color: "text-block border-block/40 bg-block/10" },
] as const;

function SensitivityConfigPage() {
  const [categories, setCategories] = useState<SensitivityCategory[]>(DEFAULT_TAXONOMY);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<"L1" | "L2" | "L3" | "L4">("L2");
  const [newDesc, setNewDesc] = useState("");
  const [newExamples, setNewExamples] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    const newCat: SensitivityCategory = {
      id: `cat-${Date.now()}`,
      name: newName.trim(),
      level: newLevel,
      description: newDesc.trim() || "Custom category",
      examples: newExamples.split(",").map((s) => s.trim()).filter(Boolean),
      isCustom: true,
    };
    setCategories([...categories, newCat]);
    setNewName("");
    setNewDesc("");
    setNewExamples("");
  };

  const handleDelete = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleReset = () => {
    setCategories(DEFAULT_TAXONOMY);
  };

  return (
    <Shell>
      <PageHeader
        eyebrow="Taxonomy management"
        title="Sensitivity Taxonomy Configuration"
        subtitle="Manage sensitivity categories and severity weights s(ek) defined in the paper: L1=0.1, L2=0.3, L3=0.7, L4=1.0. Future categories can be added dynamically."
      />
      <SimulationBanner />

      {savedNotice && (
        <div className="rounded-md border border-allow/40 bg-allow/10 p-3 text-xs font-semibold text-allow">
          ✓ Sensitivity taxonomy saved successfully. Policy engine updated.
        </div>
      )}

      {/* Severity Levels Reference */}
      <Panel title="Severity Level Weights — s(ek)" description="Fixed weights according to PrivAgentShield paper formulation.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEVERITY_LEVELS.map((sl) => (
            <div key={sl.level} className={cn("rounded-md border p-3", sl.color)}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{sl.label}</span>
                <span className="font-mono text-xs opacity-80">weight {sl.weight}</span>
              </div>
              <p className="mt-1 text-xs opacity-90">{sl.desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Configured Categories List */}
      <Panel
        title={`Sensitivity Categories (${categories.length})`}
        description="Categories map detected entities to severity levels for T*m calculation."
        right={
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" /> Reset Defaults
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Save className="size-3" /> Save Changes
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-md border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded border px-2 py-0.5 font-mono text-[10px] font-bold",
                      cat.level === "L4" ? "border-block/40 bg-block/10 text-block" :
                      cat.level === "L3" ? "border-redact/40 bg-redact/10 text-redact" :
                      cat.level === "L2" ? "border-mask/40 bg-mask/10 text-mask" :
                      "border-border bg-secondary text-muted-foreground"
                    )}>
                      {cat.level}
                    </span>
                    <h4 className="font-mono text-sm font-semibold text-foreground">{cat.name}</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                </div>
                {cat.isCustom && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-muted-foreground hover:text-block p-1"
                    title="Delete category"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              {cat.examples.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {cat.examples.map((ex, i) => (
                    <span key={i} className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {ex}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Add Category Form */}
      <Panel title="Add Custom Category" description="Extend the sensitivity taxonomy dynamically without code modifications.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Category Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Biometric & Genetic Data"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Severity Level
            </label>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as any)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="L1">L1 — Low sensitivity (0.1)</option>
              <option value="L2">L2 — Personal info (0.3)</option>
              <option value="L3">L3 — Medical/Financial (0.7)</option>
              <option value="L4">L4 — Credentials/Secrets (1.0)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Description
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Detailed description of what this category encompasses..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Example Identifiers (comma separated)
            </label>
            <input
              type="text"
              value={newExamples}
              onChange={(e) => setNewExamples(e.target.value)}
              placeholder="Fingerprints, DNA profiles, Facial embeddings"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddCategory}
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-4" /> Add Category
          </button>
        </div>
      </Panel>
    </Shell>
  );
}

