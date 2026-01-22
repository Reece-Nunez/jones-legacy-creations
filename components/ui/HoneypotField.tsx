"use client";

import { UseFormRegister, FieldValues, Path } from "react-hook-form";

interface HoneypotFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  name?: Path<T>;
}

/**
 * A hidden honeypot field to catch bot submissions.
 * Bots typically fill in all visible form fields, including hidden ones.
 * Legitimate users won't see or fill this field.
 *
 * The field is hidden using CSS positioning (not display:none) as some
 * sophisticated bots detect display:none fields.
 */
export function HoneypotField<T extends FieldValues>({
  register,
  name = "honeypot" as Path<T>,
}: HoneypotFieldProps<T>) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <label htmlFor={name as string}>
        Leave this field empty
      </label>
      <input
        type="text"
        id={name as string}
        autoComplete="off"
        tabIndex={-1}
        {...register(name)}
      />
    </div>
  );
}
