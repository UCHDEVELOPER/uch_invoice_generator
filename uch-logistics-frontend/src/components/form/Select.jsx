"use client"
import React from 'react'

export default function Select({
    label,
    options = [],
    wrapperClassName = "",
    className = "",
    ...props
}) {
    return (

        <div className={wrapperClassName}>
            <label className=" text-sm text-[16px] font-bold block mb-1">
                {label}
            </label>
            <select
                {...props}
                className={` text-[#515151] w-full border border-[#22358114] rounded px-[20px] py-[12px] text-sm
                         focus:outline-none focus:ring-1 focus:ring-[#515151] ${className}`}>
                {options.map((op, index) => (
                    <option key={index} value={op}>
                        {op}
                    </option>
                ))}
            </select>
        </div>

    )
}
