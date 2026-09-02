"use client";

import React from "react";
import { Flex, Pill, Select, Text, TextInput } from "@contentful/f36-components";
import { MagnifyingGlassIcon } from "@contentful/f36-icons";

import { FLAG_FORMATS, type FlagFormat } from "../lib/nt-config";
import type { FormatFilter, KindFilter, RegistryFilters } from "../lib/filters";

interface RegistryControlsProps {
  filters: RegistryFilters;
  onChange: (next: RegistryFilters) => void;
  shown: number;
  total: number;
}

const KIND_OPTIONS: KindFilter[] = ["All", "Experiments", "Personalizations"];

export function RegistryControls({ filters, onChange, shown, total }: RegistryControlsProps) {
  return (
    <Flex flexDirection="column" gap="spacingS" marginBottom="spacingM">
      <Flex gap="spacingS" alignItems="center" flexWrap="wrap">
        <div style={{ flex: "1 1 320px", minWidth: 240 }}>
          <TextInput
            aria-label="Search flags"
            placeholder="Search flag key or experience"
            icon={<MagnifyingGlassIcon />}
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
          />
        </div>

        <Select
          aria-label="Filter by value format"
          value={filters.format}
          onChange={(event) =>
            onChange({ ...filters, format: event.target.value as FormatFilter })
          }
          style={{ width: 140 }}
        >
          <Select.Option value="All">All formats</Select.Option>
          {FLAG_FORMATS.map((format: FlagFormat) => (
            <Select.Option key={format} value={format}>
              {format}
            </Select.Option>
          ))}
        </Select>

        <Select
          aria-label="Filter by optimization type"
          value={filters.kind}
          onChange={(event) => onChange({ ...filters, kind: event.target.value as KindFilter })}
          style={{ width: 180 }}
        >
          {KIND_OPTIONS.map((kind) => (
            <Select.Option key={kind} value={kind}>
              {kind === "All" ? "All types" : kind}
            </Select.Option>
          ))}
        </Select>
      </Flex>

      <Flex alignItems="center" gap="spacingS">
        <Text fontColor="gray600" fontSize="fontSizeS">
          {shown} of {total} flags
        </Text>
        {filters.duplicatesOnly && (
          <Pill
            label="Duplicate keys only"
            onClose={() => onChange({ ...filters, duplicatesOnly: false })}
          />
        )}
      </Flex>
    </Flex>
  );
}
