import * as React from 'react';
import { QmsEmpty } from './components';
import * as strings from 'QmsStrings';

/** Einheitlicher Hinweis, wenn kein Prozess (?pid=) aufgelöst werden konnte. */
export const QmsNoProcess: React.FC<{ pid?: string; isEditMode: boolean; compact?: boolean }> = ({ pid, isEditMode, compact }) => {
  if (!pid) {
    return isEditMode
      ? <QmsEmpty icon="link" title={strings.NoPidTitle} text={strings.NoPidText} />
      : (compact ? null : <QmsEmpty icon="link" title={strings.NoPidTitle} />);
  }
  return <QmsEmpty icon="search" title={strings.ProcessNotFoundTitle} text={strings.ProcessNotFoundText.replace('{0}', pid)} />;
};
