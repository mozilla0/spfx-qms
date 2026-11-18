import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { defaultProcessPageUrl } from '../../common/links';
import { ProcessMap } from './components/ProcessMap';
import * as strings from 'QmsStrings';

export interface IProcessMapWebPartProps extends IQmsBaseWebPartProps {
  processPageUrl?: string;
  showCustomerFrame: boolean;
  showSearch: boolean;
}

export default class ProcessMapWebPart extends QmsBaseWebPart<IProcessMapWebPartProps> {
  protected renderContent(): React.ReactElement {
    const group: string | undefined = this.getQueryParam('group');
    return (
      <ProcessMap
        service={this.service}
        title={this.properties.title}
        processPageUrl={this.properties.processPageUrl || defaultProcessPageUrl(this.service.webAbsoluteUrl)}
        showCustomerFrame={this.properties.showCustomerFrame !== false}
        showSearch={this.properties.showSearch !== false}
        initialGroupId={group && /^\d+$/.test(group) ? parseInt(group, 10) : undefined}
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
        header: { description: strings.MapPaneDescription },
        groups: [
          {
            groupName: strings.PropGroupDisplay,
            groupFields: [
              PropertyPaneTextField('title', { label: strings.PropTitle }),
              PropertyPaneToggle('showCustomerFrame', { label: strings.PropShowCustomerFrame, onText: strings.On, offText: strings.Off }),
              PropertyPaneToggle('showSearch', { label: strings.PropShowSearch, onText: strings.On, offText: strings.Off })
            ]
          },
          {
            groupName: strings.PropGroupData,
            groupFields: [
              this.siteUrlField(),
              PropertyPaneTextField('processPageUrl', {
                label: strings.PropProcessPageUrl,
                description: strings.PropProcessPageUrlDescription,
                placeholder: defaultProcessPageUrl(this.service.currentWebUrl)
              })
            ]
          }
        ]
      }]
    };
  }
}
