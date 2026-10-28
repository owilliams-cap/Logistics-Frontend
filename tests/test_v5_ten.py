from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import os
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
server=ThreadingHTTPServer(('127.0.0.1',19051), SimpleHTTPRequestHandler)
Thread(target=server.serve_forever,daemon=True).start()
THEMES=[('original','hq-masthead'),('midnight','command-hero'),('forest','fieldbook-top'),('arctic','studio-intro'),('warehouse','warehouse-heading'),('dispatch','dispatch-lanes'),('atlas','atlas-constellation'),('terminal','terminal-intro'),('director','director-report'),('supplychain','supply-flow')]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':900})
  page.set_default_timeout(7000)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  css='\n'.join((ROOT/n).read_text() for n in ['styles.css','themes.css','design-systems.css','concepts-v4.css','concepts-v5.css'])
  page.goto('about:blank')
  page.set_content('<html><head><style>'+css+'</style></head><body><div id="app"></div></body></html>')
  page.add_script_tag(content=(ROOT/'config.js').read_text())
  page.add_script_tag(content=(ROOT/'sheets-adapter.js').read_text())
  page.add_script_tag(content=(ROOT/'app.js').read_text())
  page.wait_for_selector('.login-card')
  assert page.locator('[data-theme-choice]').count()==10, page.locator('[data-theme-choice]').count()
  for theme,identifier in THEMES:
   page.locator('[data-theme-choice="'+theme+'"]').first.click()
   page.locator('[data-action=demo-login]').first.click()
   page.locator('.'+identifier).first.wait_for(timeout=5000)
   if width==1440:
    page.screenshot(path=str(ROOT/'assets'/f'v5-{theme}.png'),full_page=True)
   navSelector='.sidebar'
   if width>900 and theme=='director': navSelector='.director-pane'
   if width>900 and theme=='supplychain': navSelector='.supply-tabs'
   if width>850 and theme=='dispatch':navSelector='.dispatch-dock'
   if width>850 and theme=='atlas':navSelector='.atlas-rail'
   if width<=900:
    page.locator('[data-action=menu]').first.click()
    page.locator('.sidebar.open').first.wait_for()
   page.locator(navSelector+' [data-nav=inventory]').first.click()
   if theme in ('director','supplychain'):
    assert page.locator('.director-directory' if theme=='director' else '.supply-stack-row').count()>0
   else:
    assert page.locator('.concept-stock').count()>0 or page.locator('.data-table tbody tr').count()>0,theme
   if width<=900:page.locator('[data-action=menu]').first.click()
   page.locator(navSelector+' [data-nav=checkouts]').first.click()
   assert page.get_by_text('Permanent issue',exact=False).count()>0,theme
   # Simulate at least one issue operation for v5; permanent stock and non-returnability.
   if theme=='director' and width==1440:
    page.locator('[data-action=checkout]').first.click()
    page.locator('[name=itemId]').select_option('EQ-014')
    assert page.locator('[name=issueType]').input_value()=='permanent'
    assert not page.locator('[name=dueAt]').is_enabled()
    page.locator('[name=member]').fill('Sample')
    page.locator('[name=quantity]').fill('1')
    page.locator('#drawer-form').evaluate('(f)=>f.requestSubmit()')
    page.wait_for_selector('.toast:not(.error)')
    # UI updates not connected to Google in demo
    page.locator('[data-filter-value=Permanent]').click()
    assert page.get_by_text('Sample',exact=False).count()>0
   if width<=900:page.locator('[data-action=menu]').first.click()
   page.locator(navSelector+' [data-nav=incoming]').first.click()
   assert page.locator('.supply-order-columns' if theme=='supplychain' else '.director-directory' if theme=='director' else '.concept-orders .concept-stock' if theme in ('warehouse','dispatch','atlas','terminal') else '.data-table tbody tr').count()>=1,theme
   if width<=900:page.locator('[data-action=menu]').first.click()
   page.locator(navSelector+' [data-nav=settings]').first.click()
   assert page.locator('.theme-option').count()==10
   if width<=900:
    page.locator('[data-action=menu]').first.click()
    page.locator('.sidebar [data-action=logout]').click()
   else:
    page.locator('.topbar [data-action=logout]').first.click()
   page.locator('.login-card').first.wait_for(timeout=4000)
   print('PASS',width,theme,flush=True)
  assert not errors,errors
  page.close()
 browser.close()
server.shutdown()
print('PASS ten concepts at desktop and mobile, plus issue form')