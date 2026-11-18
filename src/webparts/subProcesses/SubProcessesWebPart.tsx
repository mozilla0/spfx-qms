import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { SubProcesses } from './components/SubProcesses';
import * as strings from 'QmsStrings';

export interface ISubProcessesWebPartProps extends IQmsBaseWebPartProps {
  processPageUrl?: string;
}

export default class SubProcessesWebPart extends QmsBaseWebPart<ISubProcessesWebPartProps> {
  protected renderContent(): React.ReactElement {
    return (
      <SubProcesses
        service={this.service}
        pid={this.getQueryParam('pid')}
        title={this.properties.title}
        processPageUrl={this.properties.processPageUrl || window.location.href.split('?')[0]}
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
        header: { description: strings.SubPaneDescription },
        groups: [
          { groupName: strings.PropGroupDisplay, groupFields: [PropertyPaneTextField('title', { label: strings.PropTitle })] },
          {
            groupName: strings.PropGroupData,
            groupFields: [
              this.siteUrlField(),
              PropertyPaneTextField('processPageUrl', { label: strings.PropProcessPageUrl, description: strings.PropProcessPageUrlCurrent })
            ]
          }
        ]
      }]
    };
  }
}
