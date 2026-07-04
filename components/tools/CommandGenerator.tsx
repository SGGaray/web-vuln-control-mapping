"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { ToolShell } from "@/components/ui/ToolShell";
import { Field, TextInput } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";

type Kind = "nmap" | "curl";

/* -------------------------------------------------------------------------- */
/*  nmap builder                                                              */
/* -------------------------------------------------------------------------- */

function NmapBuilder() {
  const [target, setTarget] = useState("");
  const [scan, setScan] = useState("-sS"); // SYN scan is the common default
  const [ports, setPorts] = useState("top"); // top | all | custom
  const [customPorts, setCustomPorts] = useState("");
  const [timing, setTiming] = useState("T4");
  const [sv, setSv] = useState(true); // service/version detection
  const [pn, setPn] = useState(false); // skip host discovery

  // Assemble flags in a predictable order, skipping anything empty.
  const flags: string[] = [scan];
  if (sv) flags.push("-sV");
  if (pn) flags.push("-Pn");
  flags.push(`-${timing}`);
  if (ports === "all") flags.push("-p-");
  else if (ports === "custom" && customPorts.trim())
    flags.push(`-p ${customPorts.trim()}`);

  const command = `nmap ${flags.join(" ")} ${target.trim() || "<target>"}`;

  return (
    <div className="flex flex-col gap-4">
      <Field label="Target (host, IP, or range)">
        <TextInput
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="192.168.1.0/24"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Scan type">
          <select className="io" value={scan} onChange={(e) => setScan(e.target.value)}>
            <option value="-sS">SYN scan (-sS)</option>
            <option value="-sT">TCP connect (-sT)</option>
            <option value="-sU">UDP scan (-sU)</option>
            <option value="-sn">Ping sweep (-sn)</option>
          </select>
        </Field>

        <Field label="Timing">
          <select className="io" value={timing} onChange={(e) => setTiming(e.target.value)}>
            {["T2", "T3", "T4", "T5"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Ports">
        <div className="flex flex-wrap gap-2">
          {[
            ["top", "Top 1000"],
            ["all", "All (-p-)"],
            ["custom", "Custom"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPorts(val)}
              className={`btn ${ports === val ? "border-muted text-bright" : "opacity-60"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {ports === "custom" && (
        <Field label="Custom ports">
          <TextInput
            value={customPorts}
            onChange={(e) => setCustomPorts(e.target.value)}
            placeholder="22,80,443,8080"
          />
        </Field>
      )}

      <div className="flex flex-wrap gap-4">
        <Toggle label="-sV version detect" checked={sv} onChange={setSv} />
        <Toggle label="-Pn skip discovery" checked={pn} onChange={setPn} />
      </div>

      <Output command={command} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  curl builder                                                              */
/* -------------------------------------------------------------------------- */

function CurlBuilder() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [follow, setFollow] = useState(true); // -L
  const [insecure, setInsecure] = useState(false); // -k
  const [verbose, setVerbose] = useState(false); // -v

  const parts: string[] = ["curl"];
  if (method !== "GET") parts.push(`-X ${method}`);
  if (follow) parts.push("-L");
  if (insecure) parts.push("-k");
  if (verbose) parts.push("-v");
  if (header.trim()) parts.push(`-H "${header.trim()}"`);
  // Quote the body so shells treat it as one argument.
  if (body.trim()) parts.push(`-d '${body.trim()}'`);
  parts.push(`"${url.trim() || "https://example.com"}"`);

  const command = parts.join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Method">
          <select className="io" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL">
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.target.com/login"
          />
        </Field>
      </div>

      <Field label="Header (optional)">
        <TextInput
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Authorization: Bearer TOKEN"
        />
      </Field>

      <Field label="Body (optional)">
        <TextInput
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='{"user":"admin"}'
        />
      </Field>

      <div className="flex flex-wrap gap-4">
        <Toggle label="-L follow redirects" checked={follow} onChange={setFollow} />
        <Toggle label="-k insecure TLS" checked={insecure} onChange={setInsecure} />
        <Toggle label="-v verbose" checked={verbose} onChange={setVerbose} />
      </div>

      <Output command={command} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

// A minimal monochrome checkbox row.
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-neutral-400"
      />
      {label}
    </label>
  );
}

// The generated command block with a copy button.
function Output({ command }: { command: string }) {
  return (
    <Field label="Generated command" action={<CopyButton value={command} />}>
      <div className="terminal">
        <span className="select-none text-muted">$ </span>
        {command}
      </div>
    </Field>
  );
}

export default function CommandGenerator() {
  const [kind, setKind] = useState<Kind>("nmap");

  return (
    <ToolShell
      title="Command Generator"
      blurb="Build nmap and curl commands from a form. Copy and run in your own lab."
    >
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-muted" />
        <div className="flex gap-1">
          {(["nmap", "curl"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`btn ${kind === k ? "border-muted text-bright bg-raised" : "opacity-60"}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {kind === "nmap" ? <NmapBuilder /> : <CurlBuilder />}
    </ToolShell>
  );
}
