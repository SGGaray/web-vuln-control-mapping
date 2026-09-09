"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { Notice, ToolShell } from "@/components/ui/ToolShell";
import { Field, TextInput } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import {
  buildCurlArgv,
  buildNmapArgv,
  isCurlHeaderFileSyntax,
  serializePosixArgv,
  type CurlMethod,
} from "@/lib/commands";
import { useLocale } from "@/lib/i18n/context";

type Kind = "nmap" | "curl";

/* -------------------------------------------------------------------------- */
/*  nmap builder                                                              */
/* -------------------------------------------------------------------------- */

function NmapBuilder() {
  const { t } = useLocale();
  const [target, setTarget] = useState("");
  const [scan, setScan] = useState("-sS"); // SYN scan is the common default
  const [ports, setPorts] = useState("top"); // top | all | custom
  const [customPorts, setCustomPorts] = useState("");
  const [timing, setTiming] = useState("T4");
  const [sv, setSv] = useState(true); // service/version detection
  const [pn, setPn] = useState(false); // skip host discovery

  const command = serializePosixArgv(
    buildNmapArgv({
      target,
      scan: scan as "-sS" | "-sT" | "-sU" | "-sn",
      ports: ports as "top" | "all" | "custom",
      customPorts,
      timing: timing as "T2" | "T3" | "T4" | "T5",
      serviceVersion: sv,
      skipDiscovery: pn,
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("commands.target")}>
        <TextInput
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="192.168.1.0/24"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("commands.scanType")}>
          <select className="io" value={scan} onChange={(e) => setScan(e.target.value)}>
            <option value="-sS">{t("commands.scan.syn")}</option>
            <option value="-sT">{t("commands.scan.tcp")}</option>
            <option value="-sU">{t("commands.scan.udp")}</option>
            <option value="-sn">{t("commands.scan.ping")}</option>
          </select>
        </Field>

        <Field label={t("commands.timing")}>
          <select className="io" value={timing} onChange={(e) => setTiming(e.target.value)}>
            {["T2", "T3", "T4", "T5"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t("commands.ports")}>
        <div className="flex flex-wrap gap-2">
          {[
            ["top", t("commands.ports.top")],
            ["all", t("commands.ports.all")],
            ["custom", t("commands.ports.custom")],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPorts(val)}
              aria-pressed={ports === val}
              className={`btn ${ports === val ? "border-muted text-bright" : "opacity-60"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {ports === "custom" && (
        <Field label={t("commands.customPorts")}>
          <TextInput
            value={customPorts}
            onChange={(e) => setCustomPorts(e.target.value)}
            placeholder="22,80,443,8080"
          />
        </Field>
      )}

      <div className="flex flex-wrap gap-4">
        <Toggle label={t("commands.versionDetect")} checked={sv} onChange={setSv} />
        <Toggle label={t("commands.skipDiscovery")} checked={pn} onChange={setPn} />
      </div>

      <Output command={command} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  curl builder                                                              */
/* -------------------------------------------------------------------------- */

function CurlBuilder() {
  const { t } = useLocale();
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [follow, setFollow] = useState(true); // -L
  const [insecure, setInsecure] = useState(false); // -k
  const [verbose, setVerbose] = useState(false); // -v

  const hasHeaderFileSyntax = isCurlHeaderFileSyntax(header);
  const command = hasHeaderFileSyntax
    ? null
    : serializePosixArgv(
        buildCurlArgv({
          url,
          method: method as CurlMethod,
          header,
          body,
          follow,
          insecure,
          verbose,
        })
      );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
        <Field label={t("commands.method")}>
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

      <Field label={t("commands.header", { optional: t("common.optional") })}>
        <TextInput
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Authorization: Bearer TOKEN"
        />
      </Field>

      {hasHeaderFileSyntax && (
        <Notice>{t("commands.errors.headerFileSyntax")}</Notice>
      )}

      <Field label={t("commands.body", { optional: t("common.optional") })}>
        <TextInput
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='{"user":"admin"}'
        />
      </Field>

      <div className="flex flex-wrap gap-4">
        <Toggle label={t("commands.followRedirects")} checked={follow} onChange={setFollow} />
        <Toggle label={t("commands.insecureTls")} checked={insecure} onChange={setInsecure} />
        <Toggle label={t("commands.verbose")} checked={verbose} onChange={setVerbose} />
      </div>

      {command !== null && <Output command={command} />}
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
  const { t } = useLocale();
  return (
    <Field label={t("commands.generated")} action={<CopyButton value={command} />}>
      <div className="terminal">
        <span className="select-none text-muted">$ </span>
        {command}
      </div>
    </Field>
  );
}

export default function CommandGenerator() {
  const { t } = useLocale();
  const [kind, setKind] = useState<Kind>("nmap");

  return (
    <ToolShell title={t("commands.title")} blurb={t("commands.description")}>
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-muted" />
        <div className="flex gap-1">
          {(["nmap", "curl"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
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
