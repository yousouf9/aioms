import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, StickyNote, Calendar, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPermissionsForRole } from "@/lib/permissions";

function roleBadgeClass(role: string) {
  if (role === "BUYER") return "bg-blue-100 text-blue-700";
  if (role === "DEBTOR") return "bg-amber-100 text-amber-700";
  return "bg-purple-100 text-purple-700";
}

function orderStatusClass(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "READY":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function creditStatusClass(status: string) {
  if (status === "PAID") return "bg-green-100 text-green-700";
  if (status === "OVERDUE") return "bg-red-100 text-red-700";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-700";
  return "bg-amber-100 text-amber-700";
}

function offerStatusClass(status: string) {
  if (status === "COMPLETED" || status === "ACCEPTED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const permissions = await getPermissionsForRole(session.role);
  const canViewFinancials = session.role === "SUPER_ADMIN" || session.role === "MANAGER";
  const canCreateOrder = permissions.orders.create;
  const canCreateCredit = permissions.credit.create;

  const [customer, orderTotals, creditTotals] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        creditSales: { orderBy: { createdAt: "desc" }, take: 20 },
        aggregatorOffers: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: {
          select: { orders: true, creditSales: true, aggregatorOffers: true, sales: true },
        },
      },
    }),
    db.order.aggregate({
      where: { customerId: id, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    db.creditSale.aggregate({
      where: { customerId: id },
      _sum: { totalAmount: true, paidAmount: true },
    }),
  ]);

  if (!customer) notFound();

  const totalOrderValue = orderTotals._sum.total?.toNumber() ?? 0;
  const totalCreditIssued = creditTotals._sum.totalAmount?.toNumber() ?? 0;
  const totalCreditPaid = creditTotals._sum.paidAmount?.toNumber() ?? 0;
  const totalCreditOutstanding = Math.max(0, totalCreditIssued - totalCreditPaid);

  return (
    <div>
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 font-body text-sm text-muted hover:text-agro-dark mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl text-agro-dark">{customer.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customer.roles.map((r) => (
                <span
                  key={r}
                  className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${roleBadgeClass(r)}`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateOrder && (
              <Link
                href={`/dashboard/orders?newOrder=1&customerId=${customer.id}&name=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone)}`}
                className="h-9 px-3 rounded-[8px] bg-primary text-white font-body text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Order
              </Link>
            )}
            {canCreateCredit && (
              <Link
                href={`/dashboard/credit?newCredit=1&customerId=${customer.id}&name=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone)}`}
                className="h-9 px-3 rounded-[8px] border border-primary text-primary font-body text-xs font-medium flex items-center gap-1.5 hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Credit
              </Link>
            )}
          </div>
        </div>

        {/* Cumulative stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-frost-white rounded-[8px] px-3 py-2 text-center">
            <p className="font-display font-bold text-lg text-agro-dark">{customer._count.orders}</p>
            <p className="font-body text-[10px] uppercase text-muted tracking-wide">Orders</p>
          </div>
          <div className="bg-frost-white rounded-[8px] px-3 py-2 text-center">
            <p className="font-display font-bold text-lg text-agro-dark">{customer._count.creditSales}</p>
            <p className="font-body text-[10px] uppercase text-muted tracking-wide">Credits</p>
          </div>
          {canViewFinancials && (
            <div className="bg-green-50 rounded-[8px] px-3 py-2 text-center">
              <p className="font-display font-bold text-base text-green-700">{formatCurrency(totalOrderValue)}</p>
              <p className="font-body text-[10px] uppercase text-muted tracking-wide">Orders Value</p>
            </div>
          )}
          {canViewFinancials && (
            <div className={`rounded-[8px] px-3 py-2 text-center ${totalCreditOutstanding > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <p className={`font-display font-bold text-base ${totalCreditOutstanding > 0 ? "text-red-700" : "text-agro-dark"}`}>{formatCurrency(totalCreditOutstanding)}</p>
              <p className="font-body text-[10px] uppercase text-muted tracking-wide">Credit Owed</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted mt-0.5" />
            <div>
              <p className="font-body text-[10px] uppercase text-muted tracking-wide">Phone</p>
              <p className="font-body text-sm text-agro-dark">{customer.phone}</p>
            </div>
          </div>
          {customer.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted mt-0.5" />
              <div>
                <p className="font-body text-[10px] uppercase text-muted tracking-wide">Email</p>
                <p className="font-body text-sm text-agro-dark break-all">{customer.email}</p>
              </div>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <MapPin className="h-4 w-4 text-muted mt-0.5" />
              <div>
                <p className="font-body text-[10px] uppercase text-muted tracking-wide">Address</p>
                <p className="font-body text-sm text-agro-dark">{customer.address}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted mt-0.5" />
            <div>
              <p className="font-body text-[10px] uppercase text-muted tracking-wide">Joined</p>
              <p className="font-body text-sm text-agro-dark">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
            <StickyNote className="h-4 w-4 text-muted mt-0.5" />
            <div>
              <p className="font-body text-[10px] uppercase text-muted tracking-wide mb-1">Notes</p>
              <p className="font-body text-sm text-agro-dark whitespace-pre-wrap">{customer.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-5">
        <h2 className="font-display font-bold text-lg text-agro-dark mb-3">Recent Orders</h2>
        {customer.orders.length === 0 ? (
          <p className="font-body text-sm text-muted">No orders yet.</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {customer.orders.map((o) => (
                <div key={o.id} className="rounded-[8px] border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-body font-semibold text-sm text-agro-dark">{o.orderCode}</p>
                    <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${orderStatusClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-body text-xs text-muted">{formatDate(o.createdAt)}</p>
                    <p className="font-display font-semibold text-primary text-sm">{formatCurrency(o.total.toNumber())}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Order Code", "Date", "Status", "Payment", "Total"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2.5 font-body text-sm font-medium text-agro-dark">{o.orderCode}</td>
                      <td className="px-3 py-2.5 font-body text-sm text-muted">{formatDate(o.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${orderStatusClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-body text-xs text-muted">{o.paymentStatus}</td>
                      <td className="px-3 py-2.5 font-display font-semibold text-primary text-sm">{formatCurrency(o.total.toNumber())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Credit Sales */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-5">
        <h2 className="font-display font-bold text-lg text-agro-dark mb-3">Credit Sales</h2>
        {customer.creditSales.length === 0 ? (
          <p className="font-body text-sm text-muted">No credit sales yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-2">
              {customer.creditSales.map((cs) => {
                const total = cs.totalAmount.toNumber();
                const paid = cs.paidAmount.toNumber();
                return (
                  <div key={cs.id} className="rounded-[8px] border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-body text-xs text-muted">{formatDate(cs.createdAt)}</p>
                      <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${creditStatusClass(cs.status)}`}>
                        {cs.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="font-body text-xs text-muted">
                        Paid {formatCurrency(paid)} / {formatCurrency(total)}
                      </p>
                      <p className="font-display font-semibold text-sm text-agro-dark">
                        {formatCurrency(cs.status === "RETURNED" ? 0 : total - paid)} due
                      </p>
                    </div>
                    {cs.dueDate && (
                      <p className="font-body text-xs text-muted mt-1">Due {formatDate(cs.dueDate)}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Date", "Type", "Total", "Paid", "Balance", "Due", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customer.creditSales.map((cs) => {
                    const total = cs.totalAmount.toNumber();
                    const paid = cs.paidAmount.toNumber();
                    return (
                      <tr key={cs.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2.5 font-body text-sm text-muted">{formatDate(cs.createdAt)}</td>
                        <td className="px-3 py-2.5 font-body text-xs text-agro-dark">{cs.creditType}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-agro-dark">{formatCurrency(total)}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-agro-dark">{formatCurrency(paid)}</td>
                        <td className="px-3 py-2.5 font-display font-semibold text-sm text-agro-dark">{formatCurrency(cs.status === "RETURNED" ? 0 : total - paid)}</td>
                        <td className="px-3 py-2.5 font-body text-xs text-muted">{cs.dueDate ? formatDate(cs.dueDate) : cs.season ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${creditStatusClass(cs.status)}`}>
                            {cs.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Aggregator Offers */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-5">
        <h2 className="font-display font-bold text-lg text-agro-dark mb-3">Aggregator Offers</h2>
        {customer.aggregatorOffers.length === 0 ? (
          <p className="font-body text-sm text-muted">No aggregator offers yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-2">
              {customer.aggregatorOffers.map((o) => {
                const qty = (o.agreedQuantity ?? o.quantity).toNumber();
                const price = (o.agreedPrice ?? o.offeredPrice).toNumber();
                return (
                  <div key={o.id} className="rounded-[8px] border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-body font-semibold text-sm text-agro-dark">{o.productName}</p>
                      <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${offerStatusClass(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted mt-1">
                      {qty} {o.unit} @ {formatCurrency(price)}
                    </p>
                    <p className="font-body text-xs text-muted">{formatDate(o.createdAt)}</p>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Product", "Quantity", "Price", "Total Paid", "Date", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customer.aggregatorOffers.map((o) => {
                    const qty = (o.agreedQuantity ?? o.quantity).toNumber();
                    const price = (o.agreedPrice ?? o.offeredPrice).toNumber();
                    return (
                      <tr key={o.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2.5 font-body text-sm font-medium text-agro-dark">{o.productName}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-agro-dark">{qty} {o.unit}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-agro-dark">{formatCurrency(price)}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-agro-dark">{formatCurrency(o.totalPaid.toNumber())}</td>
                        <td className="px-3 py-2.5 font-body text-sm text-muted">{formatDate(o.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${offerStatusClass(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
