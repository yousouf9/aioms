import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { InventoryTable } from "@/components/dashboard/inventory-table";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.inventory.view) redirect("/dashboard");

  const [products, categories, warehouses, shops] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        warehouseStocks: {
          include: { warehouse: { select: { name: true } } },
        },
        shopStocks: {
          include: { shop: { select: { name: true } } },
        },
      },
    }),
    db.productCategory.findMany({
      orderBy: { name: "asc" },
    }),
    db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    db.shop.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, warehouse: { select: { name: true } } },
    }),
  ]);

  const formattedProducts = products.map((p) => {
    const warehouseTotal = p.warehouseStocks.reduce(
      (sum, ws) => sum + ws.quantity,
      0
    );
    const shopTotal = p.shopStocks.reduce(
      (sum, ss) => sum + ss.quantity,
      0
    );
    const totalStock = warehouseTotal + shopTotal;

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      unit: p.unit,
      costPrice: p.costPrice.toNumber(),
      sellingPrice: p.sellingPrice.toNumber(),
      lowStockThreshold: p.lowStockThreshold,
      totalStock,
      warehouseStock: warehouseTotal,
      shopStock: shopTotal,
      isLowStock: totalStock <= p.lowStockThreshold,
      category: { name: p.category.name },
      locations: [
        ...p.warehouseStocks.map((ws) => ({
          name: ws.warehouse.name,
          type: "warehouse" as const,
          quantity: ws.quantity,
          id: ws.warehouseId,
        })),
        ...p.shopStocks.map((ss) => ({
          name: ss.shop.name,
          type: "shop" as const,
          quantity: ss.quantity,
          id: ss.shopId,
        })),
      ],
    };
  });

  return (
    <InventoryTable
      products={formattedProducts}
      categories={categories}
      warehouses={warehouses}
      shops={shops}
    />
  );
}
