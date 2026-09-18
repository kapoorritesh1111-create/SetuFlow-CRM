from pathlib import Path

component = Path("src/components/marketing/product-overview-experience.tsx")

if not component.exists():
    raise SystemExit("Product Overview component is missing.")

text = component.read_text()

if "const chapters = [" not in text:
    raise SystemExit(
        "Product Overview UX polish is not committed. "
        "Run the explicit Product Overview polish workflow/script and commit the result before deployment."
    )

print("Product Overview UX polish is committed and ready.")
