import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme, ThemeChangedEventArgs, ThemeProvider } from '@microsoft/sp-component-base';
import { DisplayMode } from '@microsoft/sp-core-library';
import { IPropertyPaneField, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { QmsService } from './QmsService';
import styles from './ui/Qms.module.scss';
import * as strings from 'QmsStrings';

export interface IQmsBaseWebPartProps {
  /** Optional: absolute URL der QMS-Site, falls der Webpart auf einer anderen Site liegt. */
  siteUrl?: string;
  title?: string;
}

/** Gemeinsame Basis aller QMS-Webparts: React-Root, Theme-Tokens, Datenservice, Query-String. */
export abstract class QmsBaseWebPart<P extends IQmsBaseWebPartProps> extends BaseClientSideWebPart<P> {
  protected service!: QmsService;
  private _root: Root | undefined;
  private _themeProvider: ThemeProvider | undefined;

  protected abstract renderContent(): React.ReactElement;

  protected async onInit(): Promise<void> {
    await super.onInit();
    this.service = new QmsService(this.context, this.properties.siteUrl);
    this._themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
    this._applyTheme(this._themeProvider.tryGetTheme());
    this._themeProvider.themeChangedEvent.add(this, (args: ThemeChangedEventArgs) => {
      this._applyTheme(args.theme);
      this.render();
    });
  }

  public render(): void {
    if (!this._root) {
      this._root = createRoot(this.domElement);
    }
    this._root.render(<div className={styles.root}>{this.renderContent()}</div>);
  }

  protected get isEditMode(): boolean {
    return this.displayMode === DisplayMode.Edit;
  }

  /** Wert eines Query-String-Parameters (Gross-/Kleinschreibung egal). */
  protected getQueryParam(name: string): string | undefined {
    const params: URLSearchParams = new URLSearchParams(window.location.search);
    let value: string | undefined;
    params.forEach((v, k) => {
      if (k.toLowerCase() === name.toLowerCase() && !value) {
        value = v;
      }
    });
    return value;
  }

  protected siteUrlField(): IPropertyPaneField<unknown> {
    return PropertyPaneTextField('siteUrl', {
      label: strings.PropSiteUrl,
      description: strings.PropSiteUrlDescription,
      placeholder: this.context.pageContext.web.absoluteUrl
    });
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): void {
    if (propertyPath === 'siteUrl' && oldValue !== newValue) {
      this.service = new QmsService(this.context, this.properties.siteUrl);
    }
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
  }

  protected onDispose(): void {
    this._root?.unmount();
    this._root = undefined;
  }

  private _applyTheme(theme: IReadonlyTheme | undefined): void {
    if (!theme) {
      return;
    }
    const p = theme.palette || {};
    const s = theme.semanticColors || {};
    const set = (name: string, value?: string): void => {
      if (value) {
        this.domElement.style.setProperty(`--qms-theme-${name}`, value);
      }
    };
    set('primary', p.themePrimary);
    set('primary-strong', p.themeDarker || p.themeDark);
    set('primary-soft', p.themeLighter);
    set('primary-faint', p.themeLighterAlt);
    set('text', s.bodyText);
    set('muted', s.bodySubtext);
    if (theme.isInverted) {
      set('ink', s.bodyText);
      set('surface', s.bodyBackground);
      set('surface-alt', p.neutralLighter);
      set('border', p.neutralQuaternaryAlt || p.neutralLight);
    } else {
      set('surface', '#ffffff');
      set('surface-alt', '#f6f8fb');
      set('border', '#e3e8ef');
    }
  }
}
