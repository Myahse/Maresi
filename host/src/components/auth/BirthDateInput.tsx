import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  max: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function BirthDateInput({ id, value, onChange, max }: Props) {
  const { t, i18n } = useTranslation();
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const [year, setYear] = useState(parsed?.[1] ?? "");
  const [month, setMonth] = useState(parsed?.[2] ?? "");
  const [day, setDay] = useState(parsed?.[3] ?? "");

  useEffect(() => {
    const next = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!next) return;
    setYear(next[1]);
    setMonth(next[2]);
    setDay(next[3]);
  }, [value]);

  const maxDate = useMemo(() => new Date(`${max}T00:00:00`), [max]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxDate.getFullYear(); y >= 1920; y -= 1) list.push(y);
    return list;
  }, [maxDate]);

  const monthCount = year && Number(year) === maxDate.getFullYear() ? maxDate.getMonth() + 1 : 12;
  const maxDay = useMemo(() => {
    if (!year || !month) return 31;
    const inMonth = daysInMonth(Number(year), Number(month));
    if (Number(year) === maxDate.getFullYear() && Number(month) === maxDate.getMonth() + 1) {
      return Math.min(inMonth, maxDate.getDate());
    }
    return inMonth;
  }, [year, month, maxDate]);

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    if (!nextYear || !nextMonth || !nextDay) {
      onChange("");
      return;
    }
    const last = daysInMonth(Number(nextYear), Number(nextMonth));
    const safeDay = Math.min(Number(nextDay), last);
    const safe = pad(safeDay);
    if (safe !== nextDay) setDay(safe);
    onChange(`${nextYear}-${pad(Number(nextMonth))}-${safe}`);
  };

  const selectClass =
    "flex h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div id={id} className="grid grid-cols-3 gap-2">
      <select
        aria-label={t("register.birthDay")}
        className={selectClass}
        value={day}
        onChange={(e) => emit(year, month, e.target.value)}
        required
      >
        <option value="">{t("register.birthDay")}</option>
        {Array.from({ length: maxDay }, (_, i) => pad(i + 1)).map((d) => (
          <option key={d} value={d}>
            {Number(d)}
          </option>
        ))}
      </select>
      <select
        aria-label={t("register.birthMonth")}
        className={selectClass}
        value={month}
        onChange={(e) => emit(year, e.target.value, day)}
        required
      >
        <option value="">{t("register.birthMonth")}</option>
        {Array.from({ length: monthCount }, (_, i) => pad(i + 1)).map((m) => (
          <option key={m} value={m}>
            {new Date(2000, Number(m) - 1, 1).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-GB", {
              month: "long",
            })}
          </option>
        ))}
      </select>
      <select
        aria-label={t("register.birthYear")}
        className={selectClass}
        value={year}
        onChange={(e) => emit(e.target.value, month, day)}
        required
      >
        <option value="">{t("register.birthYear")}</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
