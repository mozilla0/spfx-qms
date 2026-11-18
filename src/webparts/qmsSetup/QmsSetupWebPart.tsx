import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { QmsCategoryMode, QmsProvisioner } from '../../common/QmsProvisioner';
import { QmsSetup } from './components/QmsSetup';
import * as strings from 'QmsStrings';

export interface IQmsSetupWebPartProps extends IQmsBaseWebPartProps {
  categoryMode: QmsCategoryMode;
}

export default class QmsSetupWebPart extends QmsBaseWebPart<IQmsSetupWebPartProps> {
  private _provisioner: QmsProvisioner | undefined;

  protected renderContent(): React.ReactElement {
    if (!this._provisioner) {
      this._provisioner = new QmsProvisioner(this.context, this.service);
    }
    return (
      <QmsSetup
        service={this.service}
        provisioner={this._provisioner}
        title={this.properties.title}
        categoryMode={this.properties.categoryMode || 'taxonomy'}
      />
    );
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): void {
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
    if (propertyPath === 'siteUrl') {
      this._provisioner = new QmsProvisioner(this.context, this.service);
    }
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: strings.SetupPaneDescription },
        groups: [{
          groupName: strings.PropGroupData,
          groupFields: [PropertyPaneTextField('title', { label: strings.PropTitle }), this.siteUrlField()]
        }]
      }]
    };
  }
}
