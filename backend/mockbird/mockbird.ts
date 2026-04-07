// templator.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { DataSource, Repository } from 'typeorm';

export namespace Mockbird {
  let ATTR_PREFIX = 'mockbird';
  let dataSource: DataSource | null = null;
  let entityMap: Record<string, any> = {};

  export function setTemplatePrefix(prefix: string): void {
    ATTR_PREFIX = prefix;
  }

  export function setDataSource(ds: DataSource): void {
    dataSource = ds;
  }

  export function registerEntity(name: string, entity: any): void {
    entityMap[name] = entity;
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

  // Načte definiční soubor dotazů ze šablony
  async function loadQueryDefinitions(templateDir: string): Promise<Record<string, QueryDefinition>> {
    const queryFilePath = path.join(templateDir, 'queries.js');
    try {
      await fs.access(queryFilePath);
      // Vyčistí cache pro hot-reload
      delete require.cache[require.resolve(queryFilePath)];
      return require(queryFilePath);
    } catch {
      return {};
    }
  }

  interface QueryDefinition {
    entity: string;
    where?: any;
    parameters?: Record<string, any>;
    order?: Record<string, 'ASC' | 'DESC'>;
    take?: number;
    skip?: number;
    relations?: string[];
  }

  // Nahradí placeholdery {{param}} v dotazu
  function interpolateQuery(query: QueryDefinition, params: Record<string, any>): QueryDefinition {
    const interpolateValue = (value: any): any => {
      if (typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');
      }
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map(interpolateValue);
        }
        const result: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = interpolateValue(v);
        }
        return result;
      }
      return value;
    };

    return {
      ...query,
      where: interpolateValue(query.where),
      parameters: interpolateValue(query.parameters)
    };
  }

  // Provede dotaz proti TypeORM
  async function executeQuery(queryDef: QueryDefinition): Promise<any[]> {
    if (!dataSource) {
      console.warn('Mockbird: DataSource not configured');
      return [];
    }

    const entityClass = entityMap[queryDef.entity];
    if (!entityClass) {
      console.warn(`Mockbird: Entity "${queryDef.entity}" not registered`);
      return [];
    }

    const repo = dataSource.getRepository(entityClass);

    // Pokud where je string, použijeme QueryBuilder
    if (typeof queryDef.where === 'string') {
      let qb = repo.createQueryBuilder('entity')
        .where(queryDef.where, queryDef.parameters || {});

      if (queryDef.order) {
        for (const [field, direction] of Object.entries(queryDef.order)) {
          qb = qb.addOrderBy(`entity.${field}`, direction);
        }
      }
      if (queryDef.take) qb = qb.take(queryDef.take);
      if (queryDef.skip) qb = qb.skip(queryDef.skip);
      if (queryDef.relations) {
        for (const rel of queryDef.relations) {
          qb = qb.leftJoinAndSelect(`entity.${rel}`, rel);
        }
      }

      return await qb.getMany();
    }

    // Jinak použijeme find s objektem
    return await repo.find({
      where: queryDef.where,
      order: queryDef.order,
      take: queryDef.take,
      skip: queryDef.skip,
      relations: queryDef.relations
    });
  }

  // Zpracuje mockbird-query elementy
  async function processQueries(
    doc: Document | HTMLElement, 
    templateDir: string, 
    data: Record<string, any>
  ): Promise<void> {
    const queryDefinitions = await loadQueryDefinitions(templateDir);
    const queryElements = [...doc.querySelectorAll(attr('query'))];

    for (const el of queryElements) {
      const queryExpr = getAttr(el, 'query') || '';
      // Formát: "articles = latestArticles" nebo "articles = taggedArticles(tag: 'news')"
      const match = queryExpr.match(/^(\w+)\s*=\s*(\w+)(?:\((.+)\))?$/);
      
      if (!match) {
        console.warn(`Mockbird: Invalid query expression "${queryExpr}"`);
        continue;
      }

      const [, varName, queryName, paramsStr] = match;
      const queryDef = queryDefinitions[queryName];

      if (!queryDef) {
        console.warn(`Mockbird: Query "${queryName}" not found in queries.js`);
        continue;
      }

      // Parsování parametrů z výrazu
      const queryParams: Record<string, any> = { ...data };
      if (paramsStr) {
        const paramPairs = paramsStr.split(',').map(s => s.trim());
        for (const pair of paramPairs) {
          const [key, value] = pair.split(':').map(s => s.trim());
          // Odstranění uvozovek z hodnoty
          queryParams[key] = value.replace(/^['"]|['"]$/g, '');
        }
      }

      // Interpolace a provedení dotazu
      const interpolatedQuery = interpolateQuery(queryDef, queryParams);
      const results = await executeQuery(interpolatedQuery);

      // Uložení výsledků do dat pro další zpracování
      data[varName] = results;

      removeAttr(el, 'query');
    }
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
    const templateDir = path.dirname(filePath);

    await processIncludes(doc, templateDir, data);
    removeMocks(doc, data);
    await processQueries(doc, templateDir, data); // Nové - zpracování dotazů
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