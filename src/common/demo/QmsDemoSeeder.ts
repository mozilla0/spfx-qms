import { IList } from '@pnp/sp/lists';
import { IFolder } from '@pnp/sp/folders';
import { QmsService } from '../QmsService';
import { IQmsCategory } from '../models';
import type { QmsLogger } from '../QmsProvisioner';
import { DEMO_GROUPS, DEMO_PROCESSES, DEMO_ROLES, DemoDocStatus } from './demoData';
import { buildBpmnSvg } from './bpmnBuilder';
import { buildDemoFile } from './demoDocuments';
import { DEMO_MANIFEST_NAME, IDemoManifest } from './demoManifest';

/**
 * Legt den Demodatensatz an bzw. entfernt ihn wieder.
 * Dieses Modul wird als eigener Chunk nur beim Klick in der Einrichtung geladen.
 * Alle angelegten Elemente werden in SiteAssets/qms-demodaten.json protokolliert,
 * damit das Entfernen ausschliesslich Demodaten trifft.
 */
export class QmsDemoSeeder {
  private readonly _svc: QmsService;

  public constructor(service: QmsService) {
    this._svc = service;
  }

  public async seed(log: QmsLogger): Promise<void> {
    const sp = this._svc.sp;
    const rolesList: IList = sp.web.getList(this._svc.listUrl('roles'));
    const groupsList: IList = sp.web.getList(this._svc.listUrl('groups'));
    const processList: IList = sp.web.getList(this._svc.listUrl('processes'));

    const existing: { Id: number }[] = await groupsList.items.select('Id').top(1)();
    if (existing.length > 0) {
      log('Prozessgruppen enthalten bereits Daten – Demodaten werden nicht angelegt.', 'warning');
      return;
    }

    QmsService.clearCache();
    const categories: IQmsCategory[] = await this._svc.getCategories();
    if (categories.length < 3) {
      throw new Error('Es sind keine drei Prozesskategorien vorhanden. Bitte zuerst die Einrichtung ausführen.');
    }
    const catValue = (index: number): string => {
      const c: IQmsCategory = categories[index];
      return c.key === c.label ? c.label : `${c.label}|${c.key};`;
    };
    const me: { Id: number } = await sp.web.currentUser.select('Id')();
    const manifest: IDemoManifest = { created: new Date().toISOString(), roles: [], groups: [], processes: [], files: [] };

    try {
      // Rollen
      const roleIds: Record<string, number> = {};
      for (const role of DEMO_ROLES) {
        const item: { Id: number } = await rolesList.items.add({
          Title: role.title,
          QmsRoleDescription: role.description,
          QmsRoleOwnersId: role.assignCurrentUser ? [me.Id] : []
        });
        roleIds[role.title] = item.Id;
        manifest.roles.push(item.Id);
      }
      log(`${DEMO_ROLES.length} Rollen angelegt.`, 'success');

      // Prozessgruppen (Kategorie über ValidateUpdate, damit auch Managed Metadata funktioniert)
      const groupIds: Record<string, number> = {};
      for (let i = 0; i < DEMO_GROUPS.length; i++) {
        const g = DEMO_GROUPS[i];
        const id: number = await addValidated(groupsList, this._svc.listUrl('groups'), {
          Title: g.title,
          QmsCategory: catValue(g.category),
          QmsGroupOrder: String(i + 1),
          QmsGroupRole: String(roleIds[g.role]),
          QmsGroupDescription: g.description
        });
        groupIds[g.title] = id;
        manifest.groups.push(id);
      }
      log(`${DEMO_GROUPS.length} Prozessgruppen angelegt.`, 'success');

      // Prozesse (übergeordnete Prozesse stehen in den Demodaten immer vor ihren Sub-Prozessen)
      const processIds: Record<string, number> = {};
      const orderIn: Record<string, number> = {};
      const now: Date = new Date();
      const monthsFromNow = (m: number): string => new Date(now.getFullYear(), now.getMonth() + m, 15, 12).toISOString();
      for (const p of DEMO_PROCESSES) {
        const orderKey: string = p.parent ? `sub:${p.parent}` : `grp:${p.group}`;
        orderIn[orderKey] = (orderIn[orderKey] || 0) + 1;
        const item: { Id: number } = await processList.items.add({
          Title: p.title,
          QmsProcessKey: p.key,
          QmsDescription: p.description,
          QmsProcessGroupId: groupIds[p.group],
          QmsParentProcessId: p.parent ? processIds[p.parent] : null,
          QmsRoleId: roleIds[p.role],
          QmsProcessOwnerId: p.ownerIsCurrentUser ? me.Id : null,
          QmsProcessOrder: orderIn[orderKey],
          QmsStatus: p.status,
          QmsVersion: p.version,
          QmsValidFrom: monthsFromNow(-8),
          QmsNextReview: monthsFromNow(p.reviewInMonths),
          QmsInput: p.input || null,
          QmsOutput: p.output || null,
          QmsKpi: p.kpi || null,
          QmsNormReference: p.norm || null
        });
        processIds[p.title] = item.Id;
        manifest.processes.push(item.Id);
      }
      log(`${DEMO_PROCESSES.length} Prozesse angelegt (davon ${DEMO_PROCESSES.filter(p => p.parent).length} Sub-Prozesse).`, 'success');

      // Diagramme und Dokumente
      const libUrl: string = this._svc.listUrl('documents');
      let diagrams: number = 0;
      let documents: number = 0;
      for (const p of DEMO_PROCESSES) {
        const meta: Record<string, unknown> = { QmsDocProcessId: processIds[p.title], QmsDocRoleId: roleIds[p.role] };
        if (p.diagram) {
          const name: string = `${p.title.replace(/[\\/:*?"<>|#%]/g, '').replace(/\s+/g, '-')}.svg`;
          manifest.files.push(await this._upload(libUrl, name, buildBpmnSvg(p.diagram), { ...meta, QmsDocType: 'Diagramm' }, 'approved'));
          diagrams++;
        }
        for (const doc of p.documents || []) {
          const file = buildDemoFile(p, doc);
          manifest.files.push(await this._upload(libUrl, file.fileName, file.content, { ...meta, QmsDocType: doc.type }, doc.status));
          documents++;
        }
      }
      log(`${diagrams} BPMN-Diagramme und ${documents} Dokumente hochgeladen (freigegeben, ausstehend und Entwurf gemischt).`, 'success');
    } finally {
      // Auch bei einem Abbruch protokollieren, damit Teilbestände entfernt werden können.
      await this._writeManifest(manifest);
      QmsService.clearCache();
    }
  }

  public async remove(log: QmsLogger): Promise<void> {
    const sp = this._svc.sp;
    const folder: IFolder = await this._assetsFolder();
    let manifest: IDemoManifest;
    try {
      manifest = await folder.files.getByUrl(DEMO_MANIFEST_NAME).getJSON();
    } catch {
      log('Keine Protokolldatei der Demodaten gefunden – es wird nichts entfernt.', 'warning');
      return;
    }

    let removed: number = 0;
    let missing: number = 0;
    const recycle = async (action: () => Promise<unknown>): Promise<void> => {
      try {
        await action();
        removed++;
      } catch {
        missing++; // bereits gelöscht oder nicht mehr vorhanden
      }
    };

    for (const url of manifest.files) {
      await recycle(() => sp.web.getFileByServerRelativePath(url).recycle());
    }
    log(`${manifest.files.length} Dokumente verarbeitet.`);
    const processList: IList = sp.web.getList(this._svc.listUrl('processes'));
    for (const id of manifest.processes.slice().reverse()) {
      await recycle(() => processList.items.getById(id).recycle());
    }
    log(`${manifest.processes.length} Prozesse verarbeitet.`);
    const groupsList: IList = sp.web.getList(this._svc.listUrl('groups'));
    for (const id of manifest.groups) {
      await recycle(() => groupsList.items.getById(id).recycle());
    }
    const rolesList: IList = sp.web.getList(this._svc.listUrl('roles'));
    for (const id of manifest.roles) {
      await recycle(() => rolesList.items.getById(id).recycle());
    }
    await folder.files.getByUrl(DEMO_MANIFEST_NAME).recycle();
    QmsService.clearCache();
    log(`Demodaten entfernt: ${removed} Elemente in den Papierkorb verschoben` +
      (missing > 0 ? `, ${missing} waren bereits gelöscht.` : '.'), 'success');
  }

  // ---------------------------------------------------------------------------

  private async _assetsFolder(): Promise<IFolder> {
    const list: IList = await this._svc.sp.web.lists.ensureSiteAssetsLibrary();
    return list.rootFolder;
  }

  private async _writeManifest(manifest: IDemoManifest): Promise<void> {
    const folder: IFolder = await this._assetsFolder();
    await folder.files.addUsingPath(DEMO_MANIFEST_NAME, JSON.stringify(manifest, undefined, 2), { Overwrite: true });
  }

  private async _upload(
    libUrl: string,
    name: string,
    content: string | ArrayBuffer,
    metadata: Record<string, unknown>,
    status: DemoDocStatus
  ): Promise<string> {
    const sp = this._svc.sp;
    const info = await sp.web.getFolderByServerRelativePath(libUrl).files.addUsingPath(name, content, { Overwrite: true });
    const file = sp.web.getFileByServerRelativePath(info.ServerRelativeUrl);
    const item = await file.getItem();
    await item.update(metadata);
    if (status !== 'draft') {
      await file.publish('Demodaten');
      if (status === 'approved') {
        await file.approve('Demodaten');
      }
    }
    return info.ServerRelativeUrl;
  }
}

async function addValidated(list: IList, listUrl: string, values: Record<string, string>): Promise<number> {
  const formValues = Object.keys(values).map(k => ({ FieldName: k, FieldValue: values[k] }));
  const result = await list.addValidateUpdateItemUsingPath(formValues, listUrl);
  const failed = result.filter(r => r.HasException);
  if (failed.length > 0) {
    throw new Error(`${failed[0].FieldName}: ${failed[0].ErrorMessage}`);
  }
  const idField = result.filter(r => r.FieldName === 'Id')[0];
  return idField && idField.FieldValue ? parseInt(idField.FieldValue, 10) : 0;
}
