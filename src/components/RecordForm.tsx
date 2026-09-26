import { useEffect, useMemo, useState } from "react";
import { Tank, THRESHOLDS, WaterRecord } from "../types";
import { fmt, toLocalInputValue, uid } from "../utils";

interface RecordFormProps {
  tank: Tank;
  onSave: (record: WaterRecord) => void;
}

type FieldKey = "ph" | "ammonia" | "nitrite" | "nitrate" | "hardness" | "temperature" | "waterChangePct";

interface FieldDef {
  key: FieldKey;
  label: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  rangeHint: string;
}

const FIELDS: FieldDef[] = [
  { key: "ph", label: "pH", unit: "", placeholder: "如 6.8", min: 0, max: 14, rangeHint: "0–14" },
  { key: "ammonia", label: "氨氮", unit: "ppm", placeholder: "如 0.05", min: 0, max: 10, rangeHint: "0–10 ppm" },
  { key: "nitrite", label: "亚硝酸盐", unit: "ppm", placeholder: "如 0.05", min: 0, max: 10, rangeHint: "0–10 ppm" },
  { key: "nitrate", label: "硝酸盐", unit: "ppm", placeholder: "如 15", min: 0, max: 500, rangeHint: "0–500 ppm" },
  { key: "hardness", label: "硬度", unit: "°dH", placeholder: "如 6", min: 0, max: 50, rangeHint: "0–50 °dH" },
  { key: "temperature", label: "温度", unit: "°C", placeholder: "如 25", min: 0, max: 40, rangeHint: "0–40 °C" },
  { key: "waterChangePct", label: "换水比例", unit: "%", placeholder: "0–100", min: 0, max: 100, rangeHint: "0–100%" },
];

const emptyValues = (): Record<FieldKey, string> => ({
  ph: "",
  ammonia: "",
  nitrite: "",
  nitrate: "",
  hardness: "",
  temperature: "",
  waterChangePct: "0",
});

export default function RecordForm({ tank, onSave }: RecordFormProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>(emptyValues);
  const [measuredAt, setMeasuredAt] = useState(() => toLocalInputValue(new Date()));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey | "measuredAt" | "note", string>>>({});
  const [savedTip, setSavedTip] = useState("");

  // 切换鱼缸时重置表单，避免把上一口缸的数据录进去
  useEffect(() => {
    setValues(emptyValues());
    setMeasuredAt(toLocalInputValue(new Date()));
    setNote("");
    setErrors({});
    setSavedTip("");
  }, [tank.id]);

  const th = THRESHOLDS[tank.type];

  const parsed = useMemo(() => {
    const out = {} as Record<FieldKey, number | null>;
    (Object.keys(values) as FieldKey[]).forEach((k) => {
      const raw = values[k].trim();
      const n = Number(raw);
      out[k] = raw !== "" && Number.isFinite(n) ? n : null;
    });
    return out;
  }, [values]);

  const ammoniaExceed = parsed.ammonia !== null && parsed.ammonia > th.ammonia;
  const nitriteExceed = parsed.nitrite !== null && parsed.nitrite > th.nitrite;
  const exceeded = ammoniaExceed || nitriteExceed;
  const noteMissing = exceeded && note.trim() === "";

  const setValue = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};

    (FIELDS as FieldDef[]).forEach((f) => {
      const raw = values[f.key].trim();
      const n = Number(raw);
      if (raw === "" || !Number.isFinite(n)) {
        nextErrors[f.key] = `请填写${f.label}`;
      } else if (n < f.min || n > f.max) {
        nextErrors[f.key] = `${f.label}需在 ${f.rangeHint} 之间`;
      }
    });

    const time = new Date(measuredAt);
    if (!measuredAt || Number.isNaN(time.getTime())) {
      nextErrors.measuredAt = "请选择记录时间";
    }
    if (exceeded && note.trim() === "") {
      nextErrors.note = "氨氮或亚硝酸盐超线，必须填写处理备注后才能保存";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      id: uid(),
      tankId: tank.id,
      measuredAt: time.toISOString(),
      ph: parsed.ph!,
      ammonia: parsed.ammonia!,
      nitrite: parsed.nitrite!,
      nitrate: parsed.nitrate!,
      hardness: parsed.hardness!,
      temperature: parsed.temperature!,
      waterChangePct: parsed.waterChangePct!,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });

    setValues(emptyValues());
    setMeasuredAt(toLocalInputValue(new Date()));
    setNote("");
    setErrors({});
    setSavedTip(`已保存到「${tank.name}」`);
    window.setTimeout(() => setSavedTip(""), 3000);
  };

  const fieldClass = (key: FieldKey, warn: boolean) =>
    `field${errors[key] ? " has-error" : ""}${warn ? " has-warn" : ""}`;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>录入</p>
          <h2>
            为「{tank.name}」记录水质
            <span className={`tag ${tank.type === "草缸" ? "tag-green" : tank.type === "海缸" ? "tag-blue" : "tag-amber"}`}>
              {tank.type}
            </span>
          </h2>
        </div>
        <p className="threshold-hint">
          {tank.type}上限：氨氮 ≤ {fmt(th.ammonia, 2)} ppm · 亚硝酸盐 ≤ {fmt(th.nitrite, 2)} ppm
        </p>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label className={`field${errors.measuredAt ? " has-error" : ""}`}>
            <span>记录时间（换水时间）*</span>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
            />
            {errors.measuredAt && <em className="field-error">{errors.measuredAt}</em>}
          </label>

          {FIELDS.map((f) => {
            const warn =
              (f.key === "ammonia" && ammoniaExceed) || (f.key === "nitrite" && nitriteExceed);
            const limit = f.key === "ammonia" ? th.ammonia : f.key === "nitrite" ? th.nitrite : null;
            return (
              <label key={f.key} className={fieldClass(f.key, warn)}>
                <span>
                  {f.label}
                  {f.unit ? `（${f.unit}）` : ""} *
                </span>
                <input
                  value={values[f.key]}
                  onChange={setValue(f.key)}
                  placeholder={f.placeholder}
                  inputMode="decimal"
                />
                {errors[f.key] ? (
                  <em className="field-error">{errors[f.key]}</em>
                ) : (
                  warn &&
                  limit !== null && (
                    <em className="field-warn">
                      超过{tank.type}上限 {fmt(limit, 2)} ppm
                    </em>
                  )
                )}
              </label>
            );
          })}
        </div>

        {exceeded && (
          <div className="banner-warn" role="alert">
            ⚠ 检测到
            {[ammoniaExceed ? `氨氮 ${fmt(parsed.ammonia!, 2)}` : null, nitriteExceed ? `亚硝酸盐 ${fmt(parsed.nitrite!, 2)}` : null]
              .filter(Boolean)
              .join("、")}
            超过{tank.type}上限，请填写处理备注后才能保存。
          </div>
        )}

        <label className={`field note-field${errors.note ? " has-error" : ""}${exceeded ? " has-warn" : ""}`}>
          <span>处理备注{exceeded ? "（超标必填）" : "（选填）"}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={exceeded ? "如：停食、换水 40%、添加硝化细菌……" : "如：修剪水草、调整灯光、观察到的状态……"}
          />
          {errors.note && <em className="field-error">{errors.note}</em>}
        </label>

        <div className="form-actions">
          <button type="submit" className="primary-action" disabled={noteMissing} title={noteMissing ? "超标记录需先填写处理备注" : undefined}>
            保存记录
          </button>
          {noteMissing && <span className="field-error">超标记录需先填写处理备注</span>}
          {savedTip && <span className="saved-tip">✓ {savedTip}</span>}
        </div>
      </form>
    </section>
  );
}
