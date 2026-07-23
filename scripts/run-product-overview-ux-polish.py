from pathlib import Path
import runpy

component = Path('src/components/marketing/product-overview-experience.tsx')
text = component.read_text()

if 'const chapters = [' in text:
    print('Product Overview UX polish already present.')
else:
    runpy.run_path('scripts/apply-product-overview-ux-polish.py', run_name='__main__')
