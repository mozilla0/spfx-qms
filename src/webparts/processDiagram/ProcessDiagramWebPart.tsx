import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneSlider, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { ProcessDiagram } from './components/ProcessDiagram';
import * as strings from 'QmsStrings';

export interface IProcessDiagramWebPartProps extends IQmsBaseWebPartProps {
  linkProcesses: boolean;
  maxHeight: number;
}

export default class ProcessDiagramWebPart extends QmsBaseWebPart<IProcessDiagramWebPartProps> {
  protected renderContent(): React.ReactElement {
    return (
      <ProcessDiagram
        service={this.service}
        pid={this.getQueryParam('pid')}
        title={this.properties.title}
        processPageUrl={window.location.href.split('?')[0]}
        linkProcesses={this.properties.linkProcesses !== false}
        maxHeight={this.properties.maxHeight || 640}
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
        header: { description: strings.DiagramPaneDescription },
        groups: [
          {
            groupName: strings.PropGroupDisplay,
            groupFields: [
              PropertyPaneTextField('title', { label: strings.PropTitle }),
              PropertyPaneSlider('maxHeight', { label: strings.PropMaxHeight, min: 300, max: 1400, step: 20, value: this.properties.maxHeight || 640 }),
              PropertyPaneToggle('linkProcesses', { label: strings.PropLinkProcesses, onText: strings.On, offText: strings.Off })
            ]
          },
          { groupName: strings.PropGroupData, groupFields: [this.siteUrlField()] }
        ]
      }]
    };
  }
}
