import React from 'react'

export default function Input({
    label,
    wrapperClassName = "",
    className = "",
    ...props
}) {
    return (

        <div className={wrapperClassName}>
            <label className="text-sm text-[16px] font-bold block mb-1">
                {label}
            </label>
            <input
                {...props}
                className={` w-[100%] text-[#515151] w-full border border-[#22358114] rounded px-[20px] py-[10px] text-sm
                       focus:outline-0 focus:border-[#515151] ${className}`}
            />
        </div>

    )
}
