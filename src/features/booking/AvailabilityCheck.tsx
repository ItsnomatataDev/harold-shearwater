"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  searchAvailability,
  type AvailabilitySearchResponse,
} from "./availability-actions";
import type {
  AvailabilityDay,
  AvailabilityResult,
} from "./availability-shared";
import { RoomTypeAvailabilityNotice } from "./RoomTypeAvailabilityNotice";
import { RoomBookingRequestForm } from "./RoomBookingRequestForm";

export type RoomCardMeta = {
  href: string;
  description: string | null;
  productId: string;
  productName: string;
  fromRate?: {
    currency: string;
    price: number;
    planName: string;
  };
};

export type RoomMetaMap = Partial<Record<string, RoomCardMeta>>;

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function RoomCard({
  label,
  count,
  meta,
  onRequestBooking,
  showRequestBooking,
}: {
  label: string;
  count: number;
  meta?: RoomCardMeta;
  onRequestBooking?: () => void;
  showRequestBooking?: boolean;
}) {
  const available = count > 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition ${
        available
          ? "border-emerald-700/40 bg-emerald-900/10"
          : "border-[#2f2f2b] bg-[#161614] opacity-70"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                available
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-[#222220] text-[#6f6f68]"
              }`}
            >
              <Icon name="home" className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-white">{label}</p>
          </div>
          {available ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <Icon name="checkCircle" className="h-3 w-3" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#222220] px-2.5 py-1 text-[11px] font-medium text-[#6f6f68]">
              Fully booked
            </span>
          )}
        </div>

        {meta?.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#9b9b94]">
            {meta.description}
          </p>
        )}

        <div className="mt-3 space-y-3">
          <div>
            {available ? (
              <p className="text-sm text-emerald-200/90">
                <span className="text-lg font-bold text-white">{count}</span>{" "}
                {count === 1 ? "unit" : "units"} left in this room type
              </p>
            ) : (
              <p className="text-sm text-[#6f6f68]">No units left in this room type</p>
            )}
            {meta?.fromRate && (
              <p className="mt-1 text-xs text-gold">
                From {meta.fromRate.currency} {meta.fromRate.price.toFixed(2)} net
                <span className="text-[#85857d]"> · {meta.fromRate.planName}</span>
              </p>
            )}
          </div>

          {available && meta && (
            <div className="flex flex-wrap gap-2">
              {showRequestBooking && onRequestBooking && (
                <button
                  type="button"
                  onClick={onRequestBooking}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                >
                  <Icon name="route" className="h-3.5 w-3.5" />
                  Request booking
                </button>
              )}
              {meta.href && (
                <Link
                  href={meta.href}
                  className="btn-ghost inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                >
                  View room
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SingleDayResult({
  day,
  unitTypes,
  roomMeta,
  organizationId,
  searchStartDate,
  searchEndDate,
}: {
  day: AvailabilityDay;
  unitTypes: AvailabilityResult["unitTypes"];
  roomMeta?: RoomMetaMap;
  organizationId?: string;
  searchStartDate: string;
  searchEndDate: string;
}) {
  const [bookingUnitKey, setBookingUnitKey] = useState<string | null>(null);
  const freeCount = unitTypes.filter(
    (unit) => day.units[unit.key] > 0,
  ).length;
  const bookingMeta = bookingUnitKey ? roomMeta?.[bookingUnitKey] : undefined;
  const bookingUnit = bookingUnitKey
    ? unitTypes.find((unit) => unit.key === bookingUnitKey)
    : undefined;

  return (
    <div className="space-y-4">
      <RoomTypeAvailabilityNotice />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[.14em] text-[#85857d]">
            Availability for
          </p>
          <p className="text-base font-semibold text-white">
            {formatLongDate(day.date)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            freeCount > 0
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/15 text-red-300"
          }`}
        >
          {freeCount > 0
            ? `${freeCount} room type${freeCount !== 1 ? "s" : ""} available`
            : "Fully booked"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {unitTypes.map((unit) => (
          <RoomCard
            key={unit.key}
            label={unit.label}
            count={day.units[unit.key]}
            meta={roomMeta?.[unit.key]}
            showRequestBooking={Boolean(organizationId && roomMeta?.[unit.key]?.productId)}
            onRequestBooking={() => setBookingUnitKey(unit.key)}
          />
        ))}
      </div>

      {bookingMeta &&
        bookingUnit &&
        organizationId &&
        bookingUnitKey && (
          <RoomBookingRequestForm
            organizationId={organizationId}
            productId={bookingMeta.productId}
            productName={bookingMeta.productName}
            unitLabel={bookingUnit.label}
            preferredDate={searchStartDate}
            endDate={searchEndDate}
            unitsAvailable={day.units[bookingUnit.key]}
            fromRate={bookingMeta.fromRate}
            onCancel={() => setBookingUnitKey(null)}
          />
        )}
    </div>
  );
}

function RangeResult({ result }: { result: AvailabilityResult }) {
  if (!result.days.length) {
    return (
      <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] px-4 py-8 text-center text-sm text-[#85857d]">
        No availability was returned for these dates. Try a different range.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RoomTypeAvailabilityNotice compact />
      <div className="overflow-x-auto rounded-2xl border border-[#2f2f2b] bg-[#181816]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#2f2f2b]">
            <th className="sticky left-0 z-10 bg-[#181816] px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-[#85857d]">
              Date
            </th>
            {result.unitTypes.map((unit) => (
              <th
                key={unit.key}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-[#85857d]"
              >
                {unit.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.days.map((day) => (
            <tr
              key={day.date}
              className="border-b border-[#222220] last:border-0 hover:bg-[#1d1d1b]"
            >
              <td className="sticky left-0 z-10 whitespace-nowrap bg-[#181816] px-4 py-2.5 text-xs font-medium text-white">
                {formatShortDate(day.date)}
              </td>
              {result.unitTypes.map((unit) => {
                const count = day.units[unit.key];
                return (
                  <td key={unit.key} className="px-4 py-2.5">
                    {count > 0 ? (
                      <span className="inline-flex min-w-14 items-center justify-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        {count} <span className="font-normal opacity-70">units</span>
                      </span>
                    ) : (
                      <span className="inline-flex min-w-14 items-center justify-center rounded-md bg-[#222220] px-2 py-1 text-xs text-[#6f6f68]">
                        Full
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function AvailabilityCheck({
  roomMeta,
  organizationId,
}: {
  roomMeta?: RoomMetaMap;
  /** When set, available rooms show a booking request action (agent portal). */
  organizationId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"single" | "range">("single");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [checkedMode, setCheckedMode] = useState<"single" | "range">("single");
  const [date, setDate] = useState(() => todayIso());
  const [endDate, setEndDate] = useState(() => todayIso(7));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const startDate = date;
    const finalEnd = mode === "single" ? date : endDate;
    const submittedMode = mode;
    startTransition(async () => {
      const response: AvailabilitySearchResponse = await searchAvailability({
        startDate,
        endDate: finalEnd,
      });
      if (response.ok) {
        setResult(response.result);
        setCheckedMode(submittedMode);
      } else {
        setResult(null);
        setError(response.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#2f2f2b] bg-[#1d1d1b] p-5"
      >
        <div className="mb-4 inline-flex rounded-xl border border-[#2f2f2b] bg-[#161614] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              mode === "single"
                ? "bg-savannah text-black"
                : "text-[#85857d] hover:text-white"
            }`}
          >
            Single date
          </button>
          <button
            type="button"
            onClick={() => setMode("range")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              mode === "range"
                ? "bg-savannah text-black"
                : "text-[#85857d] hover:text-white"
            }`}
          >
            Date range
          </button>
        </div>

        <div
          className={`grid gap-4 sm:items-end ${
            mode === "range"
              ? "sm:grid-cols-[1fr_1fr_auto]"
              : "sm:grid-cols-[1fr_auto]"
          }`}
        >
          <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
            {mode === "range" ? "From" : "Date"}
            <input
              type="date"
              value={date}
              max={mode === "range" ? endDate : undefined}
              onChange={(e) => setDate(e.target.value)}
              className="input mt-2 w-full"
              required
            />
          </label>
          {mode === "range" && (
            <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
              To
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                className="input mt-2 w-full"
                required
              />
            </label>
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name="search" className="h-4 w-4" />
            {pending ? "Checking…" : "Check availability"}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-200">
          <Icon name="alertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && !error && checkedMode === "single" && (
        result.days[0] ? (
          <SingleDayResult
            day={result.days[0]}
            unitTypes={result.unitTypes}
            roomMeta={roomMeta}
            organizationId={organizationId}
            searchStartDate={date}
            searchEndDate={date}
          />
        ) : (
          <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] px-4 py-8 text-center text-sm text-[#85857d]">
            No availability was returned for this date.
          </div>
        )
      )}

      {result && !error && checkedMode === "range" && (
        <RangeResult result={result} />
      )}
    </div>
  );
}
