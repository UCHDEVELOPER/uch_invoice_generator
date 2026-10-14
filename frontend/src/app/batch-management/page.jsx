import BatchInvoice from "@/components/dashboard/BatchInvoice";
import Loader from "@/components/dashboard/Loader";
import React, { Suspense } from "react";

function page() {
  return (
    <div>
      <Suspense fallback={<div><Loader  text="Loading Invoices..." /></div>}>
        <BatchInvoice />
      </Suspense>
    </div>
  );
}

export default page;
