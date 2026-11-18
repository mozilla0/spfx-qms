import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { IQmsBaseWebPartProps, QmsBaseWebPart } from '../../common/QmsBaseWebPart';
import { ProcessDocuments } from './components/ProcessDocuments';
import * as strings from 'QmsStrings';

export interface IProcessDocumentsWebPartProps extends IQmsBaseWebPartProps {
  hideDiagrams: boolean;
  groupByType: boolean;
}

export default class ProcessDocumentsWebPart extends QmsBaseWebPart<IProcessDocumentsWebPartProps> {
  protected renderContent(): React.ReactElement {
    return (
      <ProcessDocuments
        service={this.service}
        pid={this.getQueryParam('pid')}
        title={this.properties.title}
        hideDiagrams={this.properties.hideDiagrams !== false}
        groupByType={this.properties.groupByType !== false}
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
        header: { description: strings.DocsPaneDescription },
        groups: [
          {
            groupName: strings.PropGroupDisplay,
            groupFields: [
              PropertyPaneTextField('title', { label: strings.PropTitle }),
              PropertyPaneToggle('groupByType', { label: strings.PropGroupByType, onText: strings.On, offText: strings.Off }),
              PropertyPaneToggle('hideDiagrams', { label: strings.PropHideDiagrams, onText: strings.On, offText: strings.Off })
            ]
          },
          { groupName: strings.PropGroupData, groupFields: [this.siteUrlField()] }
        ]
      }]
    };
  }
}
