import { useEffect, useState, type ChangeEvent, type ComponentProps } from "react";

type DecimalWeightInputProps = Omit<
  ComponentProps<"input">,
  "type" | "inputMode" | "value" | "onChange"
> & {
  weight: number;
  onWeight: (w: number) => void;
};

/**
 * Free-text decimal entry with `inputMode="decimal"` so locale keyboards can use `,` as the separator.
 * Keeps a local draft while focused so a trailing `.` or `,` is not dropped by controlled re-renders.
 */
export function DecimalWeightInput({
  weight,
  onWeight,
  onFocus,
  onBlur,
  ...rest
}: DecimalWeightInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!focused) {
      setText(weight === 0 ? "" : String(weight));
    }
  }, [weight, focused]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const trimmed = raw.trim();
    if (trimmed === "") {
      onWeight(0);
      return;
    }
    if (/[.,]$/.test(trimmed)) {
      return;
    }
    const n = parseFloat(trimmed.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      return;
    }
    onWeight(n);
  };

  const handleBlur = () => {
    setFocused(false);
    const trimmed = text.trim();
    if (trimmed === "") {
      onWeight(0);
      setText("");
      return;
    }
    const n = parseFloat(trimmed.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) {
      onWeight(n);
    } else {
      setText(weight === 0 ? "" : String(weight));
    }
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={focused ? text : weight === 0 ? "" : String(weight)}
      onFocus={(e) => {
        setFocused(true);
        setText(weight === 0 ? "" : String(weight));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        handleBlur();
        onBlur?.(e);
      }}
      onChange={handleChange}
    />
  );
}
