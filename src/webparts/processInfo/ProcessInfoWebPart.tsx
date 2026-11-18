import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { defaultMapPageUrl } from '../../common/links';
import { ProcessInfo } from './components/ProcessInfo';
import * as strings from 'QmsStrings';

export interface IProcessInfoWebPartProps extends IQmsBaseWebPartProps {
  mapPageUrl?: string;
  showRoleOwners: boolean;
}

export default class ProcessInfoWebPart extends QmsBaseWebPart<IProcessInfoWebPartProps> {
  protected renderContent(): React.ReactElement {
    return (
      <ProcessInfo
        service={this.service}
        pid={this.getQueryParam('pid')}
        mapPageUrl={this.properties.mapPageUrl || defaultMapPageUrl(this.service.webAbsoluteUrl)}
        processPageUrl={window.location.href.split('?')[0]}
        showRoleOwners={this.properties.showRoleOwners !== false}
        isEditMode={this.isEditMode}
      />
    );
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: strings.InfoPaneDescription },
        groups: [{
          groupName: strings.PropGroupData,
          groupFields: [
            this.siteUrlField(),
            PropertyPaneTextField('mapPageUrl', {
              label: strings.PropMapPageUrl,
              placeholder: defaultMapPageUrl(this.context.pageContext.web.absoluteUrl)
            }),
            PropertyPaneToggle('showRoleOwners', { label: strings.PropShowRoleOwners, onText: strings.On, offText: strings.Off })
          ]
        }]
      }]
    };
  }
}

