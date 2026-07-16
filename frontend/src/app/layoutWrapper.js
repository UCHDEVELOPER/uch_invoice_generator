"use client"

import React, {useState} from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function LayoutWrapper({children}) {
    const [collapsed, setcollapsed] = useState(false);
    const pathname = usePathname();
    
    const hideHeaderFooter = pathname === '/login' || pathname === '/signup';
    
    if (hideHeaderFooter) {
        return (
            <div className="min-h-screen flex flex-col gap-[50px] justify-between w-full bg-[#FAFBFC] overflow-hidden">
            
                <main className="flex justify-center items-center relative bg-cover bg-[url(/img/login-bg.png)] min-h-[calc(100vh-150px)]">
                    {children}
                    
                    <div className='h-[40vh] w-[200%] bg-[#FAFBFC] absolute -bottom-[140px] right-0 -left-[200px] rotate-z-[5deg] pointer-none:'> </div>
                    
                </main>
                 <img src="/img/left.png" alt="vehicle" className="absolute left-0 bottom-20 md:bottom-10 2xl:bottom-0 w-[50%] md:w-[35%] 2xl:w-auto " />
            <img src="/img/right.png" alt="vehicle"  className="absolute right-0 bottom-20  md:bottom-10 2xl:bottom-0 w-[50%] md:w-[30%] 2xl:w-auto "/>
                <Footer/>
            </div>
        );
    }
    return (
        <div className="h-screen flex w-full bg-[#FAFBFC]">
            <Sidebar collapsed={collapsed} setcollapsed={setcollapsed} />
            <div className={`${collapsed ? 'w-[calc(100%-80px)]' : 'w-[calc(100%-250px)] 2xl:w-[calc(100%-374px)]'} flex flex-col duration-300`}>
                <Header collapsed={collapsed} setcollapsed={setcollapsed} />
                <main className="h-[calc(100vh-160px)] md:p-[30px] p-[20px] bg-[#FAFBFC] overflow-auto">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    )
}

export default LayoutWrapper