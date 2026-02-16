"use client";

import React, { useState, useCallback } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { IFormEmbed } from "../../type";
import type { Form, FormField } from "@/lib/integrations/forms/forms.interface";

interface FormEmbedSectionProps {
  entry: IFormEmbed;
}

/**
 * FormEmbedSection renders a form from the JSON field.
 * Supports various field types and handles form submission.
 */
export default function FormEmbedSection({ entry }: FormEmbedSectionProps) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  const title = entry.fields.title;
  const introCopy = entry.fields.introCopy;
  const formData = entry.fields.form as { selectedForm?: Form } | null;
  const selectedForm = formData?.selectedForm;

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedForm.id,
          data: formValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [selectedForm, formValues]);

  if (!selectedForm) {
    return null;
  }

  // Success state
  if (submitted) {
    return (
      <section className="py-12 md:py-20 bg-gradient-to-b from-green-50 to-background">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="mb-6 text-6xl">✅</div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            {selectedForm.successMessage?.split("\n")[0] || "Thank you!"}
          </h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {selectedForm.successMessage?.split("\n").slice(1).join("\n") || 
              "Your submission has been received."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-4"
          >
            {title || selectedForm.title}
          </h2>
          {(introCopy || selectedForm.introCopy) && (
            <p
              {...inspectorProps({ fieldId: "introCopy" })}
              className="text-lg text-muted-foreground whitespace-pre-line"
            >
              {introCopy || selectedForm.introCopy}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {selectedForm.fields.map((field) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={formValues[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              allValues={formValues}
            />
          ))}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all",
              submitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
            )}
          >
            {submitting ? "Submitting..." : (selectedForm.submitButtonText || "Submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

interface FormFieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  allValues: Record<string, unknown>;
}

function FormFieldRenderer({ field, value, onChange, allValues }: FormFieldRendererProps) {
  // Check conditional visibility
  if (field.conditional) {
    const conditionValue = allValues[field.conditional.field];
    const { operator, value: expectedValue } = field.conditional;
    
    let visible = false;
    switch (operator) {
      case "equals":
        visible = conditionValue === expectedValue;
        break;
      case "not_equals":
        visible = conditionValue !== expectedValue;
        break;
      case "not_empty":
        visible = !!conditionValue;
        break;
      case "contains":
        visible = Array.isArray(conditionValue) && conditionValue.includes(expectedValue);
        break;
    }
    
    if (!visible) return null;
  }

  const baseInputClass = "w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <div className={cn(field.width === "half" ? "w-1/2" : "w-full")}>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
          {field.helpText && (
            <p className="mt-1 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className={cn(baseInputClass, "resize-none")}
          />
          {field.helpText && (
            <p className="mt-1 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">Select an option...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {field.helpText && (
            <p className="mt-1 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "radio":
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  value === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  required={field.required}
                  className="w-4 h-4 text-primary"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {field.helpText && (
            <p className="mt-2 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "multiselect":
      const selectedValues = (value as string[]) || [];
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isChecked
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        onChange(selectedValues.filter((v) => v !== opt.value));
                      } else {
                        onChange([...selectedValues, opt.value]);
                      }
                    }}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
          {field.helpText && (
            <p className="mt-2 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            required={field.required}
            className="w-4 h-4 mt-1 text-primary rounded"
          />
          <span className="text-sm">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      );

    case "consent":
      return (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              required={field.required}
              className="w-4 h-4 mt-1 text-primary rounded"
            />
            <span className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
        </div>
      );

    case "donation-amount":
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all text-center",
                  value === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-input hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <span className="text-xl font-bold text-primary">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {opt.description}
                  </span>
                )}
              </label>
            ))}
          </div>
          {field.helpText && (
            <p className="mt-2 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "number":
      return (
        <div className={cn(field.width === "half" ? "w-1/2" : "w-full")}>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="number"
            value={(value as number) || ""}
            onChange={(e) => onChange(e.target.valueAsNumber || undefined)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
          {field.helpText && (
            <p className="mt-1 text-sm text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "field-group":
      return (
        <div className="p-4 rounded-lg border bg-muted/20">
          <label className="block text-sm font-medium mb-4">
            {field.label}
          </label>
          {field.helpText && (
            <p className="mb-4 text-sm text-muted-foreground">{field.helpText}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field.fields?.map((subField) => (
              <FormFieldRenderer
                key={subField.id}
                field={subField}
                value={(value as Record<string, unknown>)?.[subField.id]}
                onChange={(subValue) => {
                  const currentGroup = (value as Record<string, unknown>) || {};
                  onChange({ ...currentGroup, [subField.id]: subValue });
                }}
                allValues={allValues}
              />
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
