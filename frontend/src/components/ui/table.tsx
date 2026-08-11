"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const tableRef = React.useRef<HTMLTableElement>(null)

  React.useEffect(() => {
    if (!tableRef.current) return;
    
    const applyLabels = () => {
      const table = tableRef.current;
      if (!table) return;
      const ths = Array.from(table.querySelectorAll('thead th'));
      const trs = Array.from(table.querySelectorAll('tbody tr'));
      
      trs.forEach(tr => {
        const tds = Array.from(tr.querySelectorAll('td'));
        tds.forEach((td, index) => {
          if (ths[index]) {
            let label = ths[index].textContent?.trim() || '';
            // Handle action columns without text
            if (!label && ths[index].classList.contains('text-right')) {
               label = 'Aksi';
            }
            td.setAttribute('data-label', label);
          }
        });
      });
    };

    // Apply initially
    applyLabels();
    
    // Observer for dynamic rows (e.g. loading -> data)
    const observer = new MutationObserver(applyLabels);
    observer.observe(tableRef.current, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, [])

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto responsive-table-container"
    >
      <table
        ref={tableRef}
        data-slot="table"
        className={cn("w-full caption-bottom text-sm responsive-table", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
