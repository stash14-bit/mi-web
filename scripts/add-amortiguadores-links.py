"""Agrega Amortiguadores tras Sistema de Frenos en menús y footers. Idempotente."""
from pathlib import Path
import re
changed = []
for path in sorted(Path('.').rglob('*.html')):
    if any(p in path.parts for p in ('node_modules', '.vercel', '.git')):
        continue
    original = path.read_bytes()
    text = original.decode('utf-8')
    newline = '\r\n' if '\r\n' in text else '\n'
    def update(match):
        block = match[0]
        if '/cambio-amortiguadores-guayaquil' in block:
            return block
        return re.sub(r'(<li><a href="/sistema-de-frenos-guayaquil">Sistema de Frenos</a></li>)',
                      r'\1' + newline + '        <li><a href="/cambio-amortiguadores-guayaquil">Amortiguadores</a></li>', block, count=1)
    text = re.sub(r'<ul>.*?</ul>|<ul class="nav-dropdown">.*?</ul>|<div class="f-col"><h3>Servicios</h3><ul>.*?</ul>', update, text, flags=re.S)
    if text.encode('utf-8') != original:
        path.write_bytes(text.encode('utf-8'))
        changed.append(str(path))
print(f'Archivos HTML modificados: {len(changed)}')
for path in changed:
    print(path)
