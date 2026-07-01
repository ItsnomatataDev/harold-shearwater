"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/Icon";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
};

export function PasswordInput({ label, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
        {label}
      </span>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`w-full rounded-xl border border-[#3a3a36] bg-[#232321] py-3 pl-4 pr-11 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none ${className ?? ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#777771] transition hover:bg-white/5 hover:text-[#c8c8c2]"
        >
          <Icon
            name={visible ? "eyeOff" : "eye"}
            className="h-4.5 w-4.5"
          />
        </button>
      </div>
    </label>
  );
}
