"use client"

import React from 'react'

function Footer() {

  const currentYear = new Date().getFullYear();

  return (
    <footer className='h-[80px] p-[20px] flex items-center justify-center relative z-[2]'>
      <p className='text-[#515151] 2xl:text-[18px] text-center'>Copyright © {currentYear}  all rights reserved by UCH Logistics.</p>
    </footer>
  )
}

export default Footer