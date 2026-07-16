import Invoices from "@/components/dashboard/Invoices";
import Loader from "@/components/dashboard/Loader";
import React, { Suspense } from "react";

function page() {
  return (
    <div>
      <Suspense fallback={<div><Loader  text="Loading Invoices..." /></div>}>
        <Invoices />
      </Suspense>
    </div>
  );
}

export default page;
