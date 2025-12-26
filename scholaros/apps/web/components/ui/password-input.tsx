"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function getStrengthLevel(password: string): {
  score: number;
  label: string;
  color: string;
} {
  const passedRequirements = requirements.filter((req) =>
    req.test(password)
  ).length;

  if (password.length === 0) {
    return { score: 0, label: "", color: "bg-muted" };
  }

  if (passedRequirements <= 1) {
    return { score: 1, label: "Weak", color: "bg-red-500" };
  }

  if (passedRequirements <= 2) {
    return { score: 2, label: "Fair", color: "bg-orange-500" };
  }

  if (passedRequirements <= 3) {
    return { score: 3, label: "Good", color: "bg-yellow-500" };
  }

  if (passedRequirements <= 4) {
    return { score: 4, label: "Strong", color: "bg-green-500" };
  }

  return { score: 5, label: "Very Strong", color: "bg-green-600" };
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password",
  showStrength = false,
  className,
  id,
  name,
  required,
  disabled,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const strength = useMemo(() => getStrengthLevel(value), [value]);

  const passedRequirements = useMemo(
    () => requirements.map((req) => ({ ...req, passed: req.test(value) })),
    [value]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "input-base pr-11",
            className
          )}
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-describedby={showStrength ? "password-requirements" : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {/* Strength meter */}
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all duration-300",
                    level <= strength.score ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            {strength.label && (
              <p
                className={cn(
                  "text-xs font-semibold",
                  strength.score <= 2
                    ? "text-red-600 dark:text-red-400"
                    : strength.score <= 3
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {strength.label}
              </p>
            )}
          </div>

          {/* Requirements list */}
          {(isFocused || strength.score < 5) && (
            <ul
              id="password-requirements"
              className="space-y-1.5 text-xs rounded-xl bg-muted/50 p-3"
              aria-label="Password requirements"
            >
              {passedRequirements.map((req, index) => (
                <li
                  key={index}
                  className={cn(
                    "flex items-center gap-2.5 transition-all duration-200",
                    req.passed
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full transition-all duration-200",
                    req.passed
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-muted"
                  )}>
                    {req.passed ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <span className={req.passed ? "font-medium" : ""}>{req.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
