import { useState } from "react";
import { DollarSign, Printer, X } from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  created_at: string;
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  member_id: string;
  member: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  invoice_items: InvoiceItem[];
}

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailModal({ invoice, open, onOpenChange }: InvoiceDetailModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!invoice) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "M/d/yyyy");
  };

  // Calculate paid amount (would need to sum payments, for now we assume 0)
  const paidAmount = 0;

  const getStatusStyles = () => {
    switch (invoice.status.toLowerCase()) {
      case "paid":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "sent":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "overdue":
        return "bg-red-50 text-red-600 border-red-200";
      case "draft":
        return "bg-gray-50 text-gray-500 border-gray-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Invoice {invoice.invoice_number}
              </DialogTitle>
              <DialogDescription>View invoice details and payment history</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Record Payment
              </Button>
              <Button variant="outline" size="icon">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Invoice Information Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Member</p>
                    <p className="font-medium">
                      {invoice.member?.first_name} {invoice.member?.last_name}
                    </p>
                    <p className="text-sm text-primary">{invoice.member?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-semibold border uppercase ${getStatusStyles()}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-medium">{formatDate(invoice.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-primary">Description</TableHead>
                      <TableHead className="text-primary">Quantity</TableHead>
                      <TableHead className="text-primary">Unit Price</TableHead>
                      <TableHead className="text-primary text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.invoice_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="flex flex-col items-end mt-6 space-y-1">
                  <div className="flex justify-between w-48">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-48 font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                  <div className="flex justify-between w-48">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="text-emerald-600">{formatCurrency(paidAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />
    </>
  );
}
