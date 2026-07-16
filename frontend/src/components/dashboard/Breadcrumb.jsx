"use client";
import Link from "next/link";

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="flex flex-wrap items-center gap-[10px]  h-full text-sm text-[#515151]">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-[10px]">
          {index !== 0 && (
            <svg className="h-3 w-3 text-[#515151]" width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.600097 6.60001L3.6001 3.60001L0.600098 0.600006" stroke="#515151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center  hover:text-primary">
              {item.isHome && (
                <div className="w-[29px] h-[29px] flex items-center justify-center rounded-full border border-[#515151]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M11.1535 5.82826L6.069 0.178805C5.85489 -0.0596018 5.4436 -0.0596018 5.22949 0.178805L0.14498 5.82826C0.0719221 5.90946 0.0239674 6.01009 0.00692201 6.11798C-0.0101234 6.22586 0.00447144 6.33638 0.0489397 6.43614C0.139331 6.64009 0.341582 6.77116 0.564735 6.77116H1.69463V10.7258C1.69463 10.8756 1.75415 11.0193 1.8601 11.1253C1.96604 11.2312 2.10974 11.2907 2.25957 11.2907H3.95441C4.10424 11.2907 4.24794 11.2312 4.35389 11.1253C4.45983 11.0193 4.51935 10.8756 4.51935 10.7258V8.46599H6.77914V10.7258C6.77914 10.8756 6.83866 11.0193 6.94461 11.1253C7.05055 11.2312 7.19425 11.2907 7.34408 11.2907H9.03892C9.18875 11.2907 9.33245 11.2312 9.4384 11.1253C9.54434 11.0193 9.60386 10.8756 9.60386 10.7258V6.77116H10.7338C10.8432 6.77162 10.9503 6.74024 11.0422 6.68085C11.1341 6.62145 11.2067 6.5366 11.2512 6.43665C11.2957 6.33669 11.3102 6.22595 11.2928 6.11792C11.2755 6.0099 11.2271 5.90925 11.1535 5.82826Z"
                      fill="#515151" />
                  </svg>
                </div>
              )}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="font-medium text-[#223581]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
