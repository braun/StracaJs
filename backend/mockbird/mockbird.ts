// templator.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { JSDOM } from 'jsdom';


export namespace Mockbird {
  let ATTR_PREFIX = 'mockbird';

  export function setTemplatePrefix(prefix: string): void {
    ATTR_PREFIX = prefix;
  }

  function attr(name: string): string {
    return `[${ATTR_PREFIX}-${name}]`;
  }

  function getAttr(el: Element, name: string): string | null {
    return el.getAttribute(`${ATTR_PREFIX}-${name}`);
  }

  function removeAttr(el: Element, name: string): void {
    el.removeAttribute(`${ATTR_PREFIX}-${name}`);
  }

  export async function renderTemplate(
    filePath: string,
    data: Record<string, any>,
    options: { prefix?: string } = {}
  ): Promise<string> {
    if (options.prefix) setTemplatePrefix(options.prefix);

    const html = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    await processIncludes(doc, path.dirname(filePath), data);
    removeMocks(doc, data);
    processConditionals(doc, data);
    processEach(doc, data);
    bindAttributes(doc, data);
    bindClasses(doc.body, data);
    bindHTML(doc.body, data);
    bindData(doc.body, data);

    return dom.serialize();
  }

  async function processIncludes(doc: Document|HTMLElement, baseDir: string, data: any): Promise<void> {
    const includeElements = [...doc.querySelectorAll(attr('include'))];
    for (const el of includeElements) {
      const includePath = path.join(baseDir, getAttr(el, 'include') || '');
      const html = await fs.readFile(includePath, 'utf-8');
      const fragmentDom = new JSDOM(html);
      await renderSubTemplate(fragmentDom.window.document.body, data, baseDir);
      el.replaceWith(...fragmentDom.window.document.body.childNodes);
    }
  }

  function processConditionals(doc: Document|HTMLElement, data: any): void {
    const ifElements = [...doc.querySelectorAll(attr('if'))];
    for (const el of ifElements) {
      const condition = getAttr(el, 'if') || '';
      const result = resolvePath(data, condition);
      if (!result) {
        el.remove();
      } else {
        removeAttr(el, 'if');
      }
    }
  }

  function removeMocks(doc: Document|HTMLElement, data: any): void {
    const mockElements = [...doc.querySelectorAll(attr('mock'))];
    for (const el of mockElements) { 
        el.remove();
    }
  }

  function processEach(doc: Document|HTMLElement, data: any): void {
    const eachElements = [...doc.querySelectorAll(attr('each'))];
    for (const el of eachElements) {
      const expr = getAttr(el, 'each') || '';
      const [itemName, arrayPath] = expr.split(' in ');
      const items = resolvePath(data, arrayPath.trim()) || [];
      const templateHTML = el.innerHTML;
      el.innerHTML = '';

      for (const item of items) {
        const clone = el.cloneNode(false) as HTMLElement;
        removeAttr(clone, 'each');
        clone.innerHTML = templateHTML;
        const innerDom = new JSDOM(clone.outerHTML);
        bindData(innerDom.window.document.body, { [itemName.trim()]: item });
        bindAttributes(innerDom.window.document.body, { [itemName.trim()]: item });
        bindClasses(innerDom.window.document.body, { [itemName.trim()]: item });
        bindHTML(innerDom.window.document.body, { [itemName.trim()]: item });
        el.parentNode?.insertBefore(innerDom.window.document.body.firstChild as Element, el);
      }
      el.remove();
    }
  }

  async function renderSubTemplate(root: HTMLElement, data: any, baseDir: string): Promise<void> {
    await processIncludes(root, baseDir, data);
    processConditionals(root, data);
    processEach(root, data);
    bindAttributes(root, data);
    bindClasses(root, data);
    bindHTML(root, data);
    bindData(root, data);
  }

  function bindData(root: HTMLElement, data: any): void {
    for (const el of root.querySelectorAll(attr('bind'))){
      const expr = getAttr(el, 'bind') || '';
      const value = evaluateExpression(expr.trim(), data);
      el.textContent = value ?? '';
      removeAttr(el, 'bind');
    }
  }

  function bindHTML(root: HTMLElement, data: any): void {
    for (const el of root.querySelectorAll(attr('bind-html'))){
      const expr = getAttr(el, 'bind-html') || '';
      const value = evaluateExpression(expr.trim(), data);
      el.innerHTML = value ?? '';
      removeAttr(el, 'bind-html');
    }
  }

  function bindAttributes(root: HTMLElement|Document, data: any): void {
    for (const el of root.querySelectorAll(attr('bind-attr'))){
      const bindings = (getAttr(el, 'bind-attr') || '').split(',');
      for (const binding of bindings) {
        const [attrName, pathStr] = binding.split(':').map(s => s.trim());
        const value = resolvePath(data, pathStr);
        if (value != null) el.setAttribute(attrName, value);
      }
      removeAttr(el, 'bind-attr');
    }
  }

  function bindClasses(root: HTMLElement, data: any): void {
    for (const el of root.querySelectorAll(attr('class'))){
      const expr = getAttr(el, 'class') || '';
      const bindings = expr.split(';').map(s => s.trim()).filter(Boolean);
      for (const pair of bindings) {
        const [className, condition] = pair.split(':').map(s => s.trim());
        if (resolvePath(data, condition)) {
          el.classList.add(className);
        } else {
          el.classList.remove(className);
        }
      }
      removeAttr(el, 'class');
    }
  }

  function resolvePath(obj: any, pathStr: string): any {
    if(pathStr[0] == "!")
      return pathStr.substring(1);
    return pathStr.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  function evaluateExpression(expr: string, data: any): any {
    const [rawPath, ...filters] = expr.split('|').map(s => s.trim());
    let value = resolvePath(data, rawPath);
    for (const filter of filters) {
      if (filter === 'uppercase') value = String(value).toUpperCase();
      if (filter === 'lowercase') value = String(value).toLowerCase();
      if (filter === 'currency') value = `CZK ${Number(value).toFixed(2)}`;
    }
    return value;
  }
}