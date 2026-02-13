// components/admin/TypeAheadSelect.tsx
// Reusable type-ahead select component

"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";

interface Option {
  [key: string]: any;
}

interface TypeAheadSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  displayField: string;
  valueField: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullNameField?: string; // Optional field for showing full name in dropdown
  className?: string;
}

export default function TypeAheadSelect({
  label,
  options,
  value,
  onChange,
  displayField,
  valueField,
  placeholder = "Select...",
  required = false,
  disabled = false,
  fullNameField,
  className = "",
}: TypeAheadSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get display text for selected value
  const selectedOption = options.find((opt) => opt[valueField] === value);
  const displayText = selectedOption ? selectedOption[displayField] : "";

  // Filter options based on search
  const filteredOptions = options.filter((opt) => {
    const searchLower = searchQuery.toLowerCase();
    const displayMatch = opt[displayField].toLowerCase().includes(searchLower);
    const fullNameMatch = fullNameField
      ? opt[fullNameField].toLowerCase().includes(searchLower)
      : false;
    return displayMatch || fullNameMatch;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex][valueField]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        break;
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {label && (
        <label className="text-xs font-black uppercase text-slate-400 ml-2 mb-1 block">
          {label} {required && "*"}
        </label>
      )}

      <div className="relative">
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayText}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 pr-20"
        />

        {/* Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded transition-all"
            >
              <X size={16} className="text-slate-400" />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option[valueField]}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option[valueField])}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full p-3 text-left transition-all ${
                    index === highlightedIndex
                      ? "bg-[#06054e] text-white"
                      : "hover:bg-slate-50"
                  } ${option[valueField] === value ? "font-bold" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{option[displayField]}</span>
                    {fullNameField &&
                      option[fullNameField] !== option[displayField] && (
                        <span
                          className={`text-sm ${
                            index === highlightedIndex
                              ? "text-white/80"
                              : "text-slate-500"
                          }`}
                        >
                          {option[fullNameField]}
                        </span>
                      )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {selectedOption &&
        fullNameField &&
        selectedOption[fullNameField] !== selectedOption[displayField] &&
        !isOpen && (
          <p className="text-xs text-slate-500 mt-1 ml-2">
            {selectedOption[fullNameField]}
          </p>
        )}
    </div>
  );
}
