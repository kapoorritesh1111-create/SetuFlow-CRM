"use client";

import { useMemo, useState, useTransition } from "react";

import RightDrawer from "@/components/RightDrawer";
import {
  buildCsvFromRecords,
  buildCsvTemplate,
  IMPORT_HEADERS,
  validateCsvImport,
  type ImportEntity,
} from "@/lib/import-export-templates";
import { importCsvRows } from "@/features/products/server/actions";
import { ProductPricingCalculatorPanel } from "@/features/products/components/product-pricing-calculator-panel";
import type {
  ProductCategoryViewModel,
  ProductViewModel,
} from "@/features/products/view-model";

type Props = {
  products: ProductViewModel[];
  categories: ProductCategoryViewModel[];
  canManageCatalog?: boolean;
};

const entityLabels: Record<ImportEntity, string> = {
  products: "Catalog / Products",
  categories: "Categories",
  leads: "Leads",
};

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildProductExportRows(products: ProductViewModel[]) {
  return products.map((product) => {
    const firstVariant = product.variants[0];
    const packParts = String(firstVariant?.packLabel ?? "").trim().split(/\s+/);
    const packSize = Number(packParts[0]);
    const packUnit = packParts.slice(1).join(" ");
    return {
      product_name: product.name,
      sku: product.skuCode ?? product.sku ?? "",
      category: product.rootCategoryName ?? product.categoryName ?? "",
      subcategory: product.categoryPath ?? "",
      description: product.description ?? "",
      unit_of_measure: firstVariant?.unitOfMeasure ?? "unit",
      pack_size: Number.isFinite(packSize) ? packSize : firstVariant?.unitsPerCase ?? "",
      pack_unit: packUnit || firstVariant?.unitOfMeasure || "unit",
      pricing_basis: firstVariant?.unitOfMeasure ?? "unit",
      currency: product.latestPriceCurrency ?? "USD",
      exw_price: "",
      fob_price: product.latestPrice ?? "",
      cif_price: "",
      ddp_price: "",
      distributor_price: "",
      retail_price: "",
      active_status: product.isActive ? "active" : "inactive",
    };
  });
}

function buildCategoryExportRows(categories: ProductCategoryViewModel[]) {
  return categories.map((category) => ({
    category_name: category.name,
    parent_category: category.parentId
      ? (categories.find((item) => item.id === category.parentId)?.name ?? "")
      : "",
    description: category.pathLabel,
    active_status: category.isActive ? "active" : "inactive",
  }));
}

export function CatalogImportExportWizard({
  products,
  categories,
  canManageCatalog = true,
}: Props) {
  const [drawer, setDrawer] = useState<"import" | "pricing" | null>(null);
  const [entity, setEntity] = useState<ImportEntity>("products");
  const [csvText, setCsvText] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );

  const selectedProduct = useMemo(
    () =>
      products.find((product) => product.id === selectedProductId) ??
      products[0] ??
      null,
    [products, selectedProductId],
  );
  const validation = useMemo(
    () => (csvText.trim() ? validateCsvImport(entity, csvText) : null),
    [csvText, entity],
  );
  const blockingImportIssues =
    validation?.issues.filter((issue) => issue.severity === "error") ?? [];
  const handleTemplateDownload = (targetEntity: ImportEntity = entity) =>
    downloadTextFile(
      `${targetEntity}-import-template.csv`,
      buildCsvTemplate(targetEntity),
    );
  const handleExport = (targetEntity: ImportEntity) => {
    if (targetEntity === "leads") {
      downloadTextFile("leads-import-template.csv", buildCsvTemplate("leads"));
      setMessage(
        "Lead export needs the leads workspace dataset; downloaded the lead import template instead.",
      );
      return;
    }
    const rows =
      targetEntity === "products"
        ? buildProductExportRows(products)
        : buildCategoryExportRows(categories);
    downloadTextFile(
      `${targetEntity}-export.csv`,
      buildCsvFromRecords(IMPORT_HEADERS[targetEntity], rows),
    );
    setMessage(`${entityLabels[targetEntity]} export downloaded.`);
  };
  const handleApplyImport = () => {
    if (!validation || blockingImportIssues.length) return;
    startTransition(async () => {
      if (entity === "categories" || entity === "products") {
        const response = await fetch("/api/catalog/import-csv", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entity, rows: validation.rows }),
        });
        const result = await response.json().catch(() => ({}));
        const fallback = entity === "products" ? "Products imported." : "Categories imported.";
        setMessage(
          result.error ??
            `${result.success ?? fallback} Inserted ${result.inserted ?? 0}, updated ${result.updated ?? 0}, skipped ${result.skipped ?? 0}. Refreshing catalog...`,
        );
        if (!response.ok || result.error) return;
        setCsvText("");
        setDrawer(null);
        window.location.reload();
        return;
      }

      const formData = new FormData();
      formData.set("entity", entity);
      formData.set("rows_json", JSON.stringify(validation.rows));
      const result = await importCsvRows(undefined, formData);
      setMessage(
        result.error ??
          `${result.success ?? "Import completed."} Inserted ${result.inserted ?? 0}, updated ${result.updated ?? 0}, skipped ${result.skipped ?? 0}.`,
      );
      if (!result.error) setDrawer(null);
    });
  };
  return (
    <>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Import / export + pricing engine
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Catalog upgrade command center
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Download CSV templates, validate imports before saving, and
              import products with starting prices and calculate EXW to Retail from any starting price.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDrawer("import")}
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canManageCatalog}
            >
              Import wizard
            </button>
            <button
              type="button"
              onClick={() => setDrawer("pricing")}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Pricing calculator
            </button>
            <button
              type="button"
              onClick={() => handleExport("products")}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Export products
            </button>
            <button
              type="button"
              onClick={() => handleExport("categories")}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Export categories
            </button>
            <button
              type="button"
              onClick={() => handleTemplateDownload("leads")}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Lead template
            </button>
          </div>
        </div>
        {message ? (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </section>

      <RightDrawer
        open={drawer === "import"}
        onClose={() => setDrawer(null)}
        title="CSV import/export wizard"
        widthClassName="sm:max-w-3xl lg:max-w-5xl"
      >
        <div className="space-y-4 p-1">
          <div className="grid gap-3 md:grid-cols-3">
            {(["products", "categories", "leads"] as ImportEntity[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setEntity(item);
                    setCsvText("");
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${entity === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  {entityLabels[item]}
                </button>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleTemplateDownload(entity)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Download template
            </button>
            <button
              type="button"
              onClick={() => setCsvText(buildCsvTemplate(entity))}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={() =>
                validation &&
                downloadTextFile(
                  `${entity}-import-errors.csv`,
                  buildCsvFromRecords(
                    ["row", "field", "severity", "message"],
                    validation.issues,
                  ),
                )
              }
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              disabled={!validation?.issues.length}
            >
              Download error report
            </button>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Paste CSV data or load a CSV file
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then(setCsvText);
            }}
            className="block w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="min-h-[220px] w-full rounded-2xl border border-slate-200 p-4 font-mono text-xs"
            placeholder="Paste CSV here..."
          />
          {validation ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                Preview: {validation.rows.length} row(s),{" "}
                {blockingImportIssues.length} blocking issue(s)
              </p>
              <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {validation.headers.slice(0, 8).map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 font-semibold text-slate-600"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        {validation.headers.slice(0, 8).map((header) => (
                          <td key={header} className="px-3 py-2 text-slate-700">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validation.issues.length ? (
                <ul className="mt-3 space-y-1 text-xs text-rose-700">
                  {validation.issues.slice(0, 8).map((issue, index) => (
                    <li key={index}>
                      Row {issue.row} - {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-emerald-700">
                  Validation passed. Ready to import.
                </p>
              )}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={
              !validation ||
              Boolean(blockingImportIssues.length) ||
              isPending ||
              !canManageCatalog
            }
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Importing..." : "Apply validated import"}
          </button>
        </div>
      </RightDrawer>

      <RightDrawer
        open={drawer === "pricing"}
        onClose={() => setDrawer(null)}
        title="Pricing calculator"
        widthClassName="sm:max-w-3xl lg:max-w-5xl"
      >
        <ProductPricingCalculatorPanel
          productId={selectedProduct?.id ?? null}
          productVariantId={selectedProduct?.variants[0]?.id ?? null}
          variantOptions={(selectedProduct?.variants ?? []).map((variant) => ({
            id: variant.id,
            name: variant.name,
            packLabel: variant.packLabel,
            unitsPerCase: variant.unitsPerCase,
            pricingModeDefault: variant.unitOfMeasure,
          }))}
          productName={selectedProduct?.name ?? null}
          canManageCatalog={canManageCatalog}
          onSaved={() => setDrawer(null)}
        />
      </RightDrawer>
    </>
  );
}
