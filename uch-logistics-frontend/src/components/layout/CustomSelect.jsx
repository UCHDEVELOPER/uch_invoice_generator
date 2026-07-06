"use client"

import React, { useState, useRef, useEffect } from 'react'

const   CustomSelect = ({
  label,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  error,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(defaultValue || (value || ""))
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option) => {
    const newValue = option
    setSelectedValue(newValue)
    onChange && onChange(newValue)
    setIsOpen(false)
  }

  const displayValue = selectedValue || placeholder

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-[16px] font-bold mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        className={`w-full flex items-center text-sm justify-between px-[20px] py-[10px] text-left bg-white border rounded-[5px] focus:outline-0 focus:border-[#515151] ${
          disabled 
            ? 'bg-gray-50 cursor-not-allowed text-gray-400' 
            : ''
        } ${error ? 'border-red-500' : 'border-[#22358114]'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={`truncate ${!selectedValue ? 'text-[#515151]' : 'text-[#747474]'}`}>
          {displayValue}
        </span>
        <svg className={`w-[10px] h-[10px] text-[#515151] duration-300 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
           width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.900391 0.900023L7.90039 7.90002L14.9004 0.900025" stroke="#515151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#22358114] rounded-[5px] shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {options.length > 0 ? (
              options.map((option, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className={`w-full text-sm flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                      selectedValue === option ? 'bg-primary/5 text-primary' : 'text-[#747474]'
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="truncate">{option}</span>
                    {selectedValue === option && (
                    //   <Check className="w-4 h-4 text-primary" />
                    <div></div>
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-center text-gray-500">
                No options available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default CustomSelect